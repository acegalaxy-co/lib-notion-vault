"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRow = parseRow;
function textProp(arr) {
    if (!Array.isArray(arr) || arr.length === 0)
        return '';
    return arr.map((t) => t.plain_text || '').join('');
}
function parseRow(row) {
    const props = row.properties || {};
    const key = textProp(props.Name?.title);
    const value = textProp(props.value?.rich_text);
    const env = (props.env?.multi_select || []).map((e) => e.name);
    const category = props.category?.select?.name;
    const active = props.active?.checkbox ?? true;
    const lastRotated = props.last_rotated?.date?.start;
    const notes = textProp(props.notes?.rich_text);
    // project: Select (old schema) OR projects: Multi-select (llm, google, telegram, notion)
    let projects = [];
    if (props.projects?.multi_select) {
        projects = props.projects.multi_select.map((p) => p.name);
    }
    else if (props.project?.select?.name) {
        projects = [props.project.select.name];
    }
    // alias_keys: comma-separated list (only in llm DB) — used for backward compat
    const aliasKeys = textProp(props.alias_keys?.rich_text);
    const aliases = aliasKeys
        ? aliasKeys.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    // Optional schema-specific fields
    const provider = props.provider?.select?.name;
    const modelName = textProp(props.model_name?.rich_text);
    const account = textProp(props.account?.rich_text);
    const scopeType = props.scope_type?.select?.name;
    const botRole = props.bot_role?.select?.name;
    const channelPurpose = props.channel_purpose?.select?.name;
    const resourceType = props.resource_type?.select?.name;
    const dbPurpose = textProp(props.db_purpose?.rich_text);
    const botName = props.bot_name?.select?.name;
    // Structured entity columns (shared_config consolidation 2026-04-27).
    // When a row has any of these populated, vault loader auto-emits derived
    // env vars: <Name>_HOST, <Name>_PORT, <Name>_USER, <Name>_TARGET.
    // Backward-compat: existing callers using process.env.DEV_SSH_HOST etc.
    // continue to work because emit happens at load() time.
    const structured = {
        host: textProp(props.host?.rich_text),
        port: textProp(props.port?.rich_text),
        user: textProp(props.user?.rich_text),
        target_alias: textProp(props.target_alias?.rich_text),
    };
    const hasStructured = Object.values(structured).some((v) => v && v.length > 0);
    return {
        key,
        value,
        env,
        projects,
        category,
        active,
        lastRotated,
        notes,
        aliases,
        // Optional metadata (not all rows have these)
        provider,
        modelName,
        account,
        scopeType,
        botRole,
        channelPurpose,
        resourceType,
        dbPurpose,
        botName,
        // Structured entity columns
        structured,
        hasStructured,
    };
}
//# sourceMappingURL=row-parser.js.map