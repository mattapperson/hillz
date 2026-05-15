import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadSkill } from './skill-loader'

const SKILL_FRONTMATTER = `---
name: test-skill
description: A test skill used in unit tests for the loader.
---

This is the body.
`

describe('loadSkill', () => {
  let root: string
  let skillDir: string
  let skillFile: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'hillz-skill-loader-'))
    skillDir = join(root, 'test-skill')
    await mkdir(skillDir, { recursive: true })
    skillFile = join(skillDir, 'SKILL.md')
    await writeFile(skillFile, SKILL_FRONTMATTER, 'utf8')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  test('omits siblings when no sibling dirs exist', async () => {
    const skill = await loadSkill(skillFile)
    expect(skill.name).toBe('test-skill')
    expect(skill.siblings).toBeUndefined()
    expect(skill.loadWarnings).toBeUndefined()
  })

  test('loads references and classifies markdown vs data', async () => {
    await mkdir(join(skillDir, 'references'), { recursive: true })
    await writeFile(
      join(skillDir, 'references', 'REFERENCE.md'),
      '# Reference\n\nSome reference content.',
      'utf8',
    )
    await writeFile(join(skillDir, 'references', 'rules.json'), '{"x":1}\n', 'utf8')

    const skill = await loadSkill(skillFile)
    expect(skill.siblings?.references.length).toBe(2)
    const ref = skill.siblings?.references.find((f) => f.path.endsWith('REFERENCE.md'))
    const data = skill.siblings?.references.find((f) => f.path.endsWith('rules.json'))
    expect(ref?.kind).toBe('markdown')
    expect(ref?.group).toBe('references')
    expect(ref?.content).toContain('Some reference content.')
    expect(data?.kind).toBe('data')
  })

  test('loads scripts and tags them as script kind', async () => {
    await mkdir(join(skillDir, 'scripts'), { recursive: true })
    await writeFile(join(skillDir, 'scripts', 'check.sh'), '#!/bin/sh\necho "ok"\n', 'utf8')

    const skill = await loadSkill(skillFile)
    expect(skill.siblings?.scripts.length).toBe(1)
    const script = skill.siblings?.scripts[0]
    expect(script?.kind).toBe('script')
    expect(script?.group).toBe('scripts')
    expect(script?.path).toBe('scripts/check.sh')
  })

  test('loads assets and classifies markdown/data/asset', async () => {
    await mkdir(join(skillDir, 'assets'), { recursive: true })
    await writeFile(join(skillDir, 'assets', 'template.md'), '# Template', 'utf8')
    await writeFile(join(skillDir, 'assets', 'schema.json'), '{"a":1}', 'utf8')
    await writeFile(join(skillDir, 'assets', 'note.txt'), 'plain', 'utf8')

    const skill = await loadSkill(skillFile)
    const byPath = new Map(skill.siblings?.assets.map((f) => [f.path, f]) ?? [])
    expect(byPath.get('assets/template.md')?.kind).toBe('markdown')
    expect(byPath.get('assets/schema.json')?.kind).toBe('data')
    expect(byPath.get('assets/note.txt')?.kind).toBe('markdown')
  })

  test('skips binary files and surfaces a warning', async () => {
    await mkdir(join(skillDir, 'assets'), { recursive: true })
    const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00])
    await writeFile(join(skillDir, 'assets', 'logo.png'), binary)

    const skill = await loadSkill(skillFile)
    expect(skill.siblings?.assets.length ?? 0).toBe(0)
    expect(skill.loadWarnings?.length).toBe(1)
    expect(skill.loadWarnings?.[0]?.reason).toBe('binary')
    expect(skill.loadWarnings?.[0]?.path).toBe('assets/logo.png')
  })

  test('returns sorted sibling lists', async () => {
    await mkdir(join(skillDir, 'references'), { recursive: true })
    await writeFile(join(skillDir, 'references', 'b.md'), 'b', 'utf8')
    await writeFile(join(skillDir, 'references', 'a.md'), 'a', 'utf8')
    await writeFile(join(skillDir, 'references', 'c.md'), 'c', 'utf8')

    const skill = await loadSkill(skillFile)
    const paths = skill.siblings?.references.map((f) => f.path) ?? []
    expect(paths).toEqual(['references/a.md', 'references/b.md', 'references/c.md'])
  })

  test('walks nested directories under references/', async () => {
    await mkdir(join(skillDir, 'references', 'inner'), { recursive: true })
    await writeFile(join(skillDir, 'references', 'inner', 'deep.md'), 'deep', 'utf8')

    const skill = await loadSkill(skillFile)
    expect(skill.siblings?.references[0]?.path).toBe('references/inner/deep.md')
  })
})
