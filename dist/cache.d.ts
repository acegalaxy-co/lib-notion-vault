export declare class TTLCache {
    ttlMs: number;
    store: Map<string, {
        value: unknown;
        expiresAt: number;
    }>;
    constructor({ ttlMs }?: {
        ttlMs?: number;
    });
    get(key: string): unknown;
    set(key: string, value: unknown, ttlMs?: number): void;
    has(key: string): boolean;
    delete(key: string): void;
    clear(): void;
    size(): number;
}
//# sourceMappingURL=cache.d.ts.map