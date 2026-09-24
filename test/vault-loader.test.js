"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { VaultLoader, buildDatabasesFromEnv } = require("../dist/index.js");

function fakePage(id, props) {
  return { id, properties: props };
}

function textProp(value) {
  return { rich_text: value ? [{ plain_text: value }] : [] };
}

function titleProp(value) {
  return { title: value ? [{ plain_text: value }] : [] };
}

test("VaultLoader.load() happy path — never hits real Notion API, uses injected fetch mock", async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          results: [
            fakePage("row-1", {
              Name: titleProp("API_KEY"),
              value: textProp("secret-value"),
              env: { multi_select: [{ name: "ALL" }] },
              active: { checkbox: true },
              projects: { multi_select: [{ name: "myproject" }] },
              alias_keys: textProp(""),
            }),
          ],
          has_more: false,
        }),
    };
  };

  try {
    const loader = new VaultLoader({
      token: "fake-token-not-real",
      databases: { myproject: "db-id-123" },
    });
    const secrets = await loader.load({ projects: ["myproject"], env: "LOCAL" });
    assert.equal(secrets.API_KEY, "secret-value");
    assert.ok(calls.length > 0, "expected the injected fetch mock to be invoked");
    assert.ok(
      calls.every((u) => u.startsWith("https://api.notion.com/v1/databases/db-id-123")),
      "should only call the mocked Notion database query endpoint"
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("VaultLoader.load() edge path — DB query failure is caught, logged, and does not throw", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 403,
    text: async () => JSON.stringify({ code: "restricted_resource", message: "denied" }),
  });

  const warnings = [];
  try {
    const loader = new VaultLoader({
      token: "fake-token-not-real",
      databases: { myproject: "db-id-403" },
      logger: { info: () => {}, warn: (msg) => warnings.push(msg), error: () => {} },
    });
    const secrets = await loader.load({});
    assert.deepEqual(secrets, {});
    assert.ok(warnings.length > 0, "expected a warn log for the failed DB query");
    assert.ok(!warnings[0].includes("fake-token-not-real"), "warning must never include the token value");
  } finally {
    global.fetch = originalFetch;
  }
});

test("VaultLoader constructor throws without token or databases", () => {
  assert.throws(() => new VaultLoader({ token: "", databases: { a: "1" } }), /token required/);
  assert.throws(() => new VaultLoader({ token: "t", databases: {} }), /databases map required/);
});

test("buildDatabasesFromEnv() filters NOTION_VAULT_*_DB_ID keys and skips metadata slugs", () => {
  const env = {
    NOTION_VAULT_MYPROJECT_DB_ID: "db-1",
    NOTION_VAULT_SHARED_INFRA_DB_ID: "db-2",
    NOTION_VAULT_OLD_FLAT_DB_ID: "db-3",
    NOTION_VAULT_MYPROJECT_READER_TOKEN_LOCAL: "should-not-appear",
    UNRELATED_KEY: "ignored",
  };
  const dbs = buildDatabasesFromEnv(env, ["myproject"]);
  assert.equal(dbs.myproject, "db-1");
  assert.equal(dbs.shared_infra, "db-2");
  assert.equal(dbs.old_flat, undefined);
  assert.equal(dbs["myproject_reader_token_local"], undefined);
});
