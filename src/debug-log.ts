import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";

let debugLogFile = path.resolve(process.cwd(), "wecom-debug.log");

function toText(args: unknown[]): string {
  return args
    .map((v) => {
      if (typeof v === "string") return v;
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    })
    .join(" ");
}

export function getWecomDebugLogFilePath(): string {
  return debugLogFile;
}

export function setWecomDebugLogFilePath(baseDir: string): void {
  debugLogFile = path.resolve(baseDir, "wecom-debug.log");
}

export async function writeWecomDebugLog(level: "DEBUG" | "INFO" | "WARN" | "ERROR", message: string): Promise<void> {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  try {
    await fs.appendFile(debugLogFile, line, "utf8");
  } catch {
    // 调试日志写入失败不应影响主流程
  }
}

export function wrapRuntimeEnvWithDebug(runtime: RuntimeEnv, source: string): RuntimeEnv {
  return {
    ...runtime,
    log: (...args: unknown[]) => {
      const msg = toText(args);
      runtime.log?.(...args);
      void writeWecomDebugLog("INFO", `[${source}] ${msg}`);
    },
    error: (...args: unknown[]) => {
      const msg = toText(args);
      runtime.error?.(...args);
      void writeWecomDebugLog("ERROR", `[${source}] ${msg}`);
    },
  };
}
