/**
 * 无 WebSocket 时下载智能机器人加密文件（复用 SDK 的 HTTP 下载与 AES 解密）
 */

import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { WeComApiClient, decryptFile } from "@wecom/aibot-node-sdk";

function noopLogger() {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

export async function downloadWecomEncryptedFile(params: {
  url: string;
  aesKey?: string;
  runtime?: RuntimeEnv;
}): Promise<{ buffer: Buffer; filename?: string }> {
  const { url, aesKey, runtime } = params;
  const api = new WeComApiClient(noopLogger() as any);
  const { buffer: encryptedBuffer, filename } = await api.downloadFileRaw(url);
  if (!aesKey) {
    runtime?.log?.(`[wecom] download: no aesKey, returning raw buffer`);
    return { buffer: encryptedBuffer, filename };
  }
  const decryptedBuffer = decryptFile(encryptedBuffer, aesKey);
  return { buffer: decryptedBuffer, filename };
}
