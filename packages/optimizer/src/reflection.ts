import { extname } from 'node:path'
import type { Judge, SkillFileKind } from '@hillz/core'
import { z } from 'zod'
import type { ComponentKey, ReflectionEntry } from './types'

const ReflectionSchema = z.object({
  reasoning: z.string(),
  newValue: z.string().min(1),
})

const bodyGuidance = (current: string): string =>
  [
    'You are improving the BODY of a Claude Code SKILL.md.',
    'The body is the markdown instructions the agent reads to perform the skill.',
    'Constraints:',
    '- Output the FULL replacement body (do not output a diff).',
    '- Keep it valid markdown.',
    '- Do not invent tools, filesystem paths, or APIs not present in the original.',
    '- Preserve correct behavior on tasks that already scored well; revise only what failed.',
    '',
    'Current body:',
    '<<<',
    current,
    '>>>',
  ].join('\n')

const descriptionGuidance = (current: string): string =>
  [
    'You are improving the DESCRIPTION (frontmatter) of a Claude Code SKILL.md.',
    'The description is one or two sentences; it primarily determines whether the agent SELECTS this skill.',
    'Constraints:',
    '- Output ONLY the new description string (no markdown, no quotes around it).',
    '- One or two sentences. Plain text.',
    '- Describe WHEN to use this skill (the trigger conditions) and what outcome to expect.',
    '',
    'Current description:',
    '<<<',
    current,
    '>>>',
  ].join('\n')

const fileLabel = (kind: SkillFileKind): string => {
  if (kind === 'markdown') return 'reference document'
  if (kind === 'data') return 'data file'
  if (kind === 'script') return 'executable script'
  return 'asset file'
}

const fileGuidance = (path: string, fileKind: SkillFileKind, current: string): string => {
  const ext = extname(path).toLowerCase() || '(no extension)'
  if (fileKind === 'script') {
    return [
      `You are improving an executable script bundled with a Claude Code skill at \`${path}\`.`,
      `File extension: ${ext}. Keep the language syntax valid and DO NOT change the shebang or the script's CLI interface (arguments, expected stdout/stderr, exit codes).`,
      'Constraints:',
      '- Output the FULL replacement file contents (no diff, no surrounding markdown fences).',
      '- Preserve the existing command interface; agents call this script the same way.',
      '- Improve robustness, error messages, and edge-case handling.',
      '- Do not invent external commands or dependencies not already present.',
      '',
      'Current contents:',
      '<<<',
      current,
      '>>>',
    ].join('\n')
  }
  return [
    `You are improving a ${fileLabel(fileKind)} bundled with a Claude Code skill at \`${path}\`.`,
    'The agent loads this file on demand — it should remain self-contained and focused.',
    'Constraints:',
    '- Output the FULL replacement file contents (no diff, no surrounding markdown fences).',
    `- Keep the file extension (${ext}) and any structural conventions intact.`,
    fileKind === 'data'
      ? '- Preserve the existing schema/keys exactly; only refine values when justified by the runs below.'
      : '- Tighten clarity, examples, and edge cases. Preserve all factually correct content.',
    '- Do not invent tools, filesystem paths, or APIs not present in the original.',
    '',
    'Current contents:',
    '<<<',
    current,
    '>>>',
  ].join('\n')
}

const componentGuidance = (component: ComponentKey, current: string): string => {
  if (component.kind === 'body') return bodyGuidance(current)
  if (component.kind === 'description') return descriptionGuidance(current)
  return fileGuidance(component.path, component.fileKind, current)
}

const componentNoun = (component: ComponentKey): string => {
  if (component.kind === 'file') return `contents of ${component.path}`
  return component.kind
}

const renderRuns = (entries: ReflectionEntry[]): string =>
  entries
    .map(
      (e, idx) =>
        `--- run ${idx + 1} | task=${e.taskId} | mean=${e.score.toFixed(3)}\nINPUT:\n${e.input}\n\nOUTPUT:\n${e.output}\n\nSCORES:\n${e.scoreLines}`,
    )
    .join('\n\n')

export const buildReflectionRubric = (
  component: ComponentKey,
  current: string,
  entries: ReflectionEntry[],
): string =>
  [
    componentGuidance(component, current),
    '',
    'Here are recent evaluation runs of the current value. Lower scores mean revise that case; higher scores show what to preserve.',
    '',
    '<runs>',
    renderRuns(entries),
    '</runs>',
    '',
    `Output JSON only, matching: { "reasoning": "<1-3 sentences>", "newValue": "<the full new ${componentNoun(component)}>" }.`,
  ].join('\n')

export interface ProposeArgs {
  judge: Judge
  model?: string
  component: ComponentKey
  current: string
  entries: ReflectionEntry[]
}

export interface ProposeResult {
  value: string | null
  reason: string
}

export const proposeNewComponent = async (args: ProposeArgs): Promise<ProposeResult> => {
  if (args.entries.length === 0) {
    return { value: null, reason: 'no minibatch entries to reflect on' }
  }
  const rubric = buildReflectionRubric(args.component, args.current, args.entries)
  try {
    const result = await args.judge.evaluate({
      model: args.model,
      rubric,
      input: `Propose the new ${componentNoun(args.component)}. Output JSON only.`,
      schema: ReflectionSchema,
    })
    const trimmed = result.newValue.trim()
    if (trimmed.length === 0) return { value: null, reason: 'judge returned empty newValue' }
    if (trimmed === args.current.trim()) {
      return { value: null, reason: 'judge returned unchanged value' }
    }
    return { value: trimmed, reason: result.reasoning }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { value: null, reason: `judge error: ${msg}` }
  }
}
