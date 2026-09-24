"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultLoader = void 0;
exports.buildDatabasesFromEnv = buildDatabasesFromEnv;
const { NotionClient } = require("./notion-client");
const { parseRow } = require("./row-parser");
const { TTLCache } = require("./cache");
class VaultLoader {
    client;
    databases;
    cache;
    logger;
    constructor({ token, databases, ttlMs = 10 * 60 * 1000, logger = console }) {
        if (!token)
            throw new Error("VaultLoader: token required");
        if (!databases || Object.keys(databases).length === 0) {
            throw new Error("VaultLoader: databases map required");
        }
        this.client = new NotionClient({ token });
        this.databases = databases;
        this.cache = new TTLCache({ ttlMs });
        this.logger = logger;
    }
    async fetchAllRows() {
        const cached = this.cache.get("__all_rows__");
        if (cached)
            return cached;
        const allRows = [];
        for (const [slug, dbId] of Object.entries(this.databases)) {
            try {
                const rows = await this.client.queryDatabase(dbId);
                for (const r of rows) {
                    const parsed = parseRow(r);
                    parsed._db = slug;
                    allRows.push(parsed);
                }
            }
            catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                this.logger.warn(`[vault-loader] failed to query DB ${slug}: ${message}`);
            }
        }
        this.cache.set("__all_rows__", allRows);
        this.logger.info(`[vault-loader] loaded ${allRows.length} rows from ${Object.keys(this.databases).length} DBs`);
        return allRows;
    }
    async load({ projects = [], env, injectAliases = true, activeOnly = true } = {}) {
        const rows = await this.fetchAllRows();
        const out = {};
        for (const row of rows) {
            if (!row.key)
                continue;
            if (!row.value && !row.hasStructured)
                continue;
            if (activeOnly && !row.active)
                continue;
            if (env) {
                const matchesEnv = row.env.includes("ALL") || row.env.includes(env);
                if (!matchesEnv)
                    continue;
            }
            if (projects.length > 0) {
                const rowProjects = row.projects || [];
                const isShared = rowProjects.includes("shared");
                const intersects = isShared || rowProjects.some((p) => projects.includes(p));
                if (!intersects)
                    continue;
            }
            if (row.value)
                out[row.key] = row.value;
            if (injectAliases && row.aliases.length > 0) {
                for (const alias of row.aliases) {
                    out[alias] = row.value;
                }
            }
            if (row.hasStructured) {
                const map = { host: "HOST", port: "PORT", user: "USER", target_alias: "TARGET" };
                for (const [col, suffix] of Object.entries(map)) {
                    const v = row.structured?.[col];
                    if (v)
                        out[`${row.key}_${suffix}`] = v;
                }
            }
        }
        return out;
    }
    async get(key, filter = {}) {
        const env = await this.load(filter);
        return env[key];
    }
    async stats({ projects = [], env, activeOnly = true } = {}) {
        const rows = await this.fetchAllRows();
        const visibleRows = rows.filter((row) => {
            if (activeOnly && !row.active)
                return false;
            if (env) {
                const matches = row.env.includes("ALL") || row.env.includes(env);
                if (!matches)
                    return false;
            }
            if (projects.length > 0) {
                const rp = row.projects || [];
                const shared = rp.includes("shared");
                const intersects = shared || rp.some((p) => projects.includes(p));
                if (!intersects)
                    return false;
            }
            return true;
        });
        const byDb = {};
        const byCategory = {};
        let totalAliases = 0;
        for (const r of visibleRows) {
            byDb[r._db || ""] = (byDb[r._db || ""] || 0) + 1;
            if (r.category)
                byCategory[r.category] = (byCategory[r.category] || 0) + 1;
            totalAliases += r.aliases.length;
        }
        return {
            totalRows: visibleRows.length,
            totalAliases,
            injectedKeys: visibleRows.length + totalAliases,
            byDb,
            byCategory,
        };
    }
    invalidateCache() {
        this.cache.clear();
    }
    static async fromBootstrap({ bootstrapToken, bootstrapDbId, project, env, ttlMs, logger = console }) {
        if (!bootstrapToken)
            throw new Error("fromBootstrap: bootstrapToken required");
        if (!bootstrapDbId)
            throw new Error("fromBootstrap: bootstrapDbId required");
        if (!project)
            throw new Error("fromBootstrap: project required");
        if (!env)
            throw new Error("fromBootstrap: env required");
        const envUpper = String(env).toUpperCase();
        if (envUpper !== "LOCAL" && envUpper !== "PROD") {
            throw new Error(`fromBootstrap: env must be 'LOCAL' or 'PROD', got '${env}'`);
        }
        const tokenField = envUpper === "LOCAL" ? "reader_token_local" : "reader_token_prod";
        const dbsField = envUpper === "LOCAL" ? "dbs_local" : "dbs_prod";
        const client = new NotionClient({ token: bootstrapToken });
        const rawRows = await client.queryDatabase(bootstrapDbId);
        const rows = rawRows.map(parseBootstrapRow).filter((r) => r.active !== false);
        const projectRow = rows.find((r) => r.name === project);
        if (!projectRow) {
            throw new Error(`fromBootstrap: project '${project}' not found in bootstrap DB`);
        }
        const projectToken = projectRow[tokenField];
        if (!projectToken) {
            throw new Error(`fromBootstrap: row '${project}' missing ${tokenField}`);
        }
        let projectDbs;
        try {
            projectDbs = projectRow[dbsField] ? JSON.parse(projectRow[dbsField]) : {};
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new Error(`fromBootstrap: row '${project}' ${dbsField} not valid JSON: ${message}`);
        }
        if (!projectDbs || typeof projectDbs !== "object") {
            throw new Error(`fromBootstrap: row '${project}' ${dbsField} must be a JSON object`);
        }
        let sharedDbs = {};
        const sharedRow = rows.find((r) => r.name === "_shared_dbs");
        if (sharedRow) {
            try {
                sharedDbs = sharedRow[dbsField] ? JSON.parse(sharedRow[dbsField]) : {};
            }
            catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                throw new Error(`fromBootstrap: row '_shared_dbs' ${dbsField} not valid JSON: ${message}`);
            }
            if (!sharedDbs || typeof sharedDbs !== "object")
                sharedDbs = {};
        }
        const mergedDbs = { ...sharedDbs, ...projectDbs };
        if (Object.keys(mergedDbs).length === 0) {
            throw new Error(`fromBootstrap: merged dbs map for project '${project}' env '${envUpper}' is empty`);
        }
        if (logger && typeof logger.info === "function") {
            logger.info(`[vault-loader] loaded bootstrap meta: project=${project} env=${envUpper} dbCount=${Object.keys(mergedDbs).length}`);
        }
        return new VaultLoader({
            token: projectToken,
            databases: mergedDbs,
            ttlMs,
            logger,
        });
    }
}
exports.VaultLoader = VaultLoader;
function parseBootstrapRow(row) {
    const props = (row.properties || {});
    const text = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0)
            return "";
        return arr.map((t) => t.plain_text || "").join("");
    };
    return {
        name: text(props.Name?.title),
        reader_token_local: text(props.reader_token_local?.rich_text),
        reader_token_prod: text(props.reader_token_prod?.rich_text),
        dbs_local: text(props.dbs_local?.rich_text),
        dbs_prod: text(props.dbs_prod?.rich_text),
        active: props.active?.checkbox ?? true,
    };
}
function buildDatabasesFromEnv(envObj, projects = [], opts = {}) {
    const BASE_METADATA_SLUGS = ["old_flat", "container_page", "container"];
    const extraSlugs = Array.isArray(opts.extraMetadataSlugs) ? opts.extraMetadataSlugs : [];
    const METADATA_SLUGS = new Set([
        ...BASE_METADATA_SLUGS,
        "nexus_reader",
        ...extraSlugs.map((s) => String(s).toLowerCase()),
    ]);
    const SHARED_INFRA_SLUGS = new Set(["bots_write", "reminders", "_reminders"]);
    const projectSet = new Set((projects || []).map((p) => String(p).toLowerCase()));
    const scopeAll = projectSet.size === 0;
    const dbs = {};
    for (const [k, v] of Object.entries(envObj)) {
        const m = k.match(/^NOTION_VAULT_(.+)_DB_ID$/);
        if (!m)
            continue;
        const slug = m[1].toLowerCase();
        if (METADATA_SLUGS.has(slug))
            continue;
        if (slug.includes("reader_token"))
            continue;
        if (scopeAll) {
            dbs[slug] = v;
            continue;
        }
        if (slug.startsWith("shared_") || slug === "shared") {
            dbs[slug] = v;
        }
        else if (SHARED_INFRA_SLUGS.has(slug)) {
            dbs[slug] = v;
        }
        else if (projectSet.has(slug)) {
            dbs[slug] = v;
        }
    }
    return dbs;
}
//# sourceMappingURL=index.js.map