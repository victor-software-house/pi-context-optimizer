# RTK optimization history and replay plan

## Purpose

This document describes how the extension can close the current gap around RTK optimization history.

Today, the extension can rewrite commands and compact tool output, but it does not keep a durable, replayable before-and-after record of those optimizations. The goal of this plan is to add bounded history, recovery, and operator inspection without turning the extension into an unbounded transcript recorder.

## Current gaps

### Rewrite history is transient

Current behavior:

- `tool_call` computes `originalCommand` and `rewrittenCommand`
- the extension may show a UI notice such as `RTK rewrite: ... -> ...`
- the rewrite pair is not persisted

Implications:

- operators cannot inspect recent rewrite decisions after the fact
- there is no durable audit trail for parity regressions
- there is no reliable way to explain why a command was changed in an earlier turn

### Compaction stores metadata, not payloads

Current behavior:

- `tool_result` can compact `bash`, `read`, and `grep` output
- compaction metadata is added to tool result `details`
- the extension records counts such as original versus compacted characters and lines
- full `originalText` and `compactedText` are discarded

Implications:

- there is no raw-output replay path
- there is no before-and-after inspection for one specific tool result
- handoff and deep-debug workflows cannot recover the exact pre-compaction text from extension-managed storage

### Metrics are in-memory only

Current behavior:

- `src/output-metrics.ts` stores savings metrics in memory only
- metrics disappear after restart or reload

Implications:

- `/rtk stats` reflects only the current process lifetime
- history does not survive restart, reload, or session movement in a robust way

### There is no recovery UX

Current behavior:

- there is no `/rtk history`
- there is no `/rtk replay`
- there is no `/rtk diff`
- there is no explicit policy control for when snapshots should be stored

Implications:

- operators cannot inspect or recover optimization history even if storage is added later
- edit-sensitive and handoff-sensitive workflows still depend on manual re-reading

## Design goals

The implementation should satisfy these goals:

1. keep the default behavior conservative
2. preserve branch-local state where the state belongs to one tool result lineage
3. persist session-level summaries across restart without sending them to the model
4. make replay opt-in or tightly bounded by policy
5. avoid breaking tool execution if history persistence fails
6. expose operator controls through the existing `/rtk` command family

## Non-goals

This plan does not aim to:

- store the full raw output of every tool call by default
- replace Pi's own session transcript with a second unbounded transcript store
- depend on brittle in-memory correlation between parallel tool calls and results

## Recommended state model

Use two persistence layers with different responsibilities.

### Branch-local per-result state: tool result `details`

Use tool result `details` for data that should follow the conversation branch.

Recommended contents:

- compaction metadata
- optional bounded before-and-after snapshots
- rewrite metadata only if a reliable correlation key exists

Why this layer fits:

- it follows the tool result that it describes
- it is branch-local by design
- it is the right place for replayable per-call metadata

### Session-level journal and aggregates: `pi.appendEntry()`

Use `pi.appendEntry()` for data that should persist in the session but should not be sent to the model.

Recommended contents:

- recent optimization event summaries
- persistent aggregate metrics
- bounded index data for `/rtk history`

Why this layer fits:

- it survives restart and reload better than in-memory state
- it is appropriate for extension control state and non-LLM metadata
- it keeps aggregate reporting separate from per-result payload storage

## Proposed data model

### Rewrite record

Store a durable summary of each rewrite or suggestion decision.

```ts
interface RewriteRecord {
  timestamp: string;
  mode: "rewrite" | "suggest";
  applied: boolean;
  originalCommand: string;
  rewrittenCommand: string;
  ruleId?: string;
  bypassReason?: string;
}
```

Use cases:

- explain rewrite behavior after the fact
- inspect recent rewrite decisions
- diagnose parity regressions

### Compaction record

Extend the existing metadata into a durable record format.

```ts
interface CompactionRecord {
  timestamp: string;
  tool: "bash" | "read" | "grep";
  applied: boolean;
  techniques: string[];
  lossy: boolean;
  originalCharCount: number;
  compactedCharCount: number;
  originalLineCount: number;
  compactedLineCount: number;
  snapshotPolicy: "none" | "lossy-only" | "always" | "failure-only";
  snapshotRef?: string;
}
```

