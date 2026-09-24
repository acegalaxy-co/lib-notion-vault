"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnvFile = parseEnvFile;
exports.parseEnvString = parseEnvString;
exports.formatEnvOutput = formatEnvOutput;
const fs = require("node:fs");
function parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    return parseEnvString(content);
}
function parseEnvString(content) {
    const result = {};
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        const eq = line.indexOf("=");
        if (eq === -1)
            continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key && value)
            result[key] = value;
    }
    return result;
}
/**
 * Format env object into .env-style string for output.
 * Sorts keys alphabetically.
 */
function formatEnvOutput(envMap) {
    const keys = Object.keys(envMap).sort();
    return keys.map((k) => `${k}=${envMap[k]}`).join("\n") + "\n";
}
//# sourceMappingURL=env-file.js.map