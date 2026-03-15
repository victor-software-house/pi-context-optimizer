# Current implementation and RTK in practice

This document records how the current `pi-context-optimizer` implementation behaves today and shows concrete RTK examples captured from local runs.

It complements `docs/rtk-architecture-prompt-caching-and-model-handoffs.md`.

## Scope

This document covers two related but different layers:

1. **RTK itself** — the external CLI that rewrites commands, runs native tools, and shapes output.
2. **This extension** — the Pi-side integration layer that decides when to route tool calls through RTK and when to compact tool results locally.

The focus here is the **core RTK mechanism in practice**, with enough repository-specific detail to explain how the extension currently uses it.

## Short version

RTK is best understood as a **command proxy plus output shaper**.

In practice, a typical flow looks like this:

1. a shell command is rewritten to an RTK form such as `rtk git status`
2. RTK routes that subcommand to a command-specific implementation
3. RTK runs the underlying native tool
4. RTK captures stdout, stderr, and exit status
5. RTK reshapes the output into a form that is usually easier for an LLM to consume
6. the filtered output, not the original terminal output, is what reaches the model context

The important consequence is this:

- RTK is **not** mainly a "faster shell"
- RTK is mainly a **different presentation layer for command output**
- that often reduces context waste, but not always by reducing raw character count

## How RTK works in practice

### Phase 1: rewrite the command

RTK can expose explicit commands such as `rtk git status`, and it also supports a rewrite step.

Local examples captured with `rtk 0.28.2`:

```text
$ rtk rewrite 'git status --short --branch'
rtk git status --short --branch

$ rtk rewrite 'grep -R computeRewriteDecision src'
rtk grep -R computeRewriteDecision src

$ rtk rewrite 'head -40 src/index.ts'
rtk read src/index.ts --max-lines 40
```

This is the first part of the core mechanism: RTK turns a generic shell command into a command-specific RTK path.

### Phase 2: route to a command-specific implementation

After rewrite, RTK does not treat everything as an opaque passthrough.

Examples:

- `rtk git ...` goes down a Git-aware path
- `rtk grep ...` goes down a search-aware path
- `rtk read ...` goes down a file-reading path
- unsupported or unrecognized shapes can fall back to proxy or passthrough behavior

This matters because the output shaping is usually command-specific.

### Phase 3: execute the real tool

RTK still runs the underlying native tool.

Examples:

- `rtk git status` still depends on `git`
- `rtk grep ...` still performs a real search
- `rtk read ...` still reads the file from disk

The difference is not whether the command executes.

The difference is **what text RTK returns after execution**.

### Phase 4: shape the output before it reaches the model

This is the main RTK behavior that matters for agent workflows.

Common patterns:

- remove noise
- group related lines
- summarize repetitive output
- keep high-signal lines
- omit low-value boilerplate
- preserve enough structure to remain actionable

That is the part that changes model context behavior.

## Concrete RTK examples

The examples below were captured locally with `rtk 0.28.2`.

To keep this repository emoji-free, any icon prefix that RTK printed has been replaced with a bracketed text label such as `[branch]` or `[file]`. The rest of each example is kept structurally equivalent to the real output.

### Example 1: Git status

### Native command

```text
$ git status --short --branch
## main
 M tracked.txt
?? new.txt
```

### RTK command

```text
$ rtk git status
[branch] main
[modified] Modified: 1 files
   tracked.txt
[untracked] Untracked: 1 files
   new.txt
```

### What changed

- raw Git porcelain markers such as `M` and `??` were converted into labeled groups
- the output became more semantic: branch, modified files, untracked files
- RTK returned a structure that is easier to scan, even though it used **more characters** in this tiny example

### Context implication

For an LLM, this output is often easier to reason about because the state is already grouped by meaning.

This is a useful reminder: RTK does **not** always optimize for smallest byte count. It often optimizes for **higher signal density per line**.

### Example 2: Search results

### Native command

