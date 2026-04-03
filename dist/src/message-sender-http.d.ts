/**
 * URL 回调模式：通过 response_url 主动回复（与长连接下 aibot_respond_msg 流式语义对齐）。
 *
 * @see https://developer.work.weixin.qq.com/document/path/101138
 */
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
/**
 * 流式回复（多段 finish=false，最后 finish=true）
 */
export declare function sendWeComReplyHttp(params: {
    responseUrl: string;
    streamId: string;
    text: string;
    finish: boolean;
    runtime: RuntimeEnv;
}): Promise<void>;
/**
 * 流式过期或降级时发送 Markdown（与 WS 下 sendMessage(markdown) 对应）
 */
export declare function sendWeComMarkdownHttp(params: {
    responseUrl: string;
    text: string;
    runtime: RuntimeEnv;
}): Promise<void>;
