import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, sep } from 'node:path'
import matter from 'gray-matter'
import { glob } from 'tinyglobby'
import { readString } from './guards'
import type {
  Skill,
  SkillFile,
  SkillFileGroup,
  SkillFileKind,
  SkillLoadWarning,
  SkillSiblings,
} from './types'

const SIBLING_GROUPS: readonly SkillFileGroup[] = ['references', 'scripts', 'assets']

const SCRIPT_EXTS = new Set(['.sh', '.bash', '.zsh', '.py', '.js', '.mjs', '.cjs', '.ts', '.rb'])
const MARKDOWN_EXTS = new Set(['.md', '.markdown', '.mdx', '.txt'])
const DATA_EXTS = new Set(['.json', '.yaml', '.yml', '.toml', '.csv', '.tsv', '.xml'])

const MAX_TEXT_BYTES = 256 * 1024
const BINARY_SNIFF_BYTES = 8 * 1024

const classifyFile = (group: SkillFileGroup, ext: string): SkillFileKind => {
  if (group === 'scripts') return 'script'
  if (group === 'references') return MARKDOWN_EXTS.has(ext) ? 'markdown' : 'data'
  if (DATA_EXTS.has(ext)) return 'data'
  if (MARKDOWN_EXTS.has(ext)) return 'markdown'
  return 'asset'
}

const looksBinary = (buf: Buffer): boolean => {
  const limit = Math.min(buf.length, BINARY_SNIFF_BYTES)
  for (let i = 0; i < limit; i++) {
    if (buf[i] === 0) return true
  }
  return false
}

const readSkillFile = async (
  absolutePath: string,
  skillDir: string,
  group: SkillFileGroup,
): Promise<{ file?: SkillFile; warning?: SkillLoadWarning }> => {
  const rel = relative(skillDir, absolutePath).split(sep).join('/')
  let info: Awaited<ReturnType<typeof stat>>
  try {
    info = await stat(absolutePath)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { warning: { path: rel, reason: 'unreadable', detail } }
  }
  if (!info.isFile()) return {}
  if (info.size > MAX_TEXT_BYTES) {
    return { warning: { path: rel, reason: 'oversize', detail: `${info.size} bytes` } }
  }
  let buf: Buffer
  try {
    buf = await readFile(absolutePath)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { warning: { path: rel, reason: 'unreadable', detail } }
  }
  if (looksBinary(buf)) {
    return { warning: { path: rel, reason: 'binary' } }
  }
  const ext = extname(rel).toLowerCase()
  const kind = classifyFile(group, ext)
  if (group === 'scripts' && !SCRIPT_EXTS.has(ext) && ext !== '') {
    // Treat unknown-extension files under scripts/ as data — still text-mutable.
  }
  return {
    file: {
      path: rel,
      absolutePath,
      content: buf.toString('utf8'),
      kind,
      group,
    },
  }
}

const loadSiblingGroup = async (
  skillDir: string,
  group: SkillFileGroup,
): Promise<{ files: SkillFile[]; warnings: SkillLoadWarning[] }> => {
  const groupDir = join(skillDir, group)
  let exists = false
  try {
    const info = await stat(groupDir)
    exists = info.isDirectory()
  } catch {
    exists = false
  }
  if (!exists) return { files: [], warnings: [] }

  const matches = await glob(['**/*'], { cwd: groupDir, absolute: true, dot: false })
  const results = await Promise.all(matches.map((m) => readSkillFile(m, skillDir, group)))
  const files: SkillFile[] = []
  const warnings: SkillLoadWarning[] = []
  for (const r of results) {
    if (r.file !== undefined) files.push(r.file)
    if (r.warning !== undefined) warnings.push(r.warning)
  }
  files.sort((a, b) => a.path.localeCompare(b.path))
  warnings.sort((a, b) => a.path.localeCompare(b.path))
  return { files, warnings }
}

const loadSiblings = async (
  skillDir: string,
): Promise<{ siblings: SkillSiblings; warnings: SkillLoadWarning[] }> => {
  const [refs, scripts, assets] = await Promise.all(
    SIBLING_GROUPS.map((g) => loadSiblingGroup(skillDir, g)),
  )
  return {
    siblings: {
      references: refs?.files ?? [],
      scripts: scripts?.files ?? [],
      assets: assets?.files ?? [],
    },
    warnings: [
      ...(refs?.warnings ?? []),
      ...(scripts?.warnings ?? []),
      ...(assets?.warnings ?? []),
    ],
  }
}

export const loadSkill = async (path: string): Promise<Skill> => {
  const raw = await readFile(path, 'utf8')
  const parsed = matter(raw)

  const name = readString(parsed.data, 'name')
  const description = readString(parsed.data, 'description')
  const version = readString(parsed.data, 'version')

  if (!name) {
    throw new Error(`SKILL.md at ${path} is missing required frontmatter field 'name'`)
  }
  if (!description) {
    throw new Error(`SKILL.md at ${path} is missing required frontmatter field 'description'`)
  }

  const skillDir = dirname(path)
  const { siblings, warnings } = await loadSiblings(skillDir)
  const hasSiblings =
    siblings.references.length + siblings.scripts.length + siblings.assets.length > 0

  return {
    name,
    description,
    version,
    body: parsed.content.trim(),
    filePath: path,
    siblings: hasSiblings ? siblings : undefined,
    loadWarnings: warnings.length > 0 ? warnings : undefined,
  }
}
