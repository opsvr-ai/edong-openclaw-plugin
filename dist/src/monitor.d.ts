/**
 * 企业微信 WebSocket 监控器主模块
 *
 * 负责：
 * - 建立和管理 WebSocket 连接
 * - 协调消息处理流程（解析→策略检查→下载图片→路由回复）
 * - 资源生命周期管理
 *
 * 子模块：
 * - message-parser.ts  : 消息内容解析
 * - message-sender.ts  : 消息发送（带超时保护）
 * - media-handler.ts   : 图片下载和保存（带超时保护）
 * - group-policy.ts    : 群组访问控制
 * - dm-policy.ts       : 私聊访问控制
 * - state-manager.ts   : 全局状态管理（带 TTL 清理）
 * - timeout.ts         : 超时工具
 */
import type { ServerResponse } from "node:http";
import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { WSClient } from "@wecom/aibot-node-sdk";
import type { WsFrame } from "@wecom/aibot-node-sdk";
import type { ResolvedWeComAccount } from "./utils.js";
import type { WeComMonitorOptions } from "./interface.js";
export type { WeComMonitorOptions } from "./interface.js";
export { WeComCommand } from "./const.js";
export { getWeComWebSocket, setReqIdForChat, getReqIdForChatAsync, getReqIdForChat, deleteReqIdForChat, warmupReqIdStore, flushReqIdStore, } from "./state-manager.js";
export { sendWeComReply } from "./message-sender.js";
/**
 * 处理企业微信消息（主函数）
 *
 * 处理流程：
 * 1. 解析消息内容（文本、图片、引用）
 * 2. 群组策略检查（仅群聊）
 * 3. DM Policy 访问控制检查（仅私聊）
 * 4. 下载并保存图片
 * 5. 初始化消息状态
 * 6. 发送"思考中"消息
 * 7. 路由消息到核心处理流程
 *
 * 整体带超时保护，防止单条消息处理阻塞过久
 */
export declare function processWeComMessage(params: {
    frame: WsFrame;
    account: ResolvedWeComAccount;
    config: OpenClawConfig;
    runtime: RuntimeEnv;
    /** URL 回调模式下为 null */
    wsClient: WSClient | null;
    /**
     * 无 response_url 时：在同一次企微 POST 回调的 HTTP 响应中返回加密被动回复（path/101033）,不能与先发空包再异步回复混用。
     */
    passiveHttpReply?: {
        res: ServerResponse;
        token: string;
        encodingAesKey: string;
        nonce: string;
        corpId?: string;
        corpSecret?: string;
    };
    /** URL 回调 query 中的 nonce，用于 MessageSid 去重键（与 msgid 组合）；长连接模式勿传 */
    httpCallbackQueryNonce?: string;
}): Promise<void>;
/**
 * 监听企业微信 WebSocket 连接
 * 使用 aibot-node-sdk 简化连接管理
 */
export declare function monitorWeComProvider(options: WeComMonitorOptions): Promise<void>;
