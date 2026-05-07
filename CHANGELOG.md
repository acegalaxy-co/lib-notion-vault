# Changelog

All notable changes to `@acegalaxy/notion-vault` will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/acegalaxy-co/ace_commons-notion-vault-nodejs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/acegalaxy-co/ace_commons-notion-vault-nodejs/releases/tag/v0.1.0