```text
$ grep -R -n 'match' src
src/b.ts:1:export const match = 1;
src/b.ts:2:if (match) console.log(match);
src/a.ts:1:const match = true;
src/a.ts:2:function a() { return match; }
src/a.ts:3:console.log(match);
```

### RTK command

```text
$ rtk grep match src
[search] 5 in 2F:

[file] src/a.ts (3):
     1: const match = true;
     2: function a() { return match; }
     3: console.log(match);

[file] src/b.ts (2):
     1: export const match = 1;
     2: if (match) console.log(match);
```

### What changed

- RTK grouped matches by file
- RTK added a short summary header
- RTK reordered the display into file buckets instead of a flat stream

### Context implication

For a model, this grouped form is often more useful than a flat list because it answers these questions immediately:

- how many files matched
- how many hits each file contains
- which file likely matters more

Again, this is not guaranteed to reduce raw character count in very small examples. Its main value is improved structure.

### Example 3: File reads

### Native read-style output

```text
$ sed -n '1,80p' sample.ts
// file header comment
import { something } from "./lib";

/** important docs */
export function keepMe(a: string): string {
  // detail comment
  const value = a.trim();
  return value.toUpperCase();
}

function helper(): void {
  console.log("helper");
}

// trailing comment
export const FLAG = true;
```

### RTK command

```text
$ rtk read sample.ts --max-lines 80
import { something } from "./lib";

/** important docs */
export function keepMe(a: string): string {
  const value = a.trim();
  return value.toUpperCase();
}

function helper(): void {
  console.log("helper");
}

export const FLAG = true;
```

### What changed

- non-doc comments were removed
- imports, signatures, and executable lines were preserved
- the file became shorter without losing the main code path

### Context implication

This is the RTK behavior that most directly affects agent context:

- less comment noise enters the prompt
- the model sees code structure sooner
- exact source fidelity is reduced

That tradeoff is acceptable for orientation and navigation, but it can become unsafe for edit-sensitive workflows.

### Measured size differences from the local runs

These examples were measured from the concrete outputs shown above.

| Command family | Native chars | RTK chars | Direction | Main reason |
|:---|---:|---:|:---|:---|
| `git status` example | 33 | 81 | RTK larger | labels and grouping add structure |
| `grep` example | 180 | 219 | RTK larger | grouped-by-file presentation adds summary lines |
| `read` example | 303 | 240 | RTK smaller | comments were removed |

The practical lesson is simple:

- RTK is often a **context-quality** optimization first
- raw size reduction is common, but not guaranteed on every command

## What RTK changes about context

RTK changes context in **three** practical ways.

| Change | Effect on the model | Typical outcome |
|:---|:---|:---|
| **Normalization** | output becomes more predictable across similar commands | easier scanning, easier repeated use |
| **Grouping** | related lines are clustered by meaning | less time spent inferring structure |
| **Selective omission** | low-value lines disappear before the model sees them | lower noise, but lower fidelity |

This is why RTK can help even when raw character count does not always go down.

A grouped, labeled summary can be more useful than a shorter but less structured raw stream.

## What RTK does to tool calls in this repository

This repository is **not** RTK itself. It is a Pi extension that decides when to use RTK.

In the current implementation:

- only `bash` tool calls are candidates for RTK rewrite
- `read`, `grep`, and `bash` tool results can also be compacted locally by the extension
- that means some context shaping happens in RTK, and some happens in the extension after the tool finishes

## Current Pi-side flow

### 1. `tool_call`

For `bash` tool calls, `src/index.ts` does this:

1. check whether the extension is enabled
2. check whether mode is `rewrite`, `suggest`, or `compact-only`
3. check whether the RTK binary is available when rewrite guarding is enabled
4. call `computeRewriteDecision()`
5. if mode is `rewrite`, replace the command with the rewritten RTK command
6. if mode is `suggest`, keep the original command and show a suggestion
7. if mode is `compact-only`, do not rewrite the command

Concrete examples from the current rule set:

