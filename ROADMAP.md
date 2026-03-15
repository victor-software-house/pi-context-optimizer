# ROADMAP

## Immediate sequence

1. Complete strict typing and remove as much shimmed typing as possible.
2. Finish the rename and documentation cleanup around `pi-context-optimizer`, including the move to `/Users/victor/workspace/victor/pi-context-optimizer`.
3. Improve persistence, edit safety, and compaction controls.
4. Analyze RTK itself, its implementation model, and the practical tradeoffs for prompt caching and cross-model handoffs.
5. Original-source comparison path: abandoned. We do not care about this path anymore.

## Current decisions

- This project is now maintained as a standalone public repository.
- We do not plan to send work upstream.
- Prior projects are treated as references and prior art, not as active maintenance targets.

## Workstreams

### 1. Typing and dependency cleanup

- Replace brittle ambient shims with real upstream development dependencies where possible.
- Keep `strict` TypeScript enabled.
- Continue reducing test-only type workarounds.

### 2. Persistence and config behavior

- Make runtime config changes persist predictably.
- Clarify config precedence between project-local and global config.
- Revisit config UX for mode switching and read safety controls.

### 3. Edit safety and read fidelity

- Detect edit-sensitive workflows more aggressively.
- Prefer exact reads when an edit is likely.
- Add automatic recovery paths when filtered reads cause edit mismatch failures.

### 4. Compaction and model-handoff behavior

- Make lossless versus lossy compaction visible in config and docs.
- Review whether some compaction techniques should be disabled automatically before likely handoff or deep-debug phases.
- Consider optional escape hatches for exact re-read flows before switching models mid-session.

### 5. Metrics and maintainability

- Persist metrics across restarts when useful.
- Expand compatibility coverage for macOS, Linux, and Windows.
- Add issue templates and release automation when the project stabilizes.

on when the project stabilizes.

## RTK analysis notes

### What RTK is

- RTK is implemented in Rust.
- It is a compiled CLI proxy designed to sit in front of normal shell commands.
- It rewrites supported commands to `rtk ...`, runs the underlying real command, then filters the output before returning it.

### High-level execution model

1. A caller invokes `rtk rewrite <command>` or an equivalent hook-driven rewrite path.
2. RTK determines whether the command has a supported RTK-aware wrapper.
3. It routes execution to a command-specific implementation.
4. The real underlying command is executed.
5. RTK captures stdout, stderr, and exit status.
6. RTK applies command-aware filtering, grouping, truncation, and fallback behavior.
7. The filtered result is returned, while preserving the underlying exit code where possible.

### Prompt caching impact

RTK does not directly control provider-side prompt caching.

What it changes is the prompt content itself:

- smaller command outputs can reduce prompt size
- smaller prompts can reduce cache write/read cost indirectly if the provider caches those prompts
- filtered output can also improve cache reuse if repeated commands produce more normalized output

What RTK does **not** do:

- it does not manage Anthropic or OpenAI cache keys
- it does not preserve cache identity across providers or models
- it does not guarantee better prompt-cache hit rates on its own

### Model-switch and handoff tradeoffs

Benefits:

- smaller outputs make mid-session handoff cheaper
- less noise can help a second model understand the session state faster
- compaction can reduce the amount of irrelevant shell text carried into the next turn

Tradeoffs:

- filtered output has lower fidelity than raw output
- a new model may need details that the previous model did not need
- aggressive filtering can hide formatting, comments, exact stack traces, or low-frequency edge-case details
- model switches are a common time when hidden detail loss becomes more expensive

Practical implication:

- RTK is usually favorable for routine coding flows
- exact re-read or raw-output fallback should remain easy before deep debugging, incident triage, or model handoff
- `compact-only` is a useful compromise when rewriting is not wanted but output volume still needs control

## Source references used for this analysis

- DeepWiki analysis of `rtk-ai/rtk`
- local inspection of this repository and the earlier comparison work
