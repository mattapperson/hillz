#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const PLATFORM_PACKAGES = {
  'linux-x64': 'hillz-linux-x64',
  'linux-arm64': 'hillz-linux-arm64',
  'darwin-x64': 'hillz-darwin-x64',
  'darwin-arm64': 'hillz-darwin-arm64',
  'win32-x64': 'hillz-windows-x64',
}

const DEFAULT_THROTTLE_HOURS = 24
const STALE_LOCK_MS = 5 * 60 * 1000
const NPM_VIEW_TIMEOUT_MS = 5000
const NPM_PREFIX_TIMEOUT_MS = 3000

function cacheDir() {
  const xdg = process.env.XDG_CACHE_HOME
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), '.cache')
  return join(base, 'hillz')
}

function shouldSkipUpdateCheck() {
  if (process.env.HILLZ_NO_UPDATE === '1') return true
  if (process.env.CI === 'true' || process.env.CI === '1') return true
  if (process.argv.includes('--no-update')) return true
  if (typeof pkg.version !== 'string' || pkg.version.startsWith('0.0.0')) return true
  if (!process.stderr.isTTY) return true
  return false
}

function throttleIntervalMs() {
  const raw = process.env.HILLZ_UPDATE_CHECK_INTERVAL_HOURS
  if (raw === undefined) return DEFAULT_THROTTLE_HOURS * 60 * 60 * 1000
  const hours = Number.parseFloat(raw)
  if (!Number.isFinite(hours) || hours < 0) return DEFAULT_THROTTLE_HOURS * 60 * 60 * 1000
  return hours * 60 * 60 * 1000
}

function recentlyChecked() {
  const stampFile = join(cacheDir(), 'last-update-check.json')
  try {
    const raw = readFileSync(stampFile, 'utf8')
    const parsed = JSON.parse(raw)
    const last = typeof parsed.lastCheckMs === 'number' ? parsed.lastCheckMs : 0
    return Date.now() - last < throttleIntervalMs()
  } catch {
    return false
  }
}

function recordCheck() {
  const stampFile = join(cacheDir(), 'last-update-check.json')
  try {
    mkdirSync(dirname(stampFile), { recursive: true })
    writeFileSync(stampFile, JSON.stringify({ lastCheckMs: Date.now() }), { flag: 'w' })
  } catch {
    // best-effort; if we can't write, we'll re-check next invocation
  }
}

function acquireLock() {
  const lockPath = join(cacheDir(), '.update.lock')
  try {
    mkdirSync(dirname(lockPath), { recursive: true })
  } catch {
    return null
  }
  try {
    writeFileSync(lockPath, String(process.pid), { flag: 'wx' })
    return lockPath
  } catch (err) {
    if (err?.code !== 'EEXIST') return null
  }
  // Lock exists; check if stale.
  let stats
  try {
    stats = statSync(lockPath)
  } catch {
    return null
  }
  if (Date.now() - stats.mtimeMs < STALE_LOCK_MS) return null
  // Re-stat before unlink (TOCTOU mitigation: another process may have just refreshed it).
  try {
    const recheck = statSync(lockPath)
    if (Date.now() - recheck.mtimeMs < STALE_LOCK_MS) return null
    unlinkSync(lockPath)
  } catch {
    return null
  }
  try {
    writeFileSync(lockPath, String(process.pid), { flag: 'wx' })
    return lockPath
  } catch {
    return null
  }
}

function releaseLock(lockPath) {
  if (lockPath === null) return
  try {
    const content = readFileSync(lockPath, 'utf8')
    if (content === String(process.pid)) unlinkSync(lockPath)
  } catch {
    // Lock might already be gone; ignore.
  }
}

function runCapturing(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    const out = []
    let settled = false
    let child
    try {
      child = spawn(cmd, args, { cwd: homedir(), stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      resolve(null)
      return
    }
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        child.kill('SIGKILL')
      } catch {}
      resolve(null)
    }, timeoutMs)
    child.stdout.on('data', (chunk) => out.push(chunk))
    child.on('error', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(null)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code !== 0) {
        resolve(null)
        return
      }
      resolve(Buffer.concat(out).toString('utf8').trim())
    })
  })
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)/

