# hillz

A Bun/TypeScript CLI for evaluating agent skills.

```bash
npm i -g hillz
```

Ships as a standalone Bun-compiled binary per platform (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64); npm installs the matching one via `optionalDependencies`. Node 18+ is the only host-runtime requirement.

Agents under test are defined as [noetic](https://noetic.tools) flows; evals and tasks are authored as TypeScript modules and auto-discovered. Built-in scorers are ported from [mastra](https://mastra.ai) (Apache 2.0). The CLI is a small set of verbs — `run`, `suggest`, `enhance`, `coverage`, `compare`, `grade` — one per phase.

See [https://hillz.dev](https://hillz.dev) for full docs.
