# @acegalaxy/lib-notion-vault

Private git-dep. MIT licensed — see [LICENSE](LICENSE).

**Library only.** Load secrets from Notion vault databases into `process.env`.

Supports multi-DB query, project/env filtering, alias expansion (backward compat for legacy key prefixes), in-memory TTL cache, and a bootstrap row pattern for self-describing project metadata.

Zero runtime dependencies — uses native `fetch` (Node 18+).

## Install

```bash
npm install "@acegalaxy/lib-notion-vault@github:acegalaxy-co/lib-notion-vault#v0.2.0"
```

## Setup

Create one or more Notion databases to store your secrets (one DB per project / scope is recommended). Each DB ID + reader integration token is configured via env vars in your local vault config file (e.g. `.env-vault` — git-ignored, chmod 600):

```
# Reader tokens — one per project + per host (LOCAL/PROD)
NOTION_VAULT_<PROJECT>_READER_TOKEN_LOCAL=<notion-token>
NOTION_VAULT_<PROJECT>_READER_TOKEN_PROD=<notion-token>

# DB IDs — one per scope (per-project recommended for least-privilege)
NOTION_VAULT_<PROJECT>_DB_ID=<notion-db-id>
NOTION_VAULT_SHARED_INFRA_DB_ID=<notion-db-id>
NOTION_VAULT_BOTS_WRITE_DB_ID=<notion-db-id>
NOTION_VAULT_SHARED_CONFIG_DB_ID=...
```

## Library usage

```js
const { VaultLoader, buildDatabasesFromEnv } = require('@acegalaxy/lib-notion-vault');
const { parseEnvFile } = require('@acegalaxy/lib-notion-vault/env-file');

const envFile = parseEnvFile('/path/to/.env-vault');
const loader = new VaultLoader({
  token: envFile.NOTION_VAULT_MYPROJECT_READER_TOKEN_LOCAL,
  databases: buildDatabasesFromEnv(envFile),
  ttlMs: 10 * 60 * 1000, // 10 min
});

const secrets = await loader.load({
  projects: ['myproject', 'shared'],
  env: process.env.NODE_ENV === 'production' ? 'PROD' : 'LOCAL',
  injectAliases: true,
});
Object.assign(process.env, secrets);
```

## Bootstrap pattern

Instead of hardcoding DB IDs in env files, you can store project metadata in a single bootstrap Notion DB and let projects discover their own vault DBs at startup:

```js
const loader = await VaultLoader.fromBootstrap({
  bootstrapToken: process.env.BOOTSTRAP_TOKEN,
  bootstrapDbId: process.env.BOOTSTRAP_DB_ID,
  project: 'myproject',
  env: 'LOCAL',
});
const secrets = await loader.load({ projects: ['myproject'], env: 'LOCAL' });
```

## How filters work

Each row in a vault DB has:

- `env` — multi-select: `PROD`, `LOCAL`, `DEV`, `ALL`
- `project` (or `projects` for shared resources) — which projects use this key
- `category` — `llm`, `notion`, `git`, `infra`, etc.
- `active` — checkbox (rows can be deactivated without deletion)

When you call `load({ projects, env })`:

- `env`: row matches if `row.env` contains the requested env, OR contains `ALL`.
- `projects`: row matches if `row.projects` intersects, OR contains `shared` (which applies to any project).
- `active=false` rows are skipped by default (set `activeOnly: false` to include).

## Alias expansion

A `alias_keys` field on a row lists historical names (e.g. `FW_OPENAI_API_KEY, NEXUS_OPENAI_API_KEY`) so existing code reading old keys keeps working.

Disable with `injectAliases: false` if you only want canonical names.

## Caching

The first call to `load()` or `stats()` queries all DBs once and caches rows for 10 minutes (configurable). Subsequent calls re-filter cached rows without API calls. Call `invalidateCache()` to force a refetch.

## Security notes

- The library never logs secret values. `[info]` lines only show counts.
- Use `stats()` to inspect what's in the vault without exposing values.
- Reader tokens come from your vault config file which MUST be git-ignored and chmod 600.
- Use the per-project least-privilege pattern: one Notion integration per project, scoped only to that project's DB.

## License

MIT © ACE Galaxy
