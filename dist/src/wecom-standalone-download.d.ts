/**
 * 无 WebSocket 时下载智能机器人加密文件（复用 SDK 的 HTTP 下载与 AES 解密）
 */
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
export declare function downloadWecomEncryptedFile(params: {
    url: string;
    aesKey?: string;
    runtime?: RuntimeEnv;
}): Promise<{
    buffer: Buffer;
    filename?: string;
}>;
