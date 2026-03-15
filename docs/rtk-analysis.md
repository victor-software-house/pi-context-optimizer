# RTK analysis

This document describes how RTK works, what implementation model it uses, and what tradeoffs it introduces for Pi-based agent workflows.

## Summary

RTK is a compiled CLI proxy implemented in Rust. It sits in front of ordinary shell commands, rewrites supported commands to RTK-aware equivalents, executes the underlying real command, and filters the output before that output reaches the LLM context.

For this project, RTK matters in two ways:

- command rewriting through `rtk rewrite`
- downstream context shaping through filtered command output

## Implementation model

### Language and runtime

- RTK is implemented in Rust.
- It is distributed as a standalone binary.
- It is designed to be fast, self-contained, and suitable for repeated CLI invocation.

### High-level execution flow

1. A caller invokes `rtk rewrite <command>` or otherwise routes execution through RTK.
2. RTK checks whether the command has a supported RTK-aware path.
3. RTK routes the command to a command-specific implementation.
4. RTK executes the underlying real command.
5. RTK captures stdout, stderr, and exit status.
6. RTK applies output filtering, grouping, truncation, deduplication, or fallback logic.
7. RTK returns filtered output while trying to preserve the real command's exit behavior.

### Practical meaning for Pi extensions

In Pi-oriented workflows, RTK is not the extension itself. It is an external execution and filtering layer. The extension decides whether to:

- rewrite commands through RTK
- suggest RTK usage without rewriting
- keep output compaction enabled even when rewriting is off

## What RTK changes

RTK changes the command output that reaches the model.

This usually means:

- fewer tokens
- less terminal noise
- more normalized shell output
- lower context pressure in long sessions

This can be useful for:

- repetitive build/test cycles
- large search results
- verbose git commands
- noisy linter and compiler output

## Prompt caching impact

## Direct impact

RTK does **not** directly control prompt caching in model providers or client SDKs.

It does not:

- create or manage provider cache keys
- preserve cache identity across providers
- guarantee cache hits across model switches
- interact with Anthropic or OpenAI prompt caching APIs directly

## Indirect impact

RTK can affect prompt caching indirectly because it changes the prompt content.

Possible indirect effects:

- smaller command outputs can reduce cache write size
- smaller command outputs can reduce cache read size
- more normalized outputs can sometimes improve cache reuse for repeated workflows

Possible downsides:

- filtered output may differ enough from raw output that cache reuse patterns shift
- if filtering strategy changes over time, cache stability for repeated prompts can also change

The important distinction is that RTK changes the text, not the cache system.

## Mid-session model switching and handoff tradeoffs

## Benefits

When command outputs are filtered before entering the session context:

- switching to another model can be cheaper because less command output is carried forward
- the next model may find the session easier to read because noise has been reduced
- long-running sessions can retain more useful information in the same context budget

## Tradeoffs

The tradeoff is reduced fidelity.

Filtered output may hide details that a later model needs, such as:

- exact formatting
- comments
- full stack traces
- low-frequency diagnostic lines
- small output differences that matter during debugging

This matters most when:

- switching models mid-session
- handing work from one model to another with different strengths
- moving from routine implementation work to deep debugging
- revisiting earlier outputs after aggressive filtering was applied

## Practical guidance for this repository

For `pi-context-optimizer`, the main implications are:

- `rewrite` mode is usually good for routine coding flows
- `suggest` mode is safer when you want visibility without command mutation
- `compact-only` mode is useful when rewriting is undesirable but output volume still needs control
- exact re-read or raw-output fallback should remain easy before deep debugging or model handoff

## Design recommendations

Based on RTK's behavior, this project should continue to prioritize:

1. clear signaling of lossy versus lossless compaction
2. easy escape hatches for exact reads and raw output
3. conservative behavior around edit-sensitive workflows
4. explicit operational guidance before model handoff or deep-debug phases

## Sources

This analysis is based on:

- DeepWiki analysis of `rtk-ai/rtk`
- local inspection of this repository and related comparison work
