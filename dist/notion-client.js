"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClient = void 0;
// Notion API client with retry + pagination
// Never logs secret values
// Uses native global fetch (Node 18+) — no node-fetch dependency
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
class NotionClient {
    token;
    retries;
    retryDelayMs;
    constructor({ token, retries = 3, retryDelayMs = 2000 }) {
        if (!token)
            throw new Error('NotionClient: token required');
        this.token = token;
        this.retries = retries;
        this.retryDelayMs = retryDelayMs;
    }
    async request(method, path, body) {
        let lastErr;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const resp = await fetch(`${NOTION_API}${path}`, {
                    method,
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Notion-Version': NOTION_VERSION,
                        'Content-Type': 'application/json',
                    },
                    body: body ? JSON.stringify(body) : undefined,
                });
                const text = await resp.text();
                if (!text.startsWith('{') && !text.startsWith('[')) {
                    if (attempt < this.retries) {
                        await sleep(this.retryDelayMs);
                        continue;
                    }
                    throw new Error(`Non-JSON response (HTTP ${resp.status})`);
                }
                const json = JSON.parse(text);
                if (!resp.ok) {
                    const code = json.code || `http_${resp.status}`;
                    const msg = json.message || 'unknown error';
                    throw new Error(`${code}: ${msg}`);
                }
                return json;
            }
            catch (e) {
                lastErr = e;
                if (attempt < this.retries)
                    await sleep(this.retryDelayMs);
            }
        }
        throw lastErr;
    }
    async queryDatabase(databaseId, opts = {}) {
        const { filter, pageSize = 100 } = opts;
        const rows = [];
        let cursor;
        while (true) {
            const body = { page_size: pageSize };
            if (filter)
                body.filter = filter;
            if (cursor)
                body.start_cursor = cursor;
            const result = await this.request('POST', `/databases/${databaseId}/query`, body);
            rows.push(...result.results);
            if (!result.has_more)
                break;
            cursor = result.next_cursor;
        }
        return rows;
    }
    async getDatabase(databaseId) {
        return this.request('GET', `/databases/${databaseId}`);
    }
}
exports.NotionClient = NotionClient;
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=notion-client.js.map