#!/usr/bin/env bun
import { resolve } from 'node:path'

// Publish per-arch packages first so the main `hillz` package's
// `optionalDependencies` resolve when it goes up. `hillz` is published last.
const PUBLISH_ORDER = [
  'hillz-linux-x64',
  'hillz-linux-arm64',
  'hillz-darwin-x64',
  'hillz-darwin-arm64',
  'hillz-windows-x64',
  'hillz',
] as const

const VERSION_RE = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/

const version = process.argv[2]
if (typeof version !== 'string' || !VERSION_RE.test(version)) {
  process.stderr.write(`release-publish: invalid version '${version ?? ''}'\n`)
  process.exit(1)
}

const ROOT = resolve(import.meta.dir, '..')

const publishPackage = async (pkgDir: string): Promise<void> => {
  const cwd = `${ROOT}/packages/${pkgDir}`
  process.stdout.write(`\n▶ npm publish ${pkgDir}@${version}\n`)
  const proc = Bun.spawn(['npm', 'publish', '--access', 'public', '--provenance'], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  if (code !== 0) {
    process.stderr.write(`release-publish: npm publish failed for ${pkgDir} (exit ${code})\n`)
    process.exit(code)
  }
}

for (const pkg of PUBLISH_ORDER) {
  await publishPackage(pkg)
}

process.stdout.write(`\n✓ published all ${PUBLISH_ORDER.length} packages at ${version}\n`)
