# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-03-04

### Fixed
- Use absolute GitHub raw URL for README image to fix npm display

## [0.3.1] - 2026-03-04

### Changed
- Rewrote README.md with professional documentation standards
- Added comprehensive feature documentation, configuration reference, and usage examples

## [0.3.0] - 2026-03-02

### Changed
- Renamed extension/package from `rtk-integration` to `pi-rtk-optimizer` to better reflect its full purpose: RTK command rewrite plus tool-output compaction optimization.
- Updated extension identity references across config path resolution, modal UI labeling, installation commands, package metadata, and build check artifact naming.

## [0.2.0] - 2026-03-02

### Changed
- Reorganized extension into a publish-ready package layout:
  - moved implementation modules into `src/`
  - kept root `index.ts` as stable Pi auto-discovery entrypoint
  - added `config/config.example.json` for distributable config starter
- Vendored modal UI dependency as `src/zellij-modal.ts` so the package no longer depends on sibling extension paths.
- Updated TypeScript project includes for the new modular layout.

### Added
- Public repository scaffolding:
  - `README.md`
  - `CHANGELOG.md`
  - `LICENSE`
  - `.gitignore`
  - `.npmignore`
- Distribution metadata in `package.json`:
  - `description`, `keywords`, `files`, `engines`, `publishConfig`, repository links
  - standard `build`, `lint`, `test`, and `check` scripts
- Credits section referencing upstream inspiration projects:
  - `mcowger/pi-rtk`
  - `rtk-ai/rtk`
