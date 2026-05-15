#!/usr/bin/env bun
import { chmod, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

interface Target {
  pkg: string
  bunTarget: string
  binName: string
}

const TARGETS: Target[] = [
  { pkg: 'hillz-linux-x64', bunTarget: 'bun-linux-x64', binName: 'hillz' },
  { pkg: 'hillz-linux-arm64', bunTarget: 'bun-linux-arm64', binName: 'hillz' },
  { pkg: 'hillz-darwin-x64', bunTarget: 'bun-darwin-x64', binName: 'hillz' },
  { pkg: 'hillz-darwin-arm64', bunTarget: 'bun-darwin-arm64', binName: 'hillz' },
  { pkg: 'hillz-windows-x64', bunTarget: 'bun-windows-x64', binName: 'hillz.exe' },
]

const ROOT = resolve(import.meta.dir, '..')
const ENTRY = join(ROOT, 'packages/cli/src/index.ts')

const buildOne = async (target: Target): Promise<void> => {
  const outFile = join(ROOT, 'packages', target.pkg, 'bin', target.binName)
  await mkdir(dirname(outFile), { recursive: true })
  await rm(outFile, { force: true })

  process.stdout.write(`▶ ${target.bunTarget}  →  packages/${target.pkg}/bin/${target.binName}\n`)
  const proc = Bun.spawn(
    [
      'bun',
      'build',
      '--compile',
      `--target=${target.bunTarget}`,
      '--minify',
      ENTRY,
      `--outfile=${outFile}`,
    ],
    { stdout: 'pipe', stderr: 'pipe', cwd: ROOT },
  )
  const code = await proc.exited
  if (code !== 0) {
    const stderr = await new Response(proc.stderr).text()
    process.stderr.write(stderr)
    throw new Error(`bun build failed for ${target.bunTarget} (exit ${code})`)
  }
  if (!target.binName.endsWith('.exe')) {
    await chmod(outFile, 0o755)
  }
  const { size } = await Bun.file(outFile).stat()
  process.stdout.write(`  ✓ ${(size / 1024 / 1024).toFixed(1)} MB\n`)
}

const requested = process.argv.slice(2)
const selected = requested.length > 0 ? TARGETS.filter((t) => requested.includes(t.pkg)) : TARGETS

if (requested.length > 0 && selected.length === 0) {
  process.stderr.write(`Unknown target(s): ${requested.join(', ')}\n`)
  process.stderr.write(`Available: ${TARGETS.map((t) => t.pkg).join(', ')}\n`)
  process.exit(1)
}

for (const target of selected) {
  await buildOne(target)
}
