# @victor-software-house/pi-context-optimizer

Pi extension for command rewriting and tool output compaction in the Pi coding agent.

![background](https://raw.githubusercontent.com/MasuRii/pi-rtk-optimizer/main/asset/pi-rtk-optimizer-background.png)

`@victor-software-house/pi-context-optimizer` rewrites selected `bash` commands through RTK and compacts noisy tool output from `bash`, `read`, and `grep` so the agent spends less context on low-value text.

## Status

This repository is the maintained public standalone continuation of earlier RTK-related Pi extension work.

## Features

### Command handling modes

- `rewrite` — rewrite supported `bash` commands through RTK automatically
- `suggest` — keep original commands, but show RTK suggestions
- `compact-only` — disable command rewriting and keep output compaction enabled

### Rewrite coverage

Supported command families include:

- Git and GitHub
- Filesystem and search commands
- Rust toolchain commands
- JavaScript and TypeScript tooling
- Python tooling
- Go tooling
- Container tooling
- Network commands
- Package manager commands

### Output compaction pipeline

- ANSI stripping
- test output aggregation
- build output filtering
- git output compaction
- linter aggregation
- search result grouping
- source code filtering
- smart truncation
- hard truncation

### Read safety features

- exact output preserved for explicit range reads (`offset` or `limit`)
- exact output preserved for short reads
- optional exact preservation for skill reads

### Operator controls

- `/rtk` settings modal
- `/rtk show`
- `/rtk path`
- `/rtk verify`
- `/rtk stats`
- `/rtk clear-stats`
- `/rtk reset`
- `/rtk help`

## Installation

### Local extension folder

Place this project in one of these locations:

```text
~/.pi/agent/extensions/pi-context-optimizer
.pi/extensions/pi-context-optimizer
```

### Git installation

```bash
pi install git:github.com/victor-software-house/pi-context-optimizer
```

## Configuration

Default config path:

```text
~/.pi/agent/extensions/pi-context-optimizer/config.json
```

A starter config is included at `config/config.example.json`.

## Modes

| Mode | Rewrite commands | Compact output | Requires RTK binary for value |
|---|---:|---:|---:|
| `rewrite` | Yes | Yes | Yes |
| `suggest` | No | Yes | No |
| `compact-only` | No | Yes | No |

## Event hooks used

This extension uses Pi extension events directly:

- `tool_call` — inspect and optionally rewrite `bash` commands
- `tool_result` — compact `bash`, `read`, and `grep` outputs
- `before_agent_start` — add troubleshooting guidance to the prompt
- `session_start` / `session_switch` — refresh config and runtime state

## Development

Install dependencies to set up Husky and the `commit-msg` commitlint hook:

```bash
npm install
```

Validation commands:

```bash
bunx tsc -p tsconfig.json
bun ./src/output-compactor-test.ts
bun ./src/command-rewriter-test.ts
bun ./src/runtime-guard-test.ts
bun ./src/additional-coverage-test.ts
bun ./src/config-modal-test.ts
bun ./src/index-test.ts
bun run build:check
```

## Release automation

This repository uses:

- `semantic-release` for versioning, tags, GitHub releases, and npm publishing
- npm trusted publishing from GitHub Actions
- commitlint plus Husky to enforce Conventional Commits locally

Release workflow summary:

1. merge Conventional Commit-based changes to `main`
2. GitHub Actions runs `semantic-release`
3. `semantic-release` determines the next version from commit history
4. GitHub release and npm publish happen from the release workflow

## Documentation

- [RTK architecture, prompt caching, and model handoffs](docs/rtk-architecture-prompt-caching-and-model-handoffs.md)
- [Roadmap](ROADMAP.md)

## Credits and prior art

This project builds on ideas explored in earlier public work.

References:

- `mcowger/pi-rtk`
- `MasuRii/pi-rtk-optimizer`
- `sherif-fanous/pi-rtk`
- `rtk-ai/rtk`

These projects informed the command rewriting, output compaction, and RTK integration approaches used here.

## License

[MIT](LICENSE)
