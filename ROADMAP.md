# ROADMAP

Last updated: 2026-04-03

## Current state

The extension ships command rewriting, a full output compaction pipeline, read safety, and operator controls via `/rtk`. The codebase is stable but has not changed since 2026-03-15. The RTK binary and the broader Pi extension ecosystem have moved forward in that time.

This roadmap orders the next work by impact and dependency.

## Phase 1 — Catch up with the runtime

Goal: stop the gap from widening. These are prerequisite to everything else.

### 1.1 Wire streaming execution events

Pi now exposes `tool_execution_start`, `tool_execution_update`, and `tool_execution_end` events. The extension currently only sees the final `tool_result`.

Add handlers for the execution lifecycle so that:

- streamed bash output shown in the TUI can be cleaned before the operator sees it (strip ANSI, strip RTK self-diagnostic lines)
- the extension can track which bash commands are actively running, enabling future correlation between rewrite decisions and their outcomes

Do not copy the MasuRii sanitizer. Build a lightweight stream-cleaning stage that plugs into the existing `stripAnsiFast` technique and a new pattern list for RTK diagnostics.

### 1.2 Isolate RTK history per session

When RTK rewrites a command, the RTK binary may write to a shared history database. Concurrent Pi sessions on the same machine can collide.

Add session-scoped environment injection so each Pi session gets its own `RTK_DB_PATH`. Use the OS temp directory and a session-derived subdirectory. Make the injection conditional — skip it if the operator already set the variable.

### 1.3 Handle RTK output format changes

RTK v0.34+ replaced emoji markers with text markers in its output. The compaction pipeline should handle both the old and new marker formats gracefully. Add a dedicated compaction technique for stripping or normalizing RTK-specific output decoration — do not bake it into the ANSI stripper.

### 1.4 Preserve environment prefixes through rewrites

Commands like `PYTHONIOENCODING=utf-8 python script.py` lose their leading `ENV=value` assignments when the rewrite pipeline replaces the command body. Add a prefix-splitting step early in the rewrite pipeline that extracts, preserves, and re-prepends environment assignments after rewriting.

## Phase 2 — Reliability and correctness

Goal: reduce the chance that the extension silently does the wrong thing.

### 2.1 Rewrite rule coverage for new RTK commands

RTK has expanded its command support (Ruby/Rails, AWS CLI, Bun, Deno, golangci-lint v2, Swift). Audit `rewrite-rules.ts` against the RTK v0.34 command list and add rules for newly supported command families. Consider adding a `ruby` and `cloud` rewrite category.

### 2.2 Bypass rules for structured output

Commands like `gh pr list --json title` produce structured JSON that should not be rewritten. The bypass system already covers some `gh` flags, but audit it against real-world structured-output patterns:

- `gh` with `--json`, `--jq`, `--template`
- `cargo` subcommands that are not filterable (`help`, `install`, `publish`)
- `kubectl get -o json/yaml`
- `docker inspect`

### 2.3 Improve edit-failure recovery

When source filtering causes an edit mismatch, the operator must manually toggle filtering and re-read. Explore automatic recovery:

- detect when a `tool_call` targets an edit tool and the preceding read was filtered
- automatically serve the unfiltered content for the next read of that path
- log the recovery so the operator can see it in `/rtk stats`

### 2.4 Expand test coverage for edge cases

The test suite covers the happy paths. Add explicit coverage for:

- compound commands with mixed rewritable and non-rewritable segments
- heredoc detection across quoting styles
- read compaction with offset/limit boundary conditions
- config normalization when fields are missing or have unexpected types
- the new streaming and environment isolation from Phase 1

## Phase 3 — Persistence and observability

Goal: make optimization decisions inspectable and durable.

### 3.1 Persist metrics across restarts

`output-metrics.ts` stores savings counters in memory. They vanish on reload. Persist the session-level aggregate to a file or Pi entry so `/rtk stats` survives restarts.

### 3.2 Rewrite decision journal

Record each rewrite decision (original command, rewritten command, rule ID, timestamp) in a bounded journal. Expose it through `/rtk history` with a configurable retention limit. Store the journal outside the model context — use `pi.appendEntry()` or a local file, not tool result details.

### 3.3 Compaction before-and-after snapshots

For lossy compaction techniques, optionally store a bounded number of recent before-and-after pairs. Make storage opt-in and capped (e.g. last 20 compactions, max 50 KB each). Expose through `/rtk diff <n>` so operators can inspect what was removed.

### 3.4 Operator-facing `/rtk` subcommands

Add:

- `/rtk history` — show recent rewrite decisions
- `/rtk diff` — show before/after for recent compactions
- `/rtk replay <n>` — re-display the original output of a specific compaction

Keep these read-only and operator-only. They should not inject data into the model context.

## Phase 4 — Config and UX refinement

Goal: make the extension easier to adopt and operate.

### 4.1 Config precedence clarity

Today the config loads from a single path. Support a clear precedence chain:

1. Project-local config (`.pi/extensions/pi-context-optimizer/config.json`)
2. Global config (`~/.pi/agent/extensions/pi-context-optimizer/config.json`)
3. Built-in defaults

Document the precedence visibly in `/rtk show` output.

### 4.2 Runtime config persistence

Changes made through the `/rtk` modal or agent tool should persist to the active config file. Today some changes are session-only. Make persistence the default and add a `--transient` flag for one-session overrides.

### 4.3 Expose compaction policy in config

Make the distinction between lossless techniques (ANSI strip) and lossy techniques (test aggregation, source filtering, smart truncation) visible in the config schema. Let operators disable all lossy techniques with a single toggle without losing ANSI stripping and hard truncation.

### 4.4 Handoff-aware compaction

Before a likely model handoff or deep-debug phase, aggressive lossy compaction can discard context the next model needs. Add an optional compaction dampening mode that reduces lossy compression when the session is approaching a context boundary. This is speculative — implement only if Pi exposes enough context metadata to make the decision reliably.

## Phase 5 — Platform and ecosystem

Goal: work correctly everywhere Pi runs.

### 5.1 Windows compatibility pass

The `windows-command-helpers.ts` file exists but coverage is thin. Test and fix:

- `cd /d` normalization
- Python UTF-8 encoding injection
- path separator handling in compaction techniques
- RTK binary detection on Windows

### 5.2 Track RTK binary version

Detect and log the installed RTK version at session start. Use it to conditionally enable features that depend on newer RTK versions (e.g. new command support, changed output formats). Show the detected version in `/rtk show`.

### 5.3 Pi SDK compatibility

Pin and test against current Pi SDK versions. The `peerDependencies` currently use `*` — tighten them to a tested range and document the minimum supported Pi version.

## Decisions

- This project is maintained as a standalone public repository.
- Prior projects (mcowger/pi-rtk, MasuRii/pi-rtk-optimizer, sherif-fanous/pi-rtk) are treated as prior art, not upstream targets.
- We do not send work upstream to any of those projects.
- Features are built independently. We study what others do, then design our own implementations.
- The original-source comparison path is abandoned.

## Out of scope

- Replacing Pi's session transcript with a parallel unbounded store.
- Storing full raw output of every tool call by default.
- Depending on in-memory correlation between parallel tool calls and results.
- Supporting agent frameworks other than Pi.
