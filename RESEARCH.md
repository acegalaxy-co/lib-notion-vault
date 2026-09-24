# lib-notion-vault research — nguồn, phát hiện, hướng cải tiến

Snapshot 2026-09-24. Research đọc git history repo này (2 tag `v0.1.0`/`v0.1.1`
+ working tree đang chuẩn bị `0.2.0`), README/CHANGELOG/SECURITY.md, code
gốc (`index.ts`, `notion-client.ts`, `row-parser.ts`, `cache.ts`,
`env-file.ts`, `test/`), và code/docs liên quan bên repo Nexus (nơi lib này
được tách ra dùng). Facts dưới đây là snapshot tại 1 thời điểm, không phải
live state — re-verify trước khi dùng làm căn cứ quyết định mới.

## Nguồn research

**Nội bộ:**
- Repo này: `git log --oneline --all` → `3083d88` (`feat: initial release
  v0.1.0 — extracted from @acegalaxy/security-utils/vault-loader`, tag
  `v0.1.0`) → `08d81fd` (`chore: bump version to 0.1.1`, tag `v0.1.1`,
  `HEAD`). Working tree hiện có thay đổi chưa commit: rename package
  `@acegalaxy/notion-vault` → `@acegalaxy/lib-notion-vault`, `private: true`,
  `test/` mới (3 file), `dist/` build lại.
- Nexus: `tools/vault-sync/` (CLI wrapper
  `sync-vault.mjs`/`load-vault.mjs` — bọc lib này cho cron/boot script),
  `scripts/sync-vault.sh`, `scripts/vault`, `_vault_/tokens/notion.env`
  (legacy token path), `.claude/rules/common/vault-no-mcp.md` (P0 rule cấm
  MCP cho vault CRUD), memory `project_notion_env_config_mirror.md` (DB
  DB env-config mirror riêng của Nexus — mirror khác, KHÔNG cùng cơ chế bootstrap của lib này,
  nhưng cùng nguyên tắc "curl direct, không MCP").
- `tools/vault-sync/README.md` — lý do tách CLI khỏi library (embeddable
  process vs standalone executable cho cron), per-project independence.

**Ngoài (web, đã fetch xác nhận):**
- Không fetch được ngoài — môi trường sandbox không có WebFetch/WebSearch
  khả dụng trong lần chạy này. Prior-art dưới đây tổng hợp từ kiến thức nền
  (HashiCorp Vault, Doppler, 1Password CLI, dotenv-vault) có ghi rõ là
  không kèm URL verify, không phải nguồn đã fetch.

## Đã tham khảo gì

### Bài toán gốc trong Nexus (vì sao tách lib)

- Nexus cần load secret (API key LLM, token bot Telegram, DB creds...) từ
  Notion database thay vì hardcode/`.env` thuần — vault DB cho phép filter
  theo `project`/`env`, deactivate row không xoá, và tránh secret nằm rải
  rác nhiều file `.env*` per host.
- Ban đầu code sống trong `@acegalaxy/security-utils/vault-loader`
  (subpath của package lớn hơn) — tách riêng thành package độc lập
  `v0.1.0` để dùng được ở nhiều repo (framework, nexus, ...) mà không kéo
  theo toàn bộ `security-utils`.
- `tools/vault-sync/` trong Nexus KHÔNG chứa logic Notion — chỉ là CLI
  mỏng bọc `VaultLoader`/`buildDatabasesFromEnv`/`parseEnvFile` để cron
  (`*/30 * * * *` container-internal) ghi `.env-swe-dev.vault` an toàn
  (atomic write, `chmod 600`, log stderr không giá trị).

### Ý tưởng thiết kế chính

- `VaultLoader` — constructor bắt buộc `token` + `databases` map
  (`{scope: dbId}`), `ttlMs` mặc định 10 phút, `logger` inject được (test
  không log ra console thật).
- `NotionClient` (`notion-client.ts`) — wrapper `fetch` native (Node 18+,
  zero runtime dep), retry 3 lần + `retryDelayMs` 2000ms mặc định, pagination
  qua `next_cursor`/`has_more`, không log giá trị response.
- `TTLCache` (`cache.ts`) — `Map` in-memory đơn giản, mỗi entry có
  `expiresAt`; `load()`/`stats()` gọi lần đầu fetch hết DB rồi cache, gọi
  sau chỉ filter lại rows cached — tránh gọi Notion API lặp lại trong 1
  process lifetime. `invalidateCache()` force refetch.
- `row-parser.ts` — chuẩn hoá 1 Notion page thành `ParsedRow` (`key`,
  `value`, `env[]`, `projects[]`, `aliases[]`, `category`, `active`,
  optional `structured` cho row có nhiều field con).
- Filter `load({projects, env})`: `env` match nếu row chứa env yêu cầu HOẶC
  `ALL`; `projects` match nếu intersect HOẶC row chứa `shared`; `active=false`
  bị skip trừ khi `activeOnly: false`.
- Alias expansion (`alias_keys` field, comma-separated) — inject cả tên key
  cũ lẫn mới vào `process.env` để code cũ đọc key legacy không phải sửa.
