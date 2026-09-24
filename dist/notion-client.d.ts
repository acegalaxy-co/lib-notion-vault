interface NotionClientOptions {
    token: string;
    retries?: number;
    retryDelayMs?: number;
}
interface QueryDatabaseOptions {
    filter?: Record<string, unknown>;
    pageSize?: number;
}
export declare class NotionClient {
    private token;
    private retries;
    private retryDelayMs;
    constructor({ token, retries, retryDelayMs }: NotionClientOptions);
    request(method: string, path: string, body?: Record<string, unknown>): Promise<unknown>;
    queryDatabase(databaseId: string, opts?: QueryDatabaseOptions): Promise<unknown[]>;
    getDatabase(databaseId: string): Promise<unknown>;
}
export {};
//# sourceMappingURL=notion-client.d.ts.map