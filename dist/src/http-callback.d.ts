/**
 * 企业微信智能机器人「接收消息 URL」HTTP 回调（GET 验证 + POST 收消息）
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
declare const DEFAULT_CALLBACK_PATH = "/channels/wecom/callback";
/**
 * 注册 HTTP 回调路由（应在插件 register 阶段调用一次）
 */
export declare function registerWecomHttpCallbackRoute(api: OpenClawPluginApi): void;
export { DEFAULT_CALLBACK_PATH };
