interface StructuredEntity {
    host: string;
    port: string;
    user: string;
    target_alias: string;
}
interface ParsedRow {
    key: string;
    value: string;
    env: string[];
    projects: string[];
    category: string | undefined;
    active: boolean;
    lastRotated: string | undefined;
    notes: string;
    aliases: string[];
    provider: string | undefined;
    modelName: string;
    account: string;
    scopeType: string | undefined;
    botRole: string | undefined;
    channelPurpose: string | undefined;
    resourceType: string | undefined;
    dbPurpose: string;
    botName: string | undefined;
    structured: StructuredEntity;
    hasStructured: boolean;
}
interface NotionProperty {
    title?: Array<{
        plain_text?: string;
    }>;
    rich_text?: Array<{
        plain_text?: string;
    }>;
    multi_select?: Array<{
        name: string;
    }>;
    select?: {
        name: string;
    };
    checkbox?: boolean;
    date?: {
        start: string;
    };
}
interface NotionRow {
    properties?: Record<string, NotionProperty>;
}
export declare function parseRow(row: NotionRow): ParsedRow;
export {};
//# sourceMappingURL=row-parser.d.ts.map