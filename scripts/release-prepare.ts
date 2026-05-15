#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PACKAGES = [
  'cli',
  'hillz',
  'hillz-linux-x64',
  'hillz-linux-arm64',
  'hillz-darwin-x64',
  'hillz-darwin-arm64',
  'hillz-windows-x64',
] as const

const PLATFORM_PINS = [
  'hillz-linux-x64',
  'hillz-linux-arm64',
  'hillz-darwin-x64',
  'hillz-darwin-arm64',
  'hillz-windows-x64',
] as const

const VERSION_RE = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/

const version = process.argv[2]
if (typeof version !== 'string' || !VERSION_RE.test(version)) {
  process.stderr.write(`release-prepare: invalid version '${version ?? ''}'\n`)
  process.exit(1)
}

const ROOT = resolve(import.meta.dir, '..')

const isStringRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const bumpPackage = (pkgDir: string): void => {
  const pkgPath = join(ROOT, 'packages', pkgDir, 'package.json')
  const raw = readFileSync(pkgPath, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (!isStringRecord(parsed)) {
    throw new Error(`package.json at ${pkgPath} is not an object`)
  }
  parsed.version = version

  if (pkgDir === 'hillz') {
    const optDeps = parsed.optionalDependencies
    if (isStringRecord(optDeps)) {
      for (const pin of PLATFORM_PINS) {
        if (pin in optDeps) optDeps[pin] = version
      }
    }
  }

  writeFileSync(pkgPath, `${JSON.stringify(parsed, null, 2)}\n`)
  process.stdout.write(`  ✓ bumped packages/${pkgDir} → ${version}\n`)
}

process.stdout.write(`\n▶ bumping ${PACKAGES.length} packages to ${version}\n`)
for (const pkg of PACKAGES) bumpPackage(pkg)

process.stdout.write('\n▶ building platform binaries\n')
const proc = Bun.spawn(['bun', 'scripts/build-binaries.ts'], {
  cwd: ROOT,
  stdout: 'inherit',
  stderr: 'inherit',
})
const code = await proc.exited
if (code !== 0) {
  process.stderr.write(`release-prepare: build-binaries.ts exited ${code}\n`)
  process.exit(code)
}
