import { cp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Workspace, WorkspaceFactory } from '@hillz/core'
import { createLocalFsAdapter, createLocalShellAdapter } from './adapters'
import { diffSnapshots, snapshotDir } from './snapshot'

export const createWorkspaceFactory = (opts?: { tmpRoot?: string }): WorkspaceFactory => {
  const tmpRoot = opts?.tmpRoot ?? tmpdir()

  return {
    create: async (spec, runId, taskId) => {
      const dir = join(tmpRoot, `hillz-${runId}-${taskId}`)
      await mkdir(dir, { recursive: true })

      if (spec.fixture) {
        await cp(spec.fixture, dir, { recursive: true, errorOnExist: false, force: true })
      }

      const workspace: Workspace = {
        dir,
        snapshot: () => snapshotDir(dir, { maxFileBytes: spec.maxFileBytes }),
        diff: (before, after) => diffSnapshots(before, after),
        adapters: (adapterOpts) => ({
          fs: createLocalFsAdapter(dir),
          shell: adapterOpts?.allowShell ? createLocalShellAdapter(dir) : undefined,
        }),
        destroy: async () => {
          await rm(dir, { recursive: true, force: true })
        },
        archive: async (toDir) => {
          await mkdir(toDir, { recursive: true })
          await cp(dir, toDir, { recursive: true, force: true })
        },
      }
      return workspace
    },
  }
}