function compareSemver(a, b) {
  const ma = SEMVER_RE.exec(a)
  const mb = SEMVER_RE.exec(b)
  if (ma === null || mb === null) return null
  for (let i = 1; i <= 3; i++) {
    const da = Number.parseInt(ma[i], 10)
    const db = Number.parseInt(mb[i], 10)
    if (da !== db) return da < db ? -1 : 1
  }
  return 0
}

async function maybeStartBackgroundUpdate() {
  if (shouldSkipUpdateCheck()) return
  if (recentlyChecked()) return

  const lockPath = acquireLock()
  if (lockPath === null) return

  // Stamp before the network call so a crash mid-check doesn't replay constantly.
  recordCheck()

  let released = false
  const release = () => {
    if (released) return
    released = true
    releaseLock(lockPath)
  }

  try {
    const latest = await runCapturing(
      'npm',
      ['view', 'hillz', 'version', '--prefer-online'],
      NPM_VIEW_TIMEOUT_MS,
    )
    if (latest === null || !SEMVER_RE.test(latest)) return
    const cmp = compareSemver(pkg.version, latest)
    if (cmp === null || cmp >= 0) return

    const prefix = await runCapturing('npm', ['prefix', '-g'], NPM_PREFIX_TIMEOUT_MS)
    if (prefix === null) return
    if (!canWrite(prefix)) return

    process.stderr.write(`hillz: updating to ${latest} in background…\n`)
    try {
      const installer = spawn('npm', ['install', '-g', 'hillz@latest'], {
        cwd: homedir(),
        detached: true,
        stdio: 'ignore',
      })
      installer.on('exit', release)
      installer.on('error', release)
      installer.unref()
    } catch {
      release()
    }
    // Do NOT release the lock here on the success path — the installer's exit
    // listener handles it. If the parent process exits before the installer
    // finishes, the lock file's mtime keeps it fresh until STALE_LOCK_MS.
    released = true
  } catch {
    release()
  } finally {
    if (!released) release()
  }
}

function canWrite(dir) {
  try {
    const probe = join(dir, `.hillz-write-probe-${process.pid}`)
    writeFileSync(probe, '')
    unlinkSync(probe)
    return true
  } catch {
    return false
  }
}

function resolveBinary() {
  const key = `${process.platform}-${process.arch}`
  const platformPkg = PLATFORM_PACKAGES[key]
  if (!platformPkg) {
    const supported = Object.keys(PLATFORM_PACKAGES).join(', ')
    process.stderr.write(
      `hillz: no prebuilt binary for ${key}. Supported platforms: ${supported}.\n`,
    )
    process.exit(1)
  }
  const binName = process.platform === 'win32' ? 'hillz.exe' : 'hillz'
  try {
    return require.resolve(`${platformPkg}/bin/${binName}`)
  } catch (err) {
    process.stderr.write(
      `hillz: missing platform package ${platformPkg}. ` +
        `npm should have installed it as an optionalDependency of \`hillz\`. ` +
        `Try reinstalling: \`npm i -g hillz\`.\n`,
    )
    if (err instanceof Error && err.message) {
      process.stderr.write(`hillz: underlying error: ${err.message}\n`)
    }
    process.exit(1)
  }
}

// Strip launcher-only flags before forwarding to the binary.
const forwardedArgs = process.argv.slice(2).filter((a) => a !== '--no-update')

// Fire-and-forget the update check. We don't await — the launcher must keep
// its startup penalty bounded. Any in-flight check that finishes before we
// exec the binary will still print its stderr line; ones that don't finish
// in time silently keep running until the npm view 5s timeout.
const updateCheck = maybeStartBackgroundUpdate()

const binPath = resolveBinary()
const child = spawn(binPath, forwardedArgs, { stdio: 'inherit' })

child.on('exit', (code, signal) => {
  // Best-effort: wait briefly for the update-check microtask chain so the
  // background install handoff completes. The await is bounded by the npm-view
  // timeout (5s) and the install spawn is detached, so we don't block on it.
  void updateCheck.finally(() => {
    if (signal !== null) {
      try {
        process.kill(process.pid, signal)
      } catch {
        process.exit(1)
      }
      return
    }
    process.exit(code ?? 1)
  })
})

child.on('error', (err) => {
  process.stderr.write(`hillz: failed to launch binary: ${err.message}\n`)
  process.exit(1)
})
