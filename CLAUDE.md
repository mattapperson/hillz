# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`hillz` is a Bun/TypeScript CLI for evaluating Claude Code-style skills. Agents under test are expressed as [noetic](https://noetic.tools) flows (`Step<unknown, string, string>`); evals, tasks, and scorers are TypeScript modules auto-discovered from a user project. CLI surface: `run`, `suggest`, `enhance`, `coverage`, `compare`, `grade`, `check`, `cache`, `init` — one verb per phase. Built-in scorers are ported from [mastra](https://mastra.ai).

## Commands

Bun-native monorepo — there is no separate build step (packages export `./src/index.ts` directly via `main`/`exports`).

```bash
bun install                       # install workspaces
bun run typecheck                 # tsc --noEmit across @hillz/*
bun run test                      # bun test across @hillz/*
bun run lint                      # biome check
bun run lint:fix                  # biome check --fix
bun run format                    # biome format --write

# Single-package operations
bun --filter @hillz/core typecheck
bun --filter @hillz/core test
bun test packages/core/src/path/to/file.test.ts   # single test file

# Run the CLI against an example project
bun packages/cli/src/index.ts run --help
cd examples/starter-project && bun ../../packages/cli/src/index.ts check
```

The `hillz/` directory (results, cache, sqlite) is gitignored and biome-excluded; do not commit anything written there.

## External dependency: noetic

`@hillz/agent`, `@hillz/core`, and `@hillz/workspace` declare `@noetic-tools/core` as an `optionalDependencies` entry with version `*` so `bun install` succeeds in environments where noetic isn't present (CI, Vercel). To actually run/typecheck these packages locally, check out the `noetic` repo and link it: `cd ../noetic/packages/core && bun link` then in each consumer `bun link @noetic-tools/core`. Without that link, type imports from `Step`, `Item`, `Tool`, `AgentHarness`, etc. won't resolve in agent/core/workspace — the web package doesn't need it.

## Architecture

Six workspace packages with a strict dependency cone:

```
cli ──┬─> agent ─> core ─> @noetic-tools/core
      ├─> cache ─┘
      ├─> scorers ─┘
      └─> workspace ──┘
```

- **`@hillz/core`** — pure types and orchestration. Owns `Eval`/`Task`/`Skill`/`Scorer`/`AgentTrace`/`RunResult` shapes (`types.ts`), the `runEval` task scheduler with worker-pool concurrency (`runner.ts`), discovery globs (`discover.ts`), `loadSkill` frontmatter parser, deterministic cache-key hashing (`cacheKey.ts`), and the `defineEval`/`defineTask`/`defineSkill`/`defineScorer`/`defineConfig` identity helpers (`define.ts`). No I/O beyond filesystem reads for discovery.
- **`@hillz/agent`** — thin adapter over noetic's `AgentHarness`. `createAgentRunner()` returns an `AgentRunner` that compiles an `EvalFlow` (either a `Step` or a `FlowFactory({skill, task, tools})`) and produces an `AgentTrace` (output, items, paired tool calls, usage, cost). Also re-exports noetic's flow combinators (`react`, `branch`, `loop`, `step`, `tool`, etc.) so eval authors import everything from `@hillz/agent`. `createJudge()` provides the LLM judge for `llm`-kind scorers.
- **`@hillz/scorers`** — two registries: `builtInScorers` (no-config scorers like `content-similarity`, `completeness`, `tone-consistency`) and `builtInScorerFactories` (parameterized: `keyword-coverage`, `tool-call-accuracy`, `file-exists`, `diff-matches`, `max-cost`, `action-sequence`, etc.). Subdirs split by category: `code/` (output text), `behavior/` (tool-call traces), `file/` (workspace diffs).
- **`@hillz/cache`** — three `CacheStore` implementations (`memoryCache`, `fileCache`, `sqliteCache`). Keyed by SHA-256 of `(flowVersion, canonicalized input)` or a user-supplied `cacheKey(input)` fn. **Caching is bypassed entirely when an eval's task declares a `workspace`** (workspace state is not part of the key).
- **`@hillz/workspace`** — tempdir-based sandbox factory. Copies a `fixture/` dir into a per-task tempdir, hands the agent scoped `FsAdapter`/`ShellAdapter` instances, snapshots before/after, and produces a `WorkspaceDiff` (added/removed/modified with unified diffs). Failed task workspaces are archived to `hillz/results/<runId>/<taskId>/workspace/`; passing ones are destroyed unless `--keep-workspaces`.
- **`@hillz/cli`** — `cac`-based command surface. `loader.ts` builds a `LoadedContext` (skills, evals, scorers, agent, judge, cache, workspaceFactory, resultsDir) on every command by importing `hillz.config.ts` and running the three discovery globs. Each command in `commands/` is a `register*Command(cli)` function wired up from `index.ts`.