Use cases:

- show what changed for one tool result
- distinguish lossless compaction from lossy compaction
- tell the operator whether replay is available

### Optional snapshot payload

Store bounded before-and-after content only when policy allows it.

```ts
interface CompactionSnapshot {
  id: string;
  timestamp: string;
  tool: string;
  inputSummary: string;
  beforeText?: string;
  afterText?: string;
  beforeTruncated: boolean;
  afterTruncated: boolean;
  maxStoredChars: number;
  redactionsApplied: string[];
}
```

Important constraints:

- snapshots must be bounded
- snapshots must be configurable
- even stored snapshots may need truncation
- persistence failures must never break the tool path

## Storage policy

The default policy should be conservative.

Recommended defaults:

- store rewrite metadata
- store compaction metadata
- store snapshots only for lossy compactions
- cap each stored side to a small bound such as 8-16 KB
- retain only the most recent 50-100 optimization events
- keep replay off for most `read` results unless they are small and policy explicitly allows storage

This gives the operator useful inspection and recovery without silently creating a large archive.

## Configuration additions

Add a dedicated history section to the extension config.

Suggested fields:

```ts
history: {
  enabled: boolean;
  maxEntries: number;
  persistAcrossRestarts: boolean;
  storeRewriteMetadata: boolean;
  storeCompactionMetadata: boolean;
  snapshotPolicy: "none" | "lossy-only" | "always" | "failure-only";
  maxSnapshotChars: number;
  redactSecrets: boolean;
  storeReadSnapshots: boolean;
  storeBashSnapshots: boolean;
  storeGrepSnapshots: boolean;
}
```

Notes:

- `snapshotPolicy` controls when payload storage is attempted
- per-tool switches help keep edit-sensitive reads conservative
- normalization should clamp numeric limits and reject unknown policy values

## Operator UX plan

Expose this through the existing `/rtk` command family.

### `/rtk history`

Show recent optimization events with:

- timestamp
- tool
- rewrite applied or suggested
- techniques
- lossy or lossless status
- snapshot availability

### `/rtk history show <index>`

Show one event in more detail:

- original command
- rewritten command
- counts before and after compaction
- techniques used
- whether replay is available

### `/rtk replay <index>`

Show the stored raw snapshot when one exists.

If no snapshot exists, explain whether:

- policy disabled storage
- the event was metadata-only
- retention removed the snapshot

### `/rtk diff <index>`

Show a compact before-and-after comparison:

- command diff for rewrites
- line and character deltas for compaction
- optional text preview diff when snapshots exist

### `/rtk clear-history`

Delete stored optimization history and reset the retained journal.

### `/rtk history-policy`

Print the active retention and snapshot policy.

## Phased implementation

### Phase 1: persist metadata only

Scope:

- no full payload storage yet
- no replay yet
- make current transient metadata durable first

Tasks:

1. add durable rewrite records for applied rewrites and suggestions
2. expand compaction metadata to include timestamp and explicit lossy/lossless semantics
3. persist recent event summaries and aggregate counters through `pi.appendEntry()`
4. add `/rtk history` and `/rtk history show`

Design constraint:

- do not assume a brittle in-memory queue can correlate `tool_call` and `tool_result` under parallel execution

If Pi exposes a stable tool invocation identifier, use it. If not, keep rewrite history and result history as separate streams until a reliable correlation key exists.

### Phase 2: add bounded snapshots for lossy cases

Scope:

- introduce optional before-and-after storage
- default to `lossy-only`

Tasks:

1. add history and snapshot config fields
2. store bounded `beforeText` and `afterText` when the policy allows it
3. mark whether stored snapshots were truncated further for retention purposes
4. persist a snapshot reference into result metadata and the session journal
5. add `/rtk replay <index>`

Guardrails:

- enforce size caps
- skip obviously binary-like content
- redact secrets when enabled
- keep `read` snapshots more conservative than `bash` snapshots

### Phase 3: add diff and recovery UX

Scope:

- make stored history operationally useful

Tasks:

1. add `/rtk diff <index>`
2. present concise command rewrite diffs
3. present concise before-and-after output summaries
4. expose clear user messaging when replay is or is not available

### Phase 4: persist metrics properly

