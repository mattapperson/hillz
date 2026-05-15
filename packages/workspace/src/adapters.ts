import { spawn } from 'node:child_process'
import {
  access,
  appendFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import type { FsAdapter, FsStats, ShellAdapter, ShellExecResult } from '@noetic-tools/core'
import { TIMEOUT_ERROR_PREFIX } from '@noetic-tools/core'

class PathEscapeError extends Error {
  constructor(path: string, dir: string) {
    super(`Path '${path}' escapes the workspace at '${dir}'`)
  }
}

const resolveInside = async (dir: string, path: string): Promise<string> => {
  if (isAbsolute(path)) throw new PathEscapeError(path, dir)
  const joined = resolve(dir, path)
  const realDir = await realpath(dir).catch(() => dir)
  const prefix = realDir.endsWith(sep) ? realDir : realDir + sep
  if (joined !== realDir && !joined.startsWith(prefix)) {
    throw new PathEscapeError(path, dir)
  }
  return joined
}

const toFsStats = (s: {
  size: number
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
  isFile: () => boolean
}): FsStats => ({
  size: s.size,
  isDirectory: () => s.isDirectory(),
  isSymbolicLink: () => s.isSymbolicLink(),
  isFile: () => s.isFile(),
})

export const createLocalFsAdapter = (dir: string): FsAdapter => ({
  readFile: async (path) => {
    const abs = await resolveInside(dir, path)
    return readFile(abs)
  },
  readFileText: async (path) => {
    const abs = await resolveInside(dir, path)
    return readFile(abs, 'utf8')
  },
  writeFile: async (path, content) => {
    const abs = await resolveInside(dir, path)
    await mkdir(join(abs, '..'), { recursive: true })
    await writeFile(abs, content, 'utf8')
  },
  writeFileBytes: async (path, content) => {
    const abs = await resolveInside(dir, path)
    await mkdir(join(abs, '..'), { recursive: true })
    await writeFile(abs, content)
  },
  appendFile: async (path, content) => {
    const abs = await resolveInside(dir, path)
    await mkdir(join(abs, '..'), { recursive: true })
    await appendFile(abs, content, 'utf8')
  },
  mkdir: async (path) => {
    const abs = await resolveInside(dir, path)
    await mkdir(abs, { recursive: true })
  },
  rename: async (oldPath, newPath) => {
    const oldAbs = await resolveInside(dir, oldPath)
    const newAbs = await resolveInside(dir, newPath)
    await rename(oldAbs, newAbs)
  },
  rm: async (path, options) => {
    const abs = await resolveInside(dir, path)
    await rm(abs, options)
  },
  access: async (path, mode) => {
    const abs = await resolveInside(dir, path)
    await access(abs, mode)
  },
  stat: async (path) => {
    const abs = await resolveInside(dir, path)
    return toFsStats(await stat(abs))
  },
  lstat: async (path) => {
    const abs = await resolveInside(dir, path)
    return toFsStats(await lstat(abs))
  },
  readdir: async (path) => {
    const abs = await resolveInside(dir, path)
    return readdir(abs)
  },
})

export const createLocalShellAdapter = (defaultCwd: string): ShellAdapter => ({
  exec: (command, options) =>
    new Promise<ShellExecResult>((resolveExec, rejectExec) => {
      const cwd = options.cwd || defaultCwd
      const child = spawn(command, {
        shell: true,
        cwd,
        env: { ...process.env, ...(options.env ?? {}) },
        signal: options.signal,
      })

      let stdout = ''
      let stderr = ''
      let timer: ReturnType<typeof setTimeout> | undefined

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8')
        options.onData?.(chunk)
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8')
      })

      if (options.stdin !== undefined) {
        child.stdin?.end(options.stdin)
      }

      if (options.timeout && options.timeout > 0) {
        timer = setTimeout(() => {
          child.kill('SIGTERM')
          rejectExec(new Error(`${TIMEOUT_ERROR_PREFIX}${options.timeout}`))
        }, options.timeout * 1000)
      }

      child.on('error', (err: Error) => {
        if (timer) clearTimeout(timer)
        rejectExec(err)
      })
      child.on('close', (exitCode: number | null) => {
        if (timer) clearTimeout(timer)
        resolveExec({ stdout, stderr, exitCode })
      })
    }),
})
