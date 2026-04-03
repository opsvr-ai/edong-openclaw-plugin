/**
 * 企业微信消息发送模块
 *
 * 负责通过 WSClient 发送回复消息，包含超时保护
 */

import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { type WSClient, type WsFrame, generateReqId } from "@wecom/aibot-node-sdk";
import { REPLY_SEND_TIMEOUT_MS } from "./const.js";
import { withTimeout } from "./timeout.js";

// ============================================================================
// 流式过期错误（errcode 846608）
// ============================================================================

/** 流式回复超时错误码（>6分钟未更新，服务端拒绝继续流式更新） */
export const STREAM_EXPIRED_ERRCODE = 846608;

/**
 * 流式回复过期错误
 * 当服务端返回 errcode=846608 时抛出，表示流式消息已超过6分钟无法更新，
 * 调用方需降级为主动发送（sendMessage）方式回复。
 */
export class StreamExpiredError extends Error {
  readonly errcode = STREAM_EXPIRED_ERRCODE;
  constructor(message?: string) {
    super(message ?? `Stream message update expired (errcode=${STREAM_EXPIRED_ERRCODE})`);
    this.name = "StreamExpiredError";
  }
}

// ============================================================================
// 消息发送
// ============================================================================

/**
 * 发送企业微信回复消息
 * 供 monitor 内部和 channel outbound 使用
 *
 * @returns messageId (streamId)
 */
export async function sendWeComReply(params: {
  wsClient: WSClient;
  frame: WsFrame;
  text?: string;
  runtime: RuntimeEnv;
  /** 是否为流式回复的最终消息，默认为 true */
  finish?: boolean;
  /** 指定 streamId，用于流式回复时保持相同的 streamId */
  streamId?: string;
}): Promise<string> {
  const { wsClient, frame, text, runtime, finish = true, streamId: existingStreamId } = params;

  if (!text) {
    return "";
  }

  const streamId = existingStreamId || generateReqId("stream");

  if (!wsClient.isConnected) {
    runtime.error?.(`[wecom] WSClient not connected, cannot send reply`);
    throw new Error("WSClient not connected");
  }

  // 使用 SDK 的 replyStream 方法发送消息，带超时保护
  try {
    await withTimeout(
      wsClient.replyStream(frame, streamId, text, finish),
      REPLY_SEND_TIMEOUT_MS,
      `Reply send timed out (streamId=${streamId})`,
    );
  } catch (err: any) {
    // 服务端返回 846608：流式消息超过6分钟无法更新，需降级为主动发送
    const errMsg = err?.errmsg || err?.message || String(err);
    if (
      err?.errcode === STREAM_EXPIRED_ERRCODE ||
      errMsg.includes(String(STREAM_EXPIRED_ERRCODE))
    ) {
      throw new StreamExpiredError(errMsg);
    }
    throw err;
  }
  runtime.log?.(`[plugin -> server] streamId=${streamId}, finish=${finish}`);

  return streamId;
}
