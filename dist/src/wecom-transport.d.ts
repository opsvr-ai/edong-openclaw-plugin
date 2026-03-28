/**
 * 消息回复传输层：长连接（WebSocket）与 URL 回调（HTTP response_url）共用同一套业务逻辑。
 */
import type { ServerResponse } from "node:http";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import type { WsFrame } from "@wecom/aibot-node-sdk";
import type { WSClient } from "@wecom/aibot-node-sdk";
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
/**
 * 从回调帧中解析主动回复地址（path/101138）。
 * 优先显式字段，其次 response_code 拼接，最后深度扫描。
 */
export declare function resolveResponseUrl(frame: WsFrame): string | undefined;
export declare function createWebsocketReplyTransport(wsClient: WSClient): WecomReplyTransport;
export declare function createHttpCallbackReplyTransport(): WecomReplyTransport;
/**
 * 被动 HTTP 无法写回同一 TCP（已结束/写入失败）时，按 path/101138 用 response_url POST markdown，
 * 或长连接 sendMessage(markdown) 主动推送。
 */
export declare function tryProactiveMarkdownFallback(params: {
    frame: WsFrame;
    chatId: string;
    text: string;
    runtime: RuntimeEnv;
    wsClient: WSClient | null;
}): Promise<boolean>;
/**
 * 无 response_url 时：按官方「加密与被动回复」在同一次 POST 响应中返回密文包（见 path/101033）。
 * 同一 TCP 响应只能写一次，因此仅处理 finish=true 的最终帧（中间 finish=false 由业务层跳过展示）。
 */
export declare function createPassiveHttpEncryptedReplyTransport(params: {
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
}): WecomReplyTransport;
