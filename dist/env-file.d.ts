export declare function parseEnvFile(filePath: string): Record<string, string>;
export declare function parseEnvString(content: string): Record<string, string>;
/**
 * Format env object into .env-style string for output.
 * Sorts keys alphabetically.
 */
export declare function formatEnvOutput(envMap: Record<string, string>): string;
//# sourceMappingURL=env-file.d.ts.map