- Bootstrap pattern (`VaultLoader.fromBootstrap`) — 1 DB bootstrap chứa
  `reader_token_local/prod` + `dbs_local/prod` per project, để project tự
  discover DB vault của mình lúc runtime thay vì hardcode DB id vào từng
  `.env` — giảm số chỗ phải update khi thêm project mới.
- `env-file.ts` — `parseEnvFile`/`parseEnvString` (đọc file `.env`-style,
  strip quote) + `formatEnvOutput` (sort key, ghi lại dạng `.env`) dùng cho
  cả input (đọc `.env-vault`/`.env-bootstrap`) lẫn output (`sync-vault.mjs`
  ghi `.env-swe-dev.vault`).

### Prior art & vì sao tự viết

- **HashiCorp Vault / Doppler / 1Password CLI / dotenv-vault** — đều là
  secret manager tổng quát, nhưng đòi hỏi thêm hạ tầng (server tự host,
  hoặc SaaS trả phí ngoài Notion) trong khi Notion database đã sẵn có làm
  nơi lưu metadata dự án (KPI, docs...) — dùng luôn Notion tránh thêm 1
  dependency ngoài, và team đã quen thao tác trên Notion UI thay vì CLI
  riêng của secret manager.
- Notion API (REST, `queryDatabase` + pagination) đơn giản đủ dùng cho quy
  mô secret hiện tại (vài chục-vài trăm row); không cần feature nâng cao
  của Vault (dynamic secrets, lease/revoke, audit log chi tiết) mà các
  secret manager chuyên dụng cung cấp.
- **Vì sao KHÔNG qua MCP connector Anthropic** (`vault-no-mcp.md`, P0):
  MCP Notion connector của Claude.ai route request qua backend Anthropic —
  row name + value (kể cả masked) có thể vào log/training data. Vault CRUD
  phải cô lập khỏi mọi infra ngoài "Notion API direct + máy local" — đây
  là lý do `NotionClient` trong lib này tự implement `fetch` trực tiếp tới
  `api.notion.com` bằng reader token thay vì gọi qua bất kỳ MCP layer nào.
  Nguyên tắc này áp cả cho DB env-config mirror riêng của Nexus (mirror khác, dùng script
  Node/curl trực tiếp, không MCP) dù DB đó private.
- Zero runtime dependency (chỉ dùng `fetch` native Node 18+) là quyết định
  có chủ đích — giảm supply-chain surface cho code động vào secret path.

## Hướng cải tiến

**Đã áp dụng:**
- Rename `@acegalaxy/notion-vault` → `@acegalaxy/lib-notion-vault`, đổi
  `private: true`, cài qua `github:acegalaxy-co/lib-notion-vault#v0.2.0`
  thay vì npm registry (CHANGELOG `[0.2.0] - 2026-09-24`, working tree).
- Chuyển sang private git-dep — README ghi rõ "npm package deprecated",
  đồng bộ pattern chung của các lib nội bộ khác (giảm bề mặt public trên
  npm registry cho code chạm tới secret loading).
- Test suite mới `test/` (`env-file.test.js`, `row-parser-cache.test.js`,
  `vault-loader.test.js`, 198 dòng tổng) — trước đó `v0.1.0`/`v0.1.1`
  không có test nào trong git history; test hiện tại mock `global.fetch`,
  không bao giờ gọi Notion thật.
- Bootstrap pattern (`fromBootstrap`) đã ship từ `v0.1.0`, đang là default
  path trong `tools/vault-sync/bin/load-vault.mjs` phía Nexus (Phase 12),
  legacy DB-IDs-in-env chỉ còn auto-detect fallback khi thiếu
  `NOTION_VAULT_BOOTSTRAP_TOKEN`.

**Deferred / chưa implement (gaps thật thấy trong code):**
- Không có CI (`.github/` chỉ có template issue/PR, không thấy workflow
  chạy `npm test`/`tsc` tự động) — test suite mới tồn tại nhưng chưa được
  gate bằng pipeline, dễ regress âm thầm khi merge.
- `TTLCache` là in-memory `Map` đơn tiến trình — không share cache giữa
  nhiều process/container cùng host (mỗi process tự fetch lại khi TTL hết),
  chưa có option cache ra file/Redis cho multi-instance deploy.
- `NotionClient.request` retry cố định 3 lần/2000ms, không phân biệt lỗi
  retryable (rate limit 429, network) với lỗi không nên retry (401/403
  token sai) — retry mù có thể kéo dài thời gian fail khi token thật sự
  invalid.
- Không có cơ chế xoay vòng/rotate token tự động hay cảnh báo token sắp
  hết hạn (khác với OAuth token Gmail trong Nexus đã có memory riêng theo
  dõi TTL) — `NotionClient` chỉ fail cứng khi token invalid.
- `row-parser.ts` giả định schema field cố định (`Name`, `value`, `env`,
  `projects`, `active`, `alias_keys`) — đổi schema Notion DB (đổi tên
  cột) sẽ silent-fail (field rỗng) thay vì báo lỗi rõ ràng ngay khi parse.
- Chưa có `.d.ts`/typecheck strict verify trong `pretest` ngoài
  `npm run build` (tsc) — lỗi type có thể chỉ lộ ra khi build, không có
  lint riêng.
