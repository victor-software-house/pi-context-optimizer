# AGENTS.md

## Project identity

- Name: `pi-context-optimizer`
- Repository: `victor-software-house/pi-context-optimizer`
- Package: `@victor-software-house/pi-context-optimizer`
- Local path: `/Users/victor/workspace/victor/pi-context-optimizer`

## Purpose

This project is a Pi extension for:

- optional RTK-backed command rewriting
- tool output compaction for `bash`, `read`, and `grep`
- reducing context waste while preserving enough fidelity for coding workflows

## Current operating modes

- `rewrite`
- `suggest`
- `compact-only`

## Important repository documents

Read these first when starting a fresh session:

1. `README.md` — project overview, install, usage, command modes
2. `ROADMAP.md` — current workstreams and next steps
3. `docs/rtk-architecture-prompt-caching-and-model-handoffs.md` — durable RTK analysis and model-handoff tradeoffs
4. `hardening-plan.md` — implementation history and remaining hardening items

## Current project decisions

- This repository is the maintained standalone continuation of earlier RTK-related Pi extension work.
- We do not plan to send work upstream.
- Prior public projects are references and prior art only.
- Original-source comparison work is abandoned and should not be resumed unless explicitly requested.

## Current priorities

1. replace brittle type shims with real development dependencies where possible
2. improve persistent configuration behavior
3. improve edit-safety and exact-read recovery flows
4. refine compaction behavior for model handoffs and deep-debug phases
5. improve metrics persistence and long-term maintainability

## Validation commands

Run these after meaningful changes:

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

## Notes for future sessions

- The repo was moved from `pi-rtk-internal` to `pi-context-optimizer`.
- The public repo is now `victor-software-house/pi-context-optimizer`.
- `fork-origin` may still exist as a legacy remote pointing at the earlier fork-based repo.
- Prefer updating permanent docs when analysis is durable; do not leave long-term technical conclusions only in roadmap/planning files.
