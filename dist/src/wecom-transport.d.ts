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
    /** 是否支持主动推送（URL回调模式下可用） */
    supportsProactive?: boolean;
    /** 主动推送消息（仅URL回调模式） */
    sendProactive?: (params: {
        chatId: string;
        text: string;
        runtime: RuntimeEnv;
    }) => Promise<void>;
};
export declare function resolveResponseUrl(frame: WsFrame): string | undefined;
export declare function createWebsocketReplyTransport(wsClient: WSClient): WecomReplyTransport;
export declare function createHttpCallbackReplyTransport(): WecomReplyTransport;
/**
 * 无 response_url 时：按官方「加密与被动回复」在同一次 POST 响应中返回密文包（见 path/101033）。
 * 同一 TCP 响应只能写一次，因此仅处理 finish=true 的最终帧（中间 finish=false 由业务层跳过展示）。
 *
 * 支持主动推送：当配置了corpId和corpSecret时，可以在连接超时后使用主动推送API
 */
export declare function createPassiveHttpEncryptedReplyTransport(params: {
    res: ServerResponse;
    token: string;
    encodingAesKey: string;
    nonce: string;
    corpId?: string;
    corpSecret?: string;
}): WecomReplyTransport;
