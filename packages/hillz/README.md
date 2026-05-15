# hillz

Eval and auto-improve agent skills via hill climbing.

```bash
npm i -g hillz
hillz --help
```

A pre-built Bun-compiled binary for your platform is installed automatically as an optional dependency. No Bun runtime required on the user's machine.

## Supported platforms

| OS      | Arch  | Package               |
| ------- | ----- | --------------------- |
| Linux   | x64   | `hillz-linux-x64`     |
| Linux   | arm64 | `hillz-linux-arm64`   |
| macOS   | x64   | `hillz-darwin-x64`    |
| macOS   | arm64 | `hillz-darwin-arm64`  |
| Windows | x64   | `hillz-windows-x64`   |

## Auto-update

`hillz` checks for a new version at most once every 24 hours. When a newer release exists, it kicks off `npm install -g hillz@latest` in a detached background process and prints one line to stderr (`hillz: updating to <version> in background…`). The current invocation finishes on your existing version; the next one picks up the new binary.

The check is skipped automatically when any of these is true:

| Condition                              | Why                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| `HILLZ_NO_UPDATE=1` env var             | Permanent opt-out.                                                  |
| `--no-update` flag                      | One-shot opt-out (stripped before the CLI parses argv).             |
| `CI=true` (or `CI=1`)                   | Skip in CI runners. Set by GitHub Actions, GitLab CI, CircleCI, etc. |
| Non-TTY stderr                          | Output is being piped/captured; don't pollute it.                   |
| Version starts with `0.0.0`             | Local development build.                                             |
| Last check was less than 24 hours ago   | Throttled.                                                          |
| The global npm prefix isn't writable    | Silently skip — no nag if you'd need `sudo`.                        |

Override the throttle for testing with `HILLZ_UPDATE_CHECK_INTERVAL_HOURS=0`.

The update flow is fully concurrent-safe — a lock file at `~/.cache/hillz/.update.lock` (or `$XDG_CACHE_HOME/hillz/.update.lock`) prevents two `hillz` invocations from launching simultaneous installs.

## Documentation

See [https://hillz.dev](https://hillz.dev) for full docs.
