# AGENTS

Shared instructions for any agent working in this repository.

For project overview and user-facing usage, see [README.md](./README.md).

---

## Project identity

| Field | Value |
|:------|:------|
| Repository | `victor-software-house/pi-context-optimizer` |
| Package | `@victor-software-house/pi-context-optimizer` |
| Local path | `/Users/victor/workspace/victor/pi-context-optimizer` |
| Runtime | Node.js `>=20` |
| Language | TypeScript |
| Package manager | Bun-compatible workflow with `bunx` for validation |

---

## Read first in a fresh session

1. `README.md` — purpose, modes, install, operator commands
2. `ROADMAP.md` — current workstreams and next priorities
3. `docs/rtk-architecture-prompt-caching-and-model-handoffs.md` — durable RTK architecture and tradeoff analysis
4. `hardening-plan.md` — implementation history and remaining hardening items

---

## Repository purpose

This repository maintains a Pi extension that:

- optionally rewrites supported `bash` commands through RTK
- compacts noisy tool output from `bash`, `read`, and `grep`
- reduces context waste while preserving enough fidelity for coding workflows

Supported operating modes:

- `rewrite`
- `suggest`
- `compact-only`

---

## Current repository decisions

- This is the maintained standalone public repository for this project.
- Do not plan work around upstream contribution unless the user explicitly asks for it.
- Earlier public repositories are prior art and references only.
- The original-source comparison path is abandoned and should not be resumed unless explicitly requested.
- Durable technical conclusions belong in `docs/`, not only in roadmap or planning files.

---

## Validation requirements

Run after meaningful changes and before finalizing work:

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

If you change documentation only, still ensure any referenced commands remain accurate.

---

## Architecture reference

### Module map

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
| `src/*-test.ts` | File-level executable test coverage |

### Event usage

This extension relies on Pi extension events directly:

- `tool_call` — inspect and optionally rewrite `bash` commands
- `tool_result` — compact `bash`, `read`, and `grep` outputs
- `before_agent_start` — add troubleshooting guidance to the prompt
- `session_start` / `session_switch` — refresh config and runtime state

### Safety-sensitive areas

Treat changes in these areas as high-risk and validate carefully:

- `command-rewriter.ts`
- `rewrite-bypass.ts`
- `rewrite-pipeline-safety.ts`
- `output-compactor.ts`
- `techniques/source.ts`
- `config-store.ts`

These modules can affect command correctness, edit fidelity, and model-visible context.

---

## Coding standards

- Keep changes minimal and source-grounded.
- Prefer precise fixes over broad rewrites.
- Maintain `strict` TypeScript.
- Do not introduce weaker typing to silence errors.
- Prefer permanent docs for stable technical analysis.
- Keep README claims aligned with actual code and scripts.
- Preserve exact-read safeguards for edit-sensitive workflows.
- Be conservative with lossy filtering behavior.

---

## Documentation rules

- `README.md` is the onboarding and usage entrypoint.
- `docs/` holds durable technical reference material.
- `ROADMAP.md` is for planning and next steps only.
- `hardening-plan.md` is historical/implementation tracking, not the main source of truth.
- If a conclusion will matter in future sessions, document it in `README.md` or `docs/`.

---

## Session continuity notes

- The project was renamed from `pi-rtk-internal` to `pi-context-optimizer`.
- The repository was moved to `/Users/victor/workspace/victor/pi-context-optimizer`.
- A legacy remote named `fork-origin` may still exist and point at the earlier fork-based repository.
- The active public repository is `victor-software-house/pi-context-optimizer`.

---

## Directory ownership

| Directory | Owner |
|:----------|:------|
| `.claude/` | Claude Code |
| `.windsurf/` | Windsurf/Cascade |
| `.cognition/` | Devin CLI |
| `AGENTS.md` | Shared |

If any of these directories are added later, keep `AGENTS.md` as the shared source of truth for cross-agent rules.
