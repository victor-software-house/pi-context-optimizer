# AGENTS

Repository-specific instructions for agents working in this repository.

## Project identity

| Field | Value |
|:------|:------|
| Repository | `victor-software-house/pi-context-optimizer` |
| Package | `@victor-software-house/pi-context-optimizer` |
| Local path | `/Users/victor/workspace/victor/pi-context-optimizer` |

## Read first in a fresh session

1. `README.md`
2. `ROADMAP.md`
3. `docs/rtk-architecture-prompt-caching-and-model-handoffs.md`
4. `hardening-plan.md`

## Repository purpose

This repository maintains a Pi extension that:

- optionally rewrites supported `bash` commands through RTK
- compacts noisy tool output from `bash`, `read`, and `grep`
- supports these operating modes:
  - `rewrite`
  - `suggest`
  - `compact-only`

## Current repository decisions

- This is the maintained standalone public repository for this project.
- Do not plan work around upstream contribution unless explicitly requested.
- Earlier public repositories are references and prior art only.
- The original-source comparison path is abandoned and should not be resumed unless explicitly requested.
- Durable technical conclusions belong in `docs/`, not only in roadmap or planning files.

## Validation commands

Use these commands after meaningful changes:

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

## Architecture reference

| Module | Responsibility |
|:-------|:---------------|
| `index.ts` | Pi auto-discovery entrypoint |
| `src/index.ts` | Extension bootstrap, event wiring, runtime state |
| `src/config-store.ts` | Config load/save and normalization |
| `src/config-modal.ts` | `/rtk` command handling and settings modal |
| `src/command-rewriter.ts` | Rewrite decision engine |
| `src/rewrite-rules.ts` | Rewrite catalog by command family |
| `src/rewrite-bypass.ts` | Safety bypass rules for unsafe command shapes |
| `src/rewrite-pipeline-safety.ts` | Shell safety fixes for rewritten commands |
| `src/runtime-guard.ts` | RTK availability gating |
| `src/output-compactor.ts` | Tool result compaction pipeline |
| `src/output-metrics.ts` | Session metrics and summaries |
| `src/techniques/` | Individual compaction techniques |

## Event usage

This extension uses these Pi extension events:

- `tool_call`
- `tool_result`
- `before_agent_start`
- `session_start`
- `session_switch`

## Safety-sensitive files

Treat changes in these files as high-risk:

- `src/command-rewriter.ts`
- `src/rewrite-bypass.ts`
- `src/rewrite-pipeline-safety.ts`
- `src/output-compactor.ts`
- `src/techniques/source.ts`
- `src/config-store.ts`

## Documentation placement

- `README.md` = onboarding and usage
- `docs/` = durable technical reference
- `ROADMAP.md` = planning and next steps
- `hardening-plan.md` = implementation history / remaining hardening items

## Session continuity notes

- The project was renamed from `pi-rtk-internal` to `pi-context-optimizer`.
- The repository was moved to `/Users/victor/workspace/victor/pi-context-optimizer`.
- A legacy remote named `fork-origin` may still exist and point at the earlier fork-based repository.
- The active public repository is `victor-software-house/pi-context-optimizer`.
