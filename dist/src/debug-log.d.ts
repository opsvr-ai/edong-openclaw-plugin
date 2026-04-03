import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
export declare function getWecomDebugLogFilePath(): string;
export declare function setWecomDebugLogFilePath(baseDir: string): void;
export declare function writeWecomDebugLog(level: "DEBUG" | "INFO" | "WARN" | "ERROR", message: string): Promise<void>;
export declare function wrapRuntimeEnvWithDebug(runtime: RuntimeEnv, source: string): RuntimeEnv;
