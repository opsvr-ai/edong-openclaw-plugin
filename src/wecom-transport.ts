/**
 * 消息回复传输层：长连接（WebSocket）与 URL 回调（HTTP response_url）共用同一套业务逻辑。
 */

import type { ServerResponse } from "node:http";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import type { WsFrame } from "@wecom/aibot-node-sdk";
import type { WSClient } from "@wecom/aibot-node-sdk";
import { sendWeComReply } from "./message-sender.js";
import { sendWeComReplyHttp, sendWeComMarkdownHttp } from "./message-sender-http.js";
import { buildEncryptedJsonResponse } from "./wecom-callback-crypto.js";

export type WecomReplyTransport = {
  replyStream: (params: {
    frame: WsFrame;
    streamId: string;
    text: string;
    finish: boolean;
    runtime: RuntimeEnv;
  }) => Promise<void>;
  sendMarkdownFallback: (params: {
    frame: WsFrame;
    chatId: string;
    text: string;
    runtime: RuntimeEnv;
  }) => Promise<void>;
};

function pickString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** 与官方「主动回复」文档一致：https://developer.work.weixin.qq.com/document/path/101138 */
const QYAPI_AIBOT_RESPONSE_PATH = "cgi-bin/aibot/response";

function buildActiveReplyUrlFromResponseCode(code: string): string {
  const c = code.trim();
  return `https://qyapi.weixin.qq.com/${QYAPI_AIBOT_RESPONSE_PATH}?response_code=${encodeURIComponent(c)}`;
}

/**
 * 部分回调只下发 response_code，需拼成完整 URL 后才能 POST（见 path/101138）。
 */
function pickResponseCode(body: Record<string, unknown>, root: Record<string, unknown>): string | undefined {
  return (
    pickString(body.response_code) ??
    pickString(body.responseCode) ??
    pickString(root.response_code) ??
    pickString(root.responseCode) ??
    pickString((body.data as Record<string, unknown> | undefined)?.response_code) ??
    pickString((body.data as Record<string, unknown> | undefined)?.responseCode) ??
    pickString((body.message as Record<string, unknown> | undefined)?.response_code) ??
    pickString((body.message as Record<string, unknown> | undefined)?.responseCode)
  );
}

/**
 * 深度扫描：兼容嵌套字段、或仅出现完整 https 主动回复地址的字符串（不同接入版本字段名不一致）。
 */
function deepFindResponseUrlString(obj: unknown, depth: number): string | undefined {
  if (depth > 12 || obj == null) return undefined;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (
      s.startsWith("http") &&
      s.includes("qyapi.weixin.qq.com") &&
      (s.includes("aibot") || s.includes(QYAPI_AIBOT_RESPONSE_PATH))
    ) {
      return s;
    }
    return undefined;
  }
  if (typeof obj !== "object") return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const f = deepFindResponseUrlString(item, depth + 1);
      if (f) return f;
    }
    return undefined;
  }
  const o = obj as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    const kl = k.toLowerCase();
    if (
      (kl.includes("response_url") ||
        kl === "responseurl" ||
        kl.includes("reply_url") ||
        kl.includes("aibot_response")) &&
      typeof v === "string" &&
      v.trim()
    ) {
      return v.trim();
    }
  }
  for (const v of Object.values(o)) {
    const f = deepFindResponseUrlString(v, depth + 1);
    if (f) return f;
  }
  return undefined;
}

/**
 * 从回调帧中解析主动回复地址（path/101138）。
 * 优先显式字段，其次 response_code 拼接，最后深度扫描。
 */
export function resolveResponseUrl(frame: WsFrame): string | undefined {
  const body = (frame.body ?? {}) as Record<string, unknown>;
  const root = frame as unknown as Record<string, unknown>;
  const explicit =
    pickString(body.response_url) ??
    pickString(body.responseUrl) ??
    pickString(root.response_url) ??
    pickString(root.responseUrl) ??
    pickString((body.data as Record<string, unknown> | undefined)?.response_url) ??
    pickString((body.data as Record<string, unknown> | undefined)?.responseUrl) ??
    pickString((body.message as Record<string, unknown> | undefined)?.response_url) ??
    pickString((body.message as Record<string, unknown> | undefined)?.responseUrl);
  if (explicit) {
    return explicit;
  }
  const code = pickResponseCode(body, root);
  if (code) {
    return buildActiveReplyUrlFromResponseCode(code);
  }
  return deepFindResponseUrlString(frame, 0) ?? deepFindResponseUrlString(body, 0);
}

function throwMissingResponseUrl(frame: WsFrame): never {
  const body = (frame.body ?? {}) as Record<string, unknown>;
  const msgid = pickString(body.msgid) ?? "unknown";
  const msgtype = pickString(body.msgtype) ?? "unknown";
  const keys = Object.keys(body).slice(0, 20).join(",");
  throw new Error(
    `response_url missing in callback body (HTTP 模式): msgid=${msgid}, msgtype=${msgtype}, keys=[${keys}]`,
  );
}

