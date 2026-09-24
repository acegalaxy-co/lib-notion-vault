interface VaultLoaderOptions {
    token: string;
    databases: Record<string, string>;
    ttlMs?: number;
    logger?: {
        info: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
    };
}
interface ParsedRow {
    key?: string;
    value?: string;
    hasStructured?: boolean;
    active?: boolean;
    env: string[];
    projects?: string[];
    aliases: string[];
    category?: string;
    structured?: Record<string, string>;
    _db?: string;
}
interface LoadFilter {
    projects?: string[];
    env?: string;
    injectAliases?: boolean;
    activeOnly?: boolean;
}
interface StatsResult {
    totalRows: number;
    totalAliases: number;
    injectedKeys: number;
    byDb: Record<string, number>;
    byCategory: Record<string, number>;
}
interface BootstrapOptions {
    bootstrapToken: string;
    bootstrapDbId: string;
    project: string;
    env: string;
    ttlMs?: number;
    logger?: {
        info: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
    };
}
interface BuildDatabasesOptions {
    extraMetadataSlugs?: string[];
}
export declare class VaultLoader {
    private client;
    private databases;
    private cache;
    private logger;
    constructor({ token, databases, ttlMs, logger }: VaultLoaderOptions);
    fetchAllRows(): Promise<ParsedRow[]>;
    load({ projects, env, injectAliases, activeOnly }?: LoadFilter): Promise<Record<string, string>>;
    get(key: string, filter?: LoadFilter): Promise<string | undefined>;
    stats({ projects, env, activeOnly }?: {
        projects?: string[];
        env?: string;
        activeOnly?: boolean;
    }): Promise<StatsResult>;
    invalidateCache(): void;
    static fromBootstrap({ bootstrapToken, bootstrapDbId, project, env, ttlMs, logger }: BootstrapOptions): Promise<VaultLoader>;
}
export declare function buildDatabasesFromEnv(envObj: Record<string, string>, projects?: string[], opts?: BuildDatabasesOptions): Record<string, string>;
export {};
//# sourceMappingURL=index.d.ts.map