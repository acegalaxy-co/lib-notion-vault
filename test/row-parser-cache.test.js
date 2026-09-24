"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseRow } = require("../dist/row-parser.js");
const { TTLCache } = require("../dist/cache.js");

test("parseRow() happy path — extracts key/value/env/active from Notion page properties", () => {
  const row = {
    properties: {
      Name: { title: [{ plain_text: "MY_KEY" }] },
      value: { rich_text: [{ plain_text: "my-value" }] },
      env: { multi_select: [{ name: "LOCAL" }, { name: "PROD" }] },
      active: { checkbox: true },
      category: { select: { name: "infra" } },
      alias_keys: { rich_text: [{ plain_text: "ALIAS_A, ALIAS_B" }] },
    },
  };
  const parsed = parseRow(row);
  assert.equal(parsed.key, "MY_KEY");
  assert.equal(parsed.value, "my-value");
  assert.deepEqual(parsed.env, ["LOCAL", "PROD"]);
  assert.equal(parsed.active, true);
  assert.equal(parsed.category, "infra");
  assert.deepEqual(parsed.aliases, ["ALIAS_A", "ALIAS_B"]);
  assert.equal(parsed.hasStructured, false);
});

test("parseRow() edge path — missing properties object does not throw, defaults active=true", () => {
  const parsed = parseRow({});
  assert.equal(parsed.key, "");
  assert.equal(parsed.value, "");
  assert.deepEqual(parsed.env, []);
  assert.equal(parsed.active, true);
  assert.deepEqual(parsed.aliases, []);
});

test("TTLCache happy path — set/get returns value within TTL", () => {
  const cache = new TTLCache({ ttlMs: 10_000 });
  cache.set("k", "v");
  assert.equal(cache.get("k"), "v");
  assert.equal(cache.has("k"), true);
});

test("TTLCache edge path — entry expires after TTL and is evicted on read", async () => {
  const cache = new TTLCache({ ttlMs: 1 });
  cache.set("k", "v");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(cache.get("k"), undefined);
  assert.equal(cache.has("k"), false);
  assert.equal(cache.size(), 0);
});