```text
git status                   -> rtk git status
rg TODO src                  -> rtk grep TODO src
head -40 src/index.ts        -> rtk read src/index.ts --max-lines 40
pnpm dlx create-vite@latest  -> rtk proxy pnpm dlx create-vite@latest
```

### 2. `tool_result`

After the tool returns, `src/output-compactor.ts` may still compact the result locally.

That local compaction applies to:

- `bash`
- `read`
- `grep`

So the full context path in this repository can be:

```text
original bash command
-> rewritten to RTK command
-> RTK executes native tool and shapes output
-> Pi receives tool result
-> extension may compact the result further
-> model sees the final text
```

That layering is important.

It means the model may be looking at:

- RTK-shaped output
- extension-shaped output
- or both

## What the current implementation gets right

The current code aligns well with the core RTK mechanism in these areas.

### Clear separation of responsibilities

- RTK is treated as an external binary
- the extension only decides when to route through RTK and when to compact results locally

### Conservative rewrite behavior

The rewrite pipeline in `src/command-rewriter.ts` and `src/rewrite-bypass.ts` is intentionally cautious.

It avoids rewriting shapes that are likely to break parity or hide important structure, including cases such as:

- structured `gh` output with `--json`, `--jq`, or `--template`
- formatting-sensitive `ls` flows
- unsafe compound search/list commands
- interactive container shell sessions without proper flags
- native shell inline execution such as `bash -lc ...`

### Read-fidelity safeguards

The extension preserves exact `read` output when:

- the read specifies `offset` or `limit`
- the read is short enough to stay under the exact-output threshold
- optional exact-preservation for skill reads is enabled

Those rules directly reduce the chance that edit operations fail because the model saw transformed text instead of real file contents.

## What is still only partial or indirect

### Prompt caching

The existing implementation does **not** integrate with provider prompt-caching APIs.

Any caching effect is indirect:

- smaller or more normalized output may change prompt reuse patterns
- but the extension does not create, preserve, or manage cache identity

### Model handoff support

The current code supports handoff safety only indirectly.

What exists today:

- exact-read escape hatches
- a troubleshooting note injected into the system prompt before agent start
- conservative rewrite bypasses

What does **not** exist yet:

- a handoff-aware mode
- automatic "use exact reads before handoff" behavior
- a raw-output replay mechanism
- automatic compaction relaxation before deep debugging

## Current implementation gaps worth knowing

These are useful to document because they affect how the repository behaves today.

### `compact-only` runtime support is ahead of the settings UI

The runtime supports `compact-only` mode, and tests cover it.

However, in `src/config-modal.ts`, the mode-setting logic currently maps:

- `suggest` -> `suggest`
- anything else -> `rewrite`

So the modal does not currently persist `compact-only` correctly.

### Config precedence is still global-only

Planning documents mention future precedence between:

- project-local config
- global config

The current code still uses a single global path:

```text
~/.pi/agent/extensions/pi-context-optimizer/config.json
```

### Lossy versus lossless compaction is only partly surfaced

The code tracks whether lossy techniques were used, but that distinction is not yet exposed as clearly as the planning docs suggest.

## Practical guidance

Use this mental model when reasoning about RTK in this repository:

- **RTK rewrites commands into command-aware subcommands**
- **RTK executes the real tool**
- **RTK returns reshaped output for the model, not a faithful terminal transcript**
- **the extension may compact that output even further before the model sees it**

When fidelity matters more than context savings:

- prefer exact reads
- prefer explicit read ranges
- be cautious around edit-sensitive workflows
- assume grouped or filtered output may have removed details that matter later

## Related files

- `docs/rtk-architecture-prompt-caching-and-model-handoffs.md`
- `src/index.ts`
- `src/command-rewriter.ts`
- `src/rewrite-bypass.ts`
- `src/output-compactor.ts`
- `src/rewrite-rules.ts`

## Evidence used for this document

This document is grounded in:

- local inspection of the current repository implementation
- local command runs with `rtk 0.28.2`
- DeepWiki analysis of `rtk-ai/rtk`
