"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { parseEnvFile, parseEnvString, formatEnvOutput } = require("../dist/env-file.js");

test("parseEnvString() happy path — parses KEY=VALUE lines, strips quotes and comments", () => {
  const content = [
    "# comment line",
    "",
    'NOTION_TOKEN="abc123"',
    "PLAIN_KEY=plain-value",
    "  SPACED_KEY = spaced ",
  ].join("\n");
  const result = parseEnvString(content);
  assert.equal(result.NOTION_TOKEN, "abc123");
  assert.equal(result.PLAIN_KEY, "plain-value");
  assert.equal(result.SPACED_KEY, "spaced");
  assert.equal(result["# comment line"], undefined);
});

test("parseEnvString() edge path — lines without '=' or empty values are skipped", () => {
  const result = parseEnvString("NO_EQUALS_SIGN\nEMPTY_VALUE=\nVALID=1");
  assert.equal(result.NO_EQUALS_SIGN, undefined);
  assert.equal(result.EMPTY_VALUE, undefined);
  assert.equal(result.VALID, "1");
});

test("parseEnvFile() reads a real file from disk (no network access)", () => {
  const tmpFile = path.join(os.tmpdir(), `lib-notion-vault-test-${Date.now()}.env`);
  fs.writeFileSync(tmpFile, "FOO=bar\n");
  try {
    const result = parseEnvFile(tmpFile);
    assert.equal(result.FOO, "bar");
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test("formatEnvOutput() sorts keys alphabetically", () => {
  const out = formatEnvOutput({ B: "2", A: "1" });
  assert.equal(out, "A=1\nB=2\n");
});
