# Hardening Plan: pi-rtk-internal

This document outlines the steps to adapt and harden the forked `pi-rtk-optimizer` for internal use at `victor-software-house`.

## Phase 1: Initial Hardening & Hygiene

1.  **Fix Typecheck Failure:**
    -   [x] Investigate and fix the `TS2339: Property 'cwd' does not exist` error in `src/output-compactor.ts`.
    -   [ ] Audit `src/types-shims.d.ts` for other incomplete or inaccurate type definitions.
    -   [ ] Enable `"strict": true` in `tsconfig.json` and fix any new errors.

2.  **Repackage for Internal Namespace:**
    -   [ ] Rename the package in `package.json` to `@victor-software-house/pi-rtk-internal`.
    -   [ ] Update `README.md` and `CHANGELOG.md` to reflect the new name and internal ownership.
    -   [ ] Update any internal string constants that refer to the old name.

3.  **Establish CI/CD:**
    -   [ ] Create a GitHub Actions workflow (`.github/workflows/ci.yml`).
    -   [ ] The workflow should run `npm install` and `npm run check` (or equivalent) on every push to `main` and on all pull requests.
    -   [ ] Ensure the `check` script is comprehensive (lint, typecheck, test).

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
