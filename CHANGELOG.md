# Changelog

All notable changes to `@acegalaxy/lib-notion-vault` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-24

### Changed
- Renamed from `@acegalaxy/notion-vault`; private git-dep; npm package deprecated.
- Package is now `"private": true` — install via `github:acegalaxy-co/lib-notion-vault#v0.2.0`, not npm.

## [0.1.0] - 2026-05-07

### Added
- Initial public release.
- `VaultLoader` class — multi-DB query, project/env filtering, alias expansion, TTL cache.
- `VaultLoader.fromBootstrap(...)` — discover project DBs from a bootstrap Notion DB.
- `buildDatabasesFromEnv(envObj, projects, opts)` — derive DB map from env vars.
- `parseEnvFile(path)` — read `.env`-style vault config files.
- TypeScript source with `.d.ts` declarations shipped in `dist/`.
- Zero runtime dependencies (uses native `fetch`, Node 18+).
- MIT license.

### Notes
- Extracted from `@acegalaxy/security-utils/vault-loader` subpath into a standalone package.

[Unreleased]: https://github.com/acegalaxy-co/lib-notion-vault/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/acegalaxy-co/lib-notion-vault/releases/tag/v0.1.0