Scope:

- move beyond process-local savings counters

Tasks:

1. keep the in-memory accumulator for low-latency summaries during the current process
2. mirror aggregate updates into a session-persistent journal entry
3. restore aggregate metrics on `session_start` and related reload-safe events
4. update `/rtk stats` to use restored data, not only live in-memory data

Suggested aggregates:

- total compacted calls
- total characters saved
- per-tool counts
- per-technique counts
- lossy versus lossless counts
- snapshots stored versus skipped

### Phase 5: add edit and handoff recovery helpers

Scope:

- reduce friction when earlier compaction caused later recovery needs

Tasks:

1. detect recent lossy `read` compaction before likely edit retries
2. guide the operator toward exact reads or temporarily relaxed filtering
3. add temporary policy overrides for deep-debug or handoff workflows

Examples:

- temporarily switch snapshots to `always`
- temporarily prefer exact reads
- temporarily relax source filtering

## Correlation strategy for rewrites

This is the highest-risk implementation detail.

### Preferred approach

Use a stable tool invocation identifier if Pi exposes one in both `tool_call` and `tool_result` payloads.

Advantages:

- exact rewrite-to-result correlation
- safe under repeated identical commands
- safe under parallel execution

### Fallback approach

If no stable identifier exists:

- persist rewrite history immediately at `tool_call` time
- persist compaction history separately at `tool_result` time
- do not pretend the two streams are perfectly correlated in the first implementation

This is better than building a heuristic that may break under parallel tool execution.

## Privacy and safety rules

Before payload storage is enabled, define explicit safety rules.

### Redaction

Support best-effort redaction for common sensitive shapes such as:

- bearer tokens
- API keys
- `Authorization:` headers
- common `.env` assignments
- SSH private key markers

### Read sensitivity

Do not default to snapshotting long source reads.

Recommended default:

- `read` snapshots disabled except for explicitly allowed small lossy cases
- exact range reads remain unsnapshotted by default

### Failure handling

If persistence fails:

- keep the raw tool path or compacted tool path working as usual
- emit one warning at most
- degrade gracefully to metadata-free behavior if needed

## Validation plan

### Unit tests

Add tests for:

- metadata persistence and restoration
- snapshot policy selection
- lossy-only storage behavior
- retention trimming
- redaction
- restored metrics after reload or restart
- `/rtk history` formatting
- `/rtk replay` behavior when snapshots are missing

### Scenario tests

Add scenario coverage for:

1. a rewritten `bash` command creating a durable rewrite record
2. a lossy compaction storing replayable snapshots when policy allows it
3. a lossless compaction storing metadata without payloads under `lossy-only`
4. restart restoring aggregate metrics
5. branch or fork movement preserving branch-local tool result metadata semantics

### Manual validation

Recommended checks:

1. run a rewritten command such as `git status`
2. run a compacted `read`
3. inspect `/rtk history`
4. inspect `/rtk history show <index>`
5. inspect `/rtk replay <index>` when replay is enabled
6. restart Pi and verify `/rtk stats` still shows prior totals
7. switch or fork sessions and verify branch-local metadata remains coherent

## Suggested file-level work

Likely files to change:

- `src/index.ts`
- `src/output-compactor.ts`
- `src/output-metrics.ts`
- `src/config-store.ts`
- `src/config-modal.ts`

Likely new files:

- `src/history-store.ts`
- `src/history-types.ts`
- `src/history-format.ts`

## Acceptance criteria

This plan is complete when all of the following are true:

- recent rewrites can be inspected after restart
- recent compactions show lossy versus lossless status clearly
- replayable snapshots exist when policy allows storage
- `/rtk history` and `/rtk replay` work predictably
- metrics survive restart
- retention caps are enforced
- history persistence failures do not break tool execution
- documentation explains the storage model and tradeoffs clearly

## Recommended rollout order

Use this order to deliver value while keeping risk controlled:

1. persist rewrite and compaction metadata
2. persist aggregate metrics across restart
3. add `/rtk history`
4. add lossy-only bounded snapshots
5. add `/rtk replay`
6. add edit and handoff recovery helpers

This order gives operators useful inspection first and defers the riskiest replay details until the metadata and persistence model are established.
