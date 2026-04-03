/**
 * 企业微信主动消息推送模块
 *
 * 用于URL回调模式下,当连接超时无法被动回复时,
 * 通过主动消息推送API发送消息
 *
 * @see https://developer.work.weixin.qq.com/document/path/101138
 */
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
/**
 * 通过主动消息推送API发送消息
 *
 * @param params.corpId 企业ID
 * @param params.corpSecret 应用Secret
 * @param params.chatId 会话ID
 * @param params.msgtype 消息类型
 * @param params.content 消息内容
 */
export declare function sendProactiveMessage(params: {
    corpId: string;
    corpSecret: string;
    chatId: string;
    msgtype: "text" | "markdown";
    content: string;
    runtime: RuntimeEnv;
}): Promise<void>;