### User project conventions (what hillz discovers)

When the CLI runs against `cwd`, it globs:

| Glob | Module shape | Exports recognized |
| --- | --- | --- |
| `skills/**/SKILL.md` | Markdown + gray-matter frontmatter (`name`, `description`, required; `version`, optional) | — |
| `evals/**/*.eval.ts` | `Eval` or `Eval[]` | `default`, `evalDef`, `evals` |
| `scorers/**/*.scorer.ts` | `Scorer` or `Scorer[]` | `default`, `scorer`, `scorers` |
| `hillz.config.ts` | `HillzConfig` | `default`, `config` |

Discovery uses `tinyglobby` and dynamic `import()` — no transpile step, Bun executes the `.ts` directly. Eval authors typically write:

```ts
import { defineEval } from '@hillz/core'
import { react } from '@hillz/agent'

export default defineEval({
  name: 'example',
  skill: 'example',
  flowVersion: '1',         // required for caching
  flow: ({ skill }) => react({ model: '...', instructions: skill.body, tools: [] }),
  tasks: [{ id: 'greet', input: 'Say hello.' }],
  scorers: ['content-similarity'],
  passThreshold: 0.5,
})
```

`see examples/starter-project/` for a working layout.

### Scoring & grading model

`runEval` resolves `ScorerRef`s in two phases: registry lookups for plain strings, factory invocations for `{ name, opts }` objects. Each task runs all eval-level + task-level scorers in parallel; scorer throws become a `score: 0` result rather than failing the run. `meanScore >= passThreshold (default 0.8)` decides `passed`. `grade` re-scores persisted `RunResult` JSON without re-invoking the agent — use this when iterating on scorer logic.

### Cache semantics

- Trace stored in cache has `fromCache: false`; the read path stamps `fromCache: true` for the current consumer only.
- Workspace state is stripped before persistence (`stripWorkspace`) — caches are workspace-agnostic by construction.
- Eval without a `flowVersion` **and** without a custom `cacheKey` won't cache at all. `check` warns about this.

## Code style (enforced)

- **Strict typeguards, no `any`, no `as`, no `<T>` casts.** The codebase already follows this: see `packages/core/src/guards.ts` (`isRecord`, `readString`, `readNumber`, `readStringArray`, `isAgentTrace`) and the per-shape predicates in `discover.ts` and `loader.ts`. When narrowing untyped JSON or dynamic imports, add a typeguard alongside the existing ones rather than asserting. Biome's `noExplicitAny` is set to `warn` but treat it as `error`.
- Biome formatter: single quotes, semicolons `asNeeded`, trailing commas `all`, 100-col line width, 2-space indent.
- `verbatimModuleSyntax` + `useImportType`/`useExportType` are enforced — always `import type { ... }` for types.
- `noUncheckedIndexedAccess` is on; treat array/index access as possibly `undefined`.
- ESM only (`"type": "module"`). Use `node:` prefix for built-ins (e.g. `import { join } from 'node:path'`).

## Worktree-only development

This repo follows the global worktrunk-only rule. Do not modify the main worktree directly — `wt switch -c <branch>` before starting work, then `wt merge` / `wt remove` to clean up.

## Releasing

Pushes to `main` trigger `.github/workflows/publish.yml`. The workflow runs `semantic-release` (conventional-commits-driven) which:

1. Computes the next version from commit types since the most recent `v*` tag (`feat:` → minor, `fix:`/`perf:`/`refactor:`/`build:` → patch, `docs:`/`chore:`/`test:` → no release).
2. Calls `scripts/release-prepare.ts <version>` — bumps all 7 package.json files (`packages/cli`, `packages/hillz`, the 5 per-arch packages) and the `optionalDependencies` pins in `packages/hillz/package.json`, then cross-compiles all 5 platform binaries via `bun scripts/build-binaries.ts`.
3. Calls `scripts/release-publish.ts <version>` — `npm publish`es each `hillz-{platform}-{arch}` first, then `hillz` last (so the main package's `optionalDependencies` resolve at publish time).
4. Commits the bumped package.json + `CHANGELOG.md` back to `main` with `[skip ci]`, tags `v<version>`, creates a GitHub Release.

Requirements:

- Repo secret `NPM_TOKEN` (npm Automation Token — bypasses 2FA). Auth is token-based; `id-token: write` permission is retained only so `--provenance` can attest builds via GitHub OIDC.

To skip a release on a `main` push, use commit type `chore:`/`docs:`/`test:` or add `[skip ci]` to the commit message.
