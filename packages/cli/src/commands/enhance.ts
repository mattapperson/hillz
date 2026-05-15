import { rename, writeFile } from 'node:fs/promises'
import type { Eval, Skill, SkillFile, SkillFileGroup } from '@hillz/core'
import type { ComponentKey, GepaEvent, GepaResult, SkillCandidate } from '@hillz/optimizer'
import { componentLabel, runGepa } from '@hillz/optimizer'
import type { CAC } from 'cac'
import matter from 'gray-matter'
import pc from 'picocolors'
import { type LoadedContext, loadContext } from '../loader'
import { matchesGlob } from '../utils'

interface EnhanceOptions {
  maxMetricCalls?: number
  minibatch?: number
  components?: string
  full?: boolean
  model?: string
  write?: boolean
  json?: boolean
  seed?: number
}

export type ComponentToken = 'body' | 'desc' | 'refs' | 'scripts' | 'assets'

const ALL_TOKENS: ComponentToken[] = ['body', 'desc', 'refs', 'scripts', 'assets']

export const parseComponentTokens = (
  raw: string | undefined,
  full: boolean,
): { tokens: ComponentToken[]; error?: string } => {
  if (full && raw !== undefined) {
    return { tokens: [], error: '--full and --components are mutually exclusive' }
  }
  if (full) return { tokens: [...ALL_TOKENS] }
  if (raw === undefined || raw === 'both') return { tokens: ['body', 'desc'] }
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const out: ComponentToken[] = []
  for (const part of parts) {
    if (part === 'body') out.push('body')
    else if (part === 'desc' || part === 'description') out.push('desc')
    else if (part === 'refs' || part === 'references') out.push('refs')
    else if (part === 'scripts') out.push('scripts')
    else if (part === 'assets') out.push('assets')
    else if (part === 'both') {
      out.push('body', 'desc')
    } else if (part === 'full') {
      for (const t of ALL_TOKENS) out.push(t)
    } else {
      return {
        tokens: [],
        error: `unknown --components token '${part}'. Valid: body, desc, refs, scripts, assets, both, full`,
      }
    }
  }
  const seen = new Set<ComponentToken>()
  const unique: ComponentToken[] = []
  for (const t of out) {
    if (!seen.has(t)) {
      seen.add(t)
      unique.push(t)
    }
  }
  return { tokens: unique }
}

const filesForGroup = (skill: Skill, group: SkillFileGroup): SkillFile[] => {
  const s = skill.siblings
  if (s === undefined) return []
  return s[group]
}

const expandComponents = (skill: Skill, tokens: ComponentToken[]): ComponentKey[] => {
  const out: ComponentKey[] = []
  for (const token of tokens) {
    if (token === 'body') out.push({ kind: 'body' })
    else if (token === 'desc') out.push({ kind: 'description' })
    else if (token === 'refs') {
      for (const f of filesForGroup(skill, 'references')) {
        out.push({ kind: 'file', path: f.path, fileKind: f.kind })
      }
    } else if (token === 'scripts') {
      for (const f of filesForGroup(skill, 'scripts')) {
        out.push({ kind: 'file', path: f.path, fileKind: f.kind })
      }
    } else if (token === 'assets') {
      for (const f of filesForGroup(skill, 'assets')) {
        out.push({ kind: 'file', path: f.path, fileKind: f.kind })
      }
    }
  }
  return out
}

const formatComponentDelta = (label: string, before: string, after: string): string => {
  if (before === after) return `  ${label}: unchanged`
  const beforeLines = before.split('\n').length
  const afterLines = after.split('\n').length
  const beforeChars = before.length
  const afterChars = after.length
  const deltaChars = afterChars - beforeChars
  const sign = deltaChars >= 0 ? '+' : ''
  return `  ${label}: ${beforeLines}L/${beforeChars}c -> ${afterLines}L/${afterChars}c (${sign}${deltaChars} chars)`
}

const renderComponentDiff = (label: string, before: string, after: string): string => {
  if (before === after) return `${pc.dim(`# ${label}: unchanged`)}\n`
  return [
    pc.bold(`# ${label} (before)`),
    pc.red(before),
    '',
    pc.bold(`# ${label} (after)`),
    pc.green(after),
    '',
  ].join('\n')
}

const findEvalForSkill = (ctx: LoadedContext, skillName: string): Eval | undefined =>
  ctx.evals.find((e) => e.skill === skillName)

const writeAtomic = async (path: string, content: string): Promise<void> => {
  const tmp = `${path}.tmp`
  await writeFile(tmp, content, 'utf8')
  await rename(tmp, path)
}

const writeSkillFileIfChanged = async (
  skill: Skill,
  body: string,
  description: string,
): Promise<boolean> => {
  if (body === skill.body && description === skill.description) return false
  const original = await Bun.file(skill.filePath).text()
  const parsed = matter(original)
  const data: Record<string, unknown> = { ...parsed.data, description }
  const next = matter.stringify(`${body}\n`, data)
  await writeAtomic(skill.filePath, next)
  return true
}

