# ROADMAP

## Immediate sequence

1. Complete strict typing and remove as much shimmed typing as possible.
2. Finish the rename and documentation cleanup around `pi-context-optimizer`, including the move to `/Users/victor/workspace/victor/pi-context-optimizer`.
3. Improve persistence, edit safety, and compaction controls.
4. RTK architecture, prompt caching, and model handoff tradeoffs are documented in `docs/rtk-architecture-prompt-caching-and-model-handoffs.md`.
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
- Add issue templates.
- Maintain the automated release pipeline (`release-please` plus tag-driven npm trusted publishing) as the project evolves.
