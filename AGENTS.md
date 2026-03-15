# AGENTS.md

Project-specific instructions for agents working in this repository.

## Project scope

This repository contains the Pi extension `@victor-software-house/pi-context-optimizer`.

Primary responsibilities:

- rewrite selected `bash` commands through RTK
- compact noisy `bash`, `read`, and `grep` outputs
- support these modes:
  - `rewrite`
  - `suggest`
  - `compact-only`

## Read first

Before making changes, read these files in this order:

1. `README.md`
2. `ROADMAP.md`
3. `docs/rtk-architecture-prompt-caching-and-model-handoffs.md`
4. `hardening-plan.md`

## Dev environment

- Local path: `/Users/victor/workspace/victor/pi-context-optimizer`
- Package name: `@victor-software-house/pi-context-optimizer`
- Runtime target: Node.js `>=20`
- Use `bunx` for ad hoc TypeScript validation commands.

## Validation

Run these commands after meaningful changes:

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

## Change workflow

- Do not plan work around upstream contribution unless explicitly requested.
- Treat earlier public repositories as prior art only.
- The original-source comparison path is abandoned.
- Put durable technical analysis in `docs/`, not only in planning files.

## Important files

| Path | Purpose |
|:-----|:--------|
| `index.ts` | Pi auto-discovery entrypoint |
| `src/index.ts` | extension bootstrap, event wiring, runtime state |
| `src/config-store.ts` | config load/save and normalization |
| `src/config-modal.ts` | `/rtk` command handling and settings modal |
| `src/command-rewriter.ts` | rewrite decision engine |
| `src/rewrite-rules.ts` | rewrite catalog |
| `src/rewrite-bypass.ts` | bypass rules for unsafe command shapes |
| `src/rewrite-pipeline-safety.ts` | shell safety fixes for rewritten commands |
| `src/runtime-guard.ts` | RTK availability gating |
| `src/output-compactor.ts` | tool result compaction pipeline |
| `src/output-metrics.ts` | metrics and summaries |
| `src/techniques/` | individual compaction techniques |

## High-risk files

Validate carefully after changes in:

- `src/command-rewriter.ts`
- `src/rewrite-bypass.ts`
- `src/rewrite-pipeline-safety.ts`
- `src/output-compactor.ts`
- `src/techniques/source.ts`
- `src/config-store.ts`

## Pi event usage

This extension uses these Pi extension events:

- `tool_call`
- `tool_result`
- `before_agent_start`
- `session_start`
- `session_switch`

## Documentation placement

- `README.md` — onboarding and usage
- `docs/` — durable technical reference
- `ROADMAP.md` — planning and next steps
- `hardening-plan.md` — implementation history and remaining hardening items