const collectAllFiles = (skill: Skill): SkillFile[] => {
  const s = skill.siblings
  if (s === undefined) return []
  return [...s.references, ...s.scripts, ...s.assets]
}

const writeSiblingFiles = async (
  skill: Skill,
  files: Record<string, string>,
): Promise<string[]> => {
  const written: string[] = []
  for (const file of collectAllFiles(skill)) {
    const next = files[file.path]
    if (next === undefined || next === file.content) continue
    await writeAtomic(file.absolutePath, next)
    written.push(file.path)
  }
  return written
}

interface WriteOutcome {
  appliedSkillMd: boolean
  appliedFiles: string[]
}

const writeSkillCandidate = async (
  skill: Skill,
  candidate: SkillCandidate,
): Promise<WriteOutcome> => {
  const appliedSkillMd = await writeSkillFileIfChanged(skill, candidate.body, candidate.description)
  const appliedFiles = await writeSiblingFiles(skill, candidate.files)
  return { appliedSkillMd, appliedFiles }
}

interface SummarizeArgs {
  skillName: string
  skill: Skill
  result: GepaResult
  outcome: WriteOutcome | null
  writeRequested: boolean
  filePath: string
}

const renderFileDeltas = (skill: Skill, result: GepaResult): string[] => {
  const lines: string[] = []
  for (const file of collectAllFiles(skill)) {
    const before = result.baseline.files[file.path] ?? file.content
    const after = result.best.files[file.path] ?? before
    if (before === after) continue
    lines.push(formatComponentDelta(file.path.padEnd(11), before, after))
  }
  return lines
}

const summarize = (args: SummarizeArgs): string => {
  const { skillName, skill, result, outcome, writeRequested, filePath } = args
  const passBaseline = result.baselineScore.passCount
  const passBest = result.bestScore.passCount
  const taskCount = Object.keys(result.baselineScore.perTask).length
  let footer: string
  if (outcome !== null) {
    const parts: string[] = []
    if (outcome.appliedSkillMd) parts.push(filePath)
    parts.push(...outcome.appliedFiles)
    footer =
      parts.length === 0
        ? pc.dim('  --write requested but no changes to apply')
        : pc.green(`  ✓ wrote ${parts.join(', ')}`)
  } else if (writeRequested) {
    footer = pc.dim('  --write requested but no improvement; files unchanged')
  } else {
    footer = pc.dim('  [dry-run] re-run with --write to apply')
  }
  const fileLines = renderFileDeltas(skill, result)
  return [
    pc.bold(skillName),
    `  baseline mean: ${result.baselineScore.mean.toFixed(3)}  (passed ${passBaseline}/${taskCount})`,
    `  best     mean: ${result.bestScore.mean.toFixed(3)}  (passed ${passBest}/${taskCount})`,
    `  iterations: ${result.iterations}  accepted: ${result.acceptances}  metricCalls: ${result.metricCalls}  cost: $${result.totalCost.toFixed(4)}`,
    formatComponentDelta('body       ', result.baseline.body, result.best.body),
    formatComponentDelta('description', result.baseline.description, result.best.description),
    ...fileLines,
    footer,
  ].join('\n')
}

const onEvent = (e: GepaEvent): void => {
  switch (e.kind) {
    case 'iteration-start':
      process.stderr.write(
        pc.dim(
          `  iter ${e.iter}  component=${componentLabel(e.component)}  minibatch=[${e.minibatchIds.join(',')}]\n`,
        ),
      )
      return
    case 'accepted':
      process.stderr.write(
        pc.green(
          `  ✓ accept iter=${e.iter} component=${componentLabel(e.component)} parent=${e.parentScalar.toFixed(3)} child=${e.childScalar.toFixed(3)} fullMean=${e.fullScore.mean.toFixed(3)}\n`,
        ),
      )
      return
    case 'rejected':
      process.stderr.write(
        pc.yellow(
          `  ✗ reject iter=${e.iter} component=${componentLabel(e.component)} parent=${e.parentScalar.toFixed(3)} child=${e.childScalar.toFixed(3)}\n`,
        ),
      )
      return
    case 'reflection-failed':
      process.stderr.write(pc.yellow(`  ! reflection failed iter=${e.iter}: ${e.reason}\n`))
      return
    case 'stagnation-stop':
      process.stderr.write(pc.dim(`  stagnated at iter=${e.iter}\n`))
      return
    case 'budget-stop':
      process.stderr.write(
        pc.dim(`  budget exhausted at iter=${e.iter} (${e.metricCalls} calls)\n`),
      )
      return
    case 'baseline':
    case 'done':
      return
  }
}

