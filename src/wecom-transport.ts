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

export function resolveResponseUrl(frame: WsFrame): string | undefined {
  const body = (frame.body ?? {}) as Record<string, unknown>;
  return (
    pickString(body.response_url) ??
    pickString(body.responseUrl) ??
    pickString((body.data as Record<string, unknown> | undefined)?.response_url) ??
    pickString((body.data as Record<string, unknown> | undefined)?.responseUrl) ??
    pickString((body.message as Record<string, unknown> | undefined)?.response_url) ??
    pickString((body.message as Record<string, unknown> | undefined)?.responseUrl)
  );
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
 * 无 response_url 时：按官方「加密与被动回复」在同一次 POST 响应中返回密文包（见 path/101033）。
 * 同一 TCP 响应只能写一次，因此仅处理 finish=true 的最终帧（中间 finish=false 由业务层跳过展示）。
 */
export function createPassiveHttpEncryptedReplyTransport(params: {
  res: ServerResponse;
  token: string;
  encodingAesKey: string;
  nonce: string;
}): WecomReplyTransport {
  const { res, token, encodingAesKey, nonce } = params;

  function sendEncryptedPlainJson(plainJson: string, runtime: RuntimeEnv): void {
    if (res.writableEnded) {
      runtime.log?.(`[wecom] passive http: response already ended, skip`);
      return;
    }
    const { body } = buildEncryptedJsonResponse(token, encodingAesKey, plainJson, nonce);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(body);
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
      sendEncryptedPlainJson(plain, runtime);
      runtime.log?.(`[wecom] passive http: sent encrypted stream reply (finish=true), len=${text.length}`);
    },
    sendMarkdownFallback: async ({ text, runtime }) => {
      const plain = JSON.stringify({
        msgtype: "markdown",
        markdown: { content: text },
      });
      sendEncryptedPlainJson(plain, runtime);
      runtime.log?.(`[wecom] passive http: sent encrypted markdown fallback, len=${text.length}`);
    },
  };
}
