/**
 * URL 回调模式：通过 response_url 主动回复（与长连接下 aibot_respond_msg 流式语义对齐）。
 *
 * @see https://developer.work.weixin.qq.com/document/path/101138
 */

import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { REPLY_SEND_TIMEOUT_MS } from "./const.js";
import { withTimeout } from "./timeout.js";
import { StreamExpiredError } from "./message-sender.js";

async function parseErrBody(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return "";
  }
}

/**
 * 流式回复（多段 finish=false，最后 finish=true）
 */
export async function sendWeComReplyHttp(params: {
  responseUrl: string;
  streamId: string;
  text: string;
  finish: boolean;
  runtime: RuntimeEnv;
}): Promise<void> {
  const { responseUrl, streamId, text, finish, runtime } = params;
  const body = {
    msgtype: "stream",
    stream: {
      id: streamId,
      finish,
      content: text,
    },
  };

  const res = await withTimeout(
    fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    }),
    REPLY_SEND_TIMEOUT_MS,
    `HTTP reply (stream) timed out (streamId=${streamId})`,
  );

  if (!res.ok) {
    const detail = await parseErrBody(res);
    const errMsg = `HTTP reply failed: ${res.status} ${res.statusText} ${detail}`;
    if (detail.includes("846608") || detail.includes(String(846608))) {
      throw new StreamExpiredError(errMsg);
    }
    throw new Error(errMsg);
  }
  runtime.log?.(`[plugin -> wecom http] stream reply ok, streamId=${streamId}, finish=${finish}`);
}

/**
 * 流式过期或降级时发送 Markdown（与 WS 下 sendMessage(markdown) 对应）
 */
export async function sendWeComMarkdownHttp(params: {
  responseUrl: string;
  text: string;
  runtime: RuntimeEnv;
}): Promise<void> {
  const { responseUrl, text, runtime } = params;
  const body = {
    msgtype: "markdown",
    markdown: { content: text },
  };

  const res = await withTimeout(
    fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    }),
    REPLY_SEND_TIMEOUT_MS,
    "HTTP reply (markdown) timed out",
  );

  if (!res.ok) {
    const detail = await parseErrBody(res);
    throw new Error(`HTTP markdown reply failed: ${res.status} ${detail}`);
  }
  runtime.log?.(`[plugin -> wecom http] markdown reply ok`);
}