export function createWebsocketReplyTransport(wsClient: WSClient): WecomReplyTransport {
  return {
    replyStream: async ({ frame, streamId, text, finish, runtime }) => {
      await sendWeComReply({ wsClient, frame, text, runtime, finish, streamId });
    },
    sendMarkdownFallback: async ({ chatId, text, runtime }) => {
      await wsClient.sendMessage(chatId, {
        msgtype: "markdown",
        markdown: { content: text },
      });
      runtime.log?.(`[plugin -> server] markdown fallback chatId=${chatId}`);
    },
  };
}

export function createHttpCallbackReplyTransport(): WecomReplyTransport {
  return {
    replyStream: async ({ frame, streamId, text, finish, runtime }) => {
      const responseUrl = resolveResponseUrl(frame);
      if (!responseUrl) {
        throwMissingResponseUrl(frame);
      }
      await sendWeComReplyHttp({ responseUrl, streamId, text, finish, runtime });
    },
    sendMarkdownFallback: async ({ frame, text, runtime }) => {
      const responseUrl = resolveResponseUrl(frame);
      if (!responseUrl) {
        throwMissingResponseUrl(frame);
      }
      await sendWeComMarkdownHttp({ responseUrl, text, runtime });
    },
  };
}

/**
 * 被动 HTTP 无法写回同一 TCP（已结束/写入失败）时，按 path/101138 用 response_url POST markdown，
 * 或长连接 sendMessage(markdown) 主动推送。
 */
export async function tryProactiveMarkdownFallback(params: {
  frame: WsFrame;
  chatId: string;
  text: string;
  runtime: RuntimeEnv;
  wsClient: WSClient | null;
}): Promise<boolean> {
  const { frame, chatId, text, runtime, wsClient } = params;
  const url = resolveResponseUrl(frame);
  if (url) {
    try {
      await sendWeComMarkdownHttp({ responseUrl: url, text, runtime });
      runtime.log?.(`[wecom] proactive markdown fallback ok (response_url)`);
      return true;
    } catch (e) {
      runtime.error?.(`[wecom] proactive markdown via response_url failed: ${String(e)}`);
    }
  }
  if (wsClient?.isConnected) {
    try {
      await wsClient.sendMessage(chatId, {
        msgtype: "markdown",
        markdown: { content: text },
      });
      runtime.log?.(`[wecom] proactive markdown fallback ok (WS)`);
      return true;
    } catch (e) {
      runtime.error?.(`[wecom] proactive markdown via WS failed: ${String(e)}`);
    }
  }
  return false;
}

/**
 * 无 response_url 时：按官方「加密与被动回复」在同一次 POST 响应中返回密文包（见 path/101033）。
 * 同一 TCP 响应只能写一次，因此仅处理 finish=true 的最终帧（中间 finish=false 由业务层跳过展示）。
 */
export function createPassiveHttpEncryptedReplyTransport(params: {
  res: ServerResponse;
  token: string;
  encodingAesKey: string;
  nonce: string;
  /** 被动连接已不可用时的主动推送兜底（response_url 优先，其次 WS） */
  proactiveFallback?: {
    frame: WsFrame;
    chatId: string;
    wsClient: WSClient | null;
  };
}): WecomReplyTransport {
  const { res, token, encodingAesKey, nonce, proactiveFallback } = params;

  async function sendEncryptedBodyOrFallback(
    plainJson: string,
    fallbackText: string,
    runtime: RuntimeEnv,
    logOk: string,
  ): Promise<void> {
    if (res.writableEnded) {
      runtime.log?.(`[wecom] passive http: response already ended, try proactive fallback`);
      if (proactiveFallback) {
        const ok = await tryProactiveMarkdownFallback({
          frame: proactiveFallback.frame,
          chatId: proactiveFallback.chatId,
          text: fallbackText,
          runtime,
          wsClient: proactiveFallback.wsClient,
        });
        if (!ok) {
          runtime.error?.(`[wecom] passive http: proactive fallback failed (no usable response_url or WS)`);
        }
      }
      return;
    }
    try {
      const { body } = buildEncryptedJsonResponse(token, encodingAesKey, plainJson, nonce);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(body);
      runtime.log?.(logOk);
    } catch (e) {
      runtime.error?.(`[wecom] passive http: encrypted reply write failed: ${String(e)}`);
      if (proactiveFallback) {
        const ok = await tryProactiveMarkdownFallback({
          frame: proactiveFallback.frame,
          chatId: proactiveFallback.chatId,
          text: fallbackText,
          runtime,
          wsClient: proactiveFallback.wsClient,
        });
        if (!ok) {
          runtime.error?.(`[wecom] passive http: proactive fallback after write error also failed`);
        }
      }
    }
  }

  return {
    replyStream: async ({ streamId, text, finish, runtime }) => {
      if (!finish) {
        return;
      }
      const plain = JSON.stringify({
        msgtype: "stream",
        stream: {
          id: streamId,
          finish: true,
          content: text,
        },
      });
      await sendEncryptedBodyOrFallback(
        plain,
        text,
        runtime,
        `[wecom] passive http: sent encrypted stream reply (finish=true), len=${text.length}`,
      );
    },
    sendMarkdownFallback: async ({ text, runtime }) => {
      const plain = JSON.stringify({
        msgtype: "markdown",
        markdown: { content: text },
      });
      await sendEncryptedBodyOrFallback(
        plain,
        text,
        runtime,
        `[wecom] passive http: sent encrypted markdown fallback, len=${text.length}`,
      );
    },
  };
}