const reportLoadWarnings = (skill: Skill): void => {
  const warnings = skill.loadWarnings
  if (warnings === undefined || warnings.length === 0) return
  for (const w of warnings) {
    process.stderr.write(pc.yellow(`  ! skipped ${w.path} (${w.reason})\n`))
  }
}

export const registerEnhanceCommand = (cli: CAC): void => {
  cli
    .command('enhance [pattern]', 'GEPA-optimize a skill body and/or description against its eval')
    .option(
      '--max-metric-calls <n>',
      'Budget cap on per-task eval invocations (baseline + minibatch + full eval all count)',
      { default: 30 },
    )
    .option('--minibatch <n>', 'Minibatch size per iteration', { default: 4 })
    .option(
      '--components <which>',
      'Comma-separated subset to mutate: body, desc, refs, scripts, assets, both, full',
      { default: undefined },
    )
    .option('--full', 'Mutate body, description, references, scripts, and assets (shorthand)')
    .option('--model <id>', 'Reflection LLM model (forwarded to judge)')
    .option('--write', 'Apply best candidate atomically (otherwise dry-run)')
    .option('--json', 'Emit machine-readable JSON summary on stdout')
    .option('--seed <n>', 'Seed for deterministic minibatch sampling')
    .action(async (pattern: string | undefined, opts: EnhanceOptions) => {
      const ctx = await loadContext(process.cwd())
      const skills = pattern
        ? [...ctx.skills.values()].filter((s) => matchesGlob(s.name, pattern))
        : [...ctx.skills.values()]
      if (skills.length === 0) {
        process.stderr.write(`${pc.red('error')} no skills matched\n`)
        process.exitCode = 1
        return
      }

      const parsed = parseComponentTokens(opts.components, opts.full === true)
      if (parsed.error !== undefined) {
        process.stderr.write(`${pc.red('error')} ${parsed.error}\n`)
        process.exitCode = 1
        return
      }
      const tokens = parsed.tokens

      const summaries: Array<{
        skill: string
        result: GepaResult
        outcome: WriteOutcome | null
      }> = []

      for (const skill of skills) {
        const evalDef = findEvalForSkill(ctx, skill.name)
        if (!evalDef) {
          process.stderr.write(
            `${pc.yellow('warn')} skill '${skill.name}' has no eval; run \`hillz suggest\` to draft one\n`,
          )
          continue
        }
        if (evalDef.tasks.length === 0) {
          process.stderr.write(
            `${pc.yellow('warn')} skill '${skill.name}' eval has zero tasks; skipping\n`,
          )
          continue
        }

        reportLoadWarnings(skill)
        const components = expandComponents(skill, tokens)
        if (components.length === 0) {
          process.stderr.write(
            `${pc.red('error')} components [${tokens.join(',')}] expand to nothing for skill '${skill.name}' (no matching files)\n`,
          )
          process.exitCode = 1
          continue
        }

        if (!opts.json) {
          process.stderr.write(
            pc.bold(
              `enhancing ${skill.name} (${evalDef.tasks.length} tasks, ${components.length} components)\n`,
            ),
          )
        }

        const result = await runGepa({
          skill,
          evalDef,
          agent: ctx.agent,
          judge: ctx.judge,
          scorers: ctx.scorers,
          scorerFactories: ctx.scorerFactories,
          resultsDir: ctx.resultsDir,
          cache: ctx.cache,
          workspaceFactory: ctx.workspaceFactory,
          config: {
            maxMetricCalls: Number(opts.maxMetricCalls),
            minibatchSize: Number(opts.minibatch),
            components,
            reflectionModel: opts.model,
            seed: opts.seed === undefined ? undefined : Number(opts.seed),
            onEvent: opts.json ? undefined : onEvent,
          },
        })

        let outcome: WriteOutcome | null = null
        const improved = result.bestScore.mean > result.baselineScore.mean
        if (opts.write === true && improved) {
          outcome = await writeSkillCandidate(skill, result.best)
        }
        summaries.push({ skill: skill.name, result, outcome })

        if (!opts.json) {
          process.stdout.write(
            `\n${summarize({
              skillName: skill.name,
              skill,
              result,
              outcome,
              writeRequested: opts.write === true,
              filePath: skill.filePath,
            })}\n`,
          )
          if (outcome === null) {
            process.stdout.write('\n')
            process.stdout.write(
              renderComponentDiff('body', result.baseline.body, result.best.body),
            )
            process.stdout.write(
              renderComponentDiff(
                'description',
                result.baseline.description,
                result.best.description,
              ),
            )
            for (const file of collectAllFiles(skill)) {
              const before = result.baseline.files[file.path] ?? file.content
              const after = result.best.files[file.path] ?? before
              process.stdout.write(renderComponentDiff(file.path, before, after))
            }
          }
        }
      }

      if (opts.json) {
        process.stdout.write(`${JSON.stringify(summaries, null, 2)}\n`)
      }
    })
}
