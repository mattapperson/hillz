import { stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadSkill } from '@hillz/core'
import type { CAC } from 'cac'
import pc from 'picocolors'
import { z } from 'zod'
import { loadContext } from '../loader'

interface SuggestOptions {
  apply?: boolean
  force?: boolean
  model?: string
}

const SuggestedScorerRefSchema = z.union([
  z.string(),
  z.object({ name: z.string(), opts: z.record(z.string(), z.unknown()) }),
])

const SuggestedTaskSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be lowercase kebab-case'),
  input: z.string().min(1),
  displayName: z.string().optional(),
  expect: z
    .object({
      contains: z.array(z.string()).optional(),
      toolCalls: z.array(z.string()).optional(),
    })
    .optional(),
  scorers: z.array(SuggestedScorerRefSchema).optional(),
})

const SuggestedEvalSchema = z.object({
  name: z.string(),
  model: z.string(),
  flowVersion: z.string().default('1'),
  passThreshold: z.number().min(0).max(1).default(0.6),
  scorers: z.array(SuggestedScorerRefSchema),
  tasks: z.array(SuggestedTaskSchema).min(1),
})

type SuggestedEval = z.infer<typeof SuggestedEvalSchema>

const RUBRIC = `You are a senior evaluation engineer. Given a Claude Code SKILL.md (and optionally a user prompt that scopes the desired evaluation), propose a TypeScript eval for it.

Output strict JSON matching this schema:
{
  "name": string,
  "model": "openai/gpt-5-nano",
  "flowVersion": "1",
  "passThreshold": 0.6,
  "scorers": ["content-similarity", ...],       // eval-level scorers
  "tasks": [
    {
      "id": string,                              // lowercase kebab-case, short
      "input": string,                           // exact prompt to send to the agent under test
      "displayName"?: string,
      "expect"?: {
        "contains"?: string[],                   // substrings the output MUST include
        "toolCalls"?: string[]                   // tools the agent MUST call (omit if not relevant)
      },
      "scorers"?: ScorerRef[]                    // optional task-level scorers; see allowlist below
    }
  ]
}

ScorerRef is either a string from { "content-similarity", "completeness", "tone-consistency" }
or { "name": <factoryName>, "opts": <opts> } where factoryName is one of:
- "keyword-coverage"      opts: { "keywords": string[] }
- "tool-call-accuracy"    opts: { "expected": string[] }
- "trajectory-accuracy"   opts: { "expectedSequence": string[], "mode"?: "exact"|"in_order"|"any_order" }
- "max-tool-calls"        opts: { "max": number }
- "required-tools"        opts: { "required": string[] }
- "forbidden-tools"       opts: { "forbidden": string[] }
- "action-sequence"       opts: { "sequence": string[], "mode"?: "exact"|"in_order"|"any_order" }

Rules:
- If a user prompt is provided, let it drive task selection and validators. Otherwise pick 3-5 tasks that broadly exercise the skill.
- Infer validators (expect.contains, expect.toolCalls, task-level scorers) from the prompt and skill body. Only include those you can confidently justify. Omit empty arrays.
- Use 'content-similarity' as a default eval-level scorer when nothing more specific applies.
- Output strict JSON. No commentary, no markdown.`

const renderEvalModule = (
  skill: string,
  e: SuggestedEval,
): string => `import { defineEval } from '@hillz/core'
import { react } from '@hillz/agent'

export default defineEval({
  name: ${JSON.stringify(e.name)},
  skill: ${JSON.stringify(skill)},
  flowVersion: ${JSON.stringify(e.flowVersion)},
  passThreshold: ${e.passThreshold},
  flow: ({ skill }) =>
    react({
      model: ${JSON.stringify(e.model)},
      instructions: skill.body,
      tools: [],
    }),
  scorers: ${JSON.stringify(e.scorers)},
  tasks: ${JSON.stringify(e.tasks, null, 2)},
})
`

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const buildJudgeInput = (
  skill: { name: string; description: string; body: string },
  prompt: string | undefined,
): string => {
  const head = `Skill name: ${skill.name}\nDescription: ${skill.description}\n\nSKILL.md:\n${skill.body}`
  if (prompt === undefined || prompt.length === 0) return head
  return `${head}\n\nUser prompt (use to scope tasks and validators):\n${prompt}`
}

export const registerSuggestCommand = (cli: CAC): void => {
  cli
    .command(
      'suggest <skillFile> [prompt]',
      'Use an LLM to draft an eval for a SKILL.md (optionally scoped by a prompt)',
    )
    .option('--apply', 'Write the eval file to disk')
    .option('--force', 'Overwrite an existing eval file')
    .option('--model <id>', 'Judge model override')
    .action(async (skillFile: string, prompt: string | undefined, opts: SuggestOptions) => {
      const ctx = await loadContext(process.cwd())
      const skill = await loadSkill(skillFile)
      const proposal = await ctx.judge.evaluate({
        model: opts.model,
        rubric: RUBRIC,
        input: buildJudgeInput(skill, prompt),
        schema: SuggestedEvalSchema,
      })
      const out = renderEvalModule(skill.name, proposal)

      if (opts.apply !== true) {
        process.stdout.write(out)
        return
      }

      const target = join(ctx.root, 'evals', `${skill.name}.eval.ts`)
      if (opts.force !== true && (await exists(target))) {
        process.stderr.write(
          `${pc.red('error')} ${target} already exists; use --force to overwrite\n`,
        )
        process.exitCode = 1
        return
      }
      await writeFile(target, out, 'utf8')
      process.stdout.write(`${pc.green('✓')} wrote ${target}\n`)
    })
}
