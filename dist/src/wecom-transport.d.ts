/**
 * 消息回复传输层：长连接（WebSocket）与 URL 回调（HTTP response_url）共用同一套业务逻辑。
 */
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
export declare function createWebsocketReplyTransport(wsClient: WSClient): WecomReplyTransport;
export declare function createHttpCallbackReplyTransport(): WecomReplyTransport;
