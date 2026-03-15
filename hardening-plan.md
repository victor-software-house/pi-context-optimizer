# Hardening Plan: pi-context-optimizer

This document outlines the steps to adapt and harden the original `pi-rtk-optimizer` codebase into `pi-context-optimizer` for `victor-software-house`.

## Immediate private maintenance sequence

1. Complete strict typing and remaining shim cleanup.
2. Finish internal renaming and documentation cleanup.
3. Improve persistence, edit safety, and compaction controls.
4. Separate the project from fork-based maintenance.
5. Check the original source repository, compare it with the intermediate fork, and if needed create a separate fresh fork of the original source for a full fix implementation path. Abandoned. We do not care about this path anymore.

## Phase 1: Initial Hardening & Hygiene

1.  **Fix Typecheck Failure:**
    -   [x] Investigate and fix the `TS2339: Property 'cwd' does not exist` error in `src/output-compactor.ts`.
    -   [ ] Audit `src/types-shims.d.ts` for other incomplete or inaccurate type definitions.
    -   [x] Enable `"strict": true` in `tsconfig.json` and fix the resulting errors.

2.  **Repackage for Internal Namespace:**
    -   [x] Rename the package in `package.json` to `@victor-software-house/pi-context-optimizer`.
    -   [ ] Update `README.md` and `CHANGELOG.md` to fully reflect the new name and internal ownership.
    -   [x] Update internal string constants that refer to the old extension directory name.

3.  **Establish CI/CD:**
    -   [x] Create a GitHub Actions workflow (`.github/workflows/ci.yml`).
    -   [x] Run typecheck, tests, and bundle verification in CI.
    -   [x] Ensure the local verification path is comprehensive enough for current hardening work.

## Phase 2: Feature & Safety Enhancements

1.  **Persistent Configuration:**
    -   [ ] Modify the settings modal and `/rtk` subcommands to write configuration changes back to `config.json`.
    -   [ ] Establish clear precedence: project-local config (`.pi/extensions/...`) overrides global config (`~/.pi/agent/...`).

2.  **Improve Edit-Safety:**
    -   [ ] Implement a mechanism to automatically detect likely `edit` workflows.
    -   [ ] When an `edit` tool call fails with a "text does not match" error, automatically disable read compaction for a short period and notify the user/model.

3.  **Refine Compaction & Modes:**
    -   [ ] Introduce a `compact-only` mode that provides value even if the `rtk` binary is not installed.
    -   [ ] Clearly label compaction techniques as "lossless" vs. "lossy" in the UI and configuration.
    -   [ ] Make conservative source filtering the default (`"minimal"` or even `"none"`).

## Phase 3: Long-Term Maintainability

1.  **Session-Persistent Metrics:**
    -   [ ] Refactor `output-metrics.ts` to store metrics in the pi session log via `pi.appendEntry()` or in tool result `details`. This will make metrics survive restarts and forks.

2.  **Comprehensive Test Matrix:**
    -   [ ] Expand tests to cover a compatibility matrix: macOS, Linux, and Windows.
    -   [ ] Add specific tests for shell piping, structured JSON output (`gh --json`), and interactive shell bypasses.

3.  **Release Automation:**
    -   [ ] Implement `release-please` or a similar tool for automated changelog generation and version bumping.
    -   [ ] Create GitHub issue templates for bug reports, especially for command rewrite parity regressions.

## Phase 4: Repository Independence and Upstream Validation

1.  **De-fork and Rename:**
    -   [ ] Create a new private standalone repository instead of continuing on a GitHub fork.
    -   [ ] Rename the repository, package, and extension identifiers to a durable internal name.
    -   [ ] Push the current hardened history into the new standalone repository and retire the fork-based repo.

2.  **Check the Original Source Repository:**
    -   [ ] Inspect the original source repository behind the current fork chain.
    -   [ ] Compare the current internal branch against both the original source and the intermediate fork to identify partial fixes versus missing fixes.
    -   [ ] If useful, create a separate fresh fork of the original source repository for forensic comparison and potential clean-room backporting of the full fix set.
