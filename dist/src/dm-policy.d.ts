/**
 * 企业微信 DM（私聊）访问控制模块
 *
 * 负责私聊策略检查、配对流程
 */
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import type { WsFrame } from "@wecom/aibot-node-sdk";
import type { ResolvedWeComAccount } from "./utils.js";
/**
 * DM Policy 检查结果
 */
export interface DmPolicyCheckResult {
    /** 是否允许继续处理消息 */
    allowed: boolean;
    /** 是否已发送配对消息（仅在 pairing 模式下） */
    pairingSent?: boolean;
}
/**
 * 检查 DM Policy 访问控制
 * @returns 检查结果，包含是否允许继续处理
 */
export declare function checkDmPolicy(params: {
    senderId: string;
    isGroup: boolean;
    account: ResolvedWeComAccount;
    frame: WsFrame;
    runtime: RuntimeEnv;
    /** 发送配对提示等短回复（流式 finish=true） */
    sendPairingReply: (text: string) => Promise<void>;
}): Promise<DmPolicyCheckResult>;
