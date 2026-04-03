/**
 * 企业微信公共工具函数
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
import { DEFAULT_ACCOUNT_ID } from "./openclaw-compat.js";
import { CHANNEL_ID } from "./const.js";

// ============================================================================
// 配置类型定义
// ============================================================================

/**
 * 企业微信群组配置
 */
export interface WeComGroupConfig {
  /** 群组内发送者白名单（仅列表中的成员消息会被处理） */
  allowFrom?: Array<string | number>;
}

/**
 * 企业微信配置类型
 */
export interface WeComConfig {
  enabled?: boolean;
  /**
   * 接收消息方式：`websocket`（长连接，默认）或 `http`（接收消息 URL + 加解密）
   * 与企微后台「API 模式」一致，两种模式互斥。
   */
  receiveMode?: "websocket" | "http";
  /**
   * URL 回调模式：在企微管理台「接收消息」里填写的**完整回调 URL**（与 Token、EncodingAESKey 同属一套配置）。
   * 应指向 OpenClaw 网关可公网访问地址 + `/channels/wecom/callback`，用于自检与说明。
   */
  callbackUrl?: string;
  /** URL 回调模式：管理后台「Token」 */
  callbackToken?: string;
  /** URL 回调模式：EncodingAESKey（43 位） */
  encodingAesKey?: string;
  /** 企业ID（用于主动消息推送） */
  corpId?: string;
  /** 应用Secret（用于主动消息推送） */
  corpSecret?: string;
  websocketUrl?: string;
  botId?: string;
  secret?: string;
  name?: string;
  allowFrom?: Array<string | number>;
  dmPolicy?: "open" | "allowlist" | "pairing" | "disabled";
  /** 群组访问策略："open" = 允许所有群组（默认），"allowlist" = 仅允许 groupAllowFrom 中的群组，"disabled" = 禁用群组消息 */
  groupPolicy?: "open" | "allowlist" | "disabled";
  /** 群组白名单（仅 groupPolicy="allowlist" 时生效） */
  groupAllowFrom?: Array<string | number>;
  /** 每个群组的详细配置（如群组内发送者白名单） */
  groups?: Record<string, WeComGroupConfig>;
  /** 是否发送"思考中"消息，默认为 true */
  sendThinkingMessage?: boolean;
  /** 额外允许访问的本地媒体路径白名单（支持 ~ 表示 home 目录），如 ["~/Downloads", "~/Documents"] */
  mediaLocalRoots?: string[];
}

export const DefaultWsUrl = "wss://openws.work.weixin.qq.com";

export interface ResolvedWeComAccount {
  accountId: string;
  name: string;
  enabled: boolean;
  receiveMode: "websocket" | "http";
  websocketUrl: string;
  botId: string;
  secret: string;
  /** URL 回调：管理台填写的完整回调地址（与 Token、EncodingAESKey 配套） */
  callbackUrl: string;
  callbackToken: string;
  encodingAesKey: string;
  /** 企业ID（用于主动消息推送） */
  corpId: string;
  /** 应用Secret（用于主动消息推送） */
  corpSecret: string;
  /** 是否发送"思考中"消息，默认为 true */
  sendThinkingMessage: boolean;
  config: WeComConfig;
}

/**
 * 解析企业微信账户配置
 */
export function resolveWeComAccount(cfg: OpenClawConfig): ResolvedWeComAccount {
  const wecomConfig = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const receiveMode = wecomConfig.receiveMode === "http" ? "http" : "websocket";

  return {
    accountId: DEFAULT_ACCOUNT_ID,
    name: wecomConfig.name ?? "联盟E动",
    enabled: wecomConfig.enabled ?? false,
    receiveMode,
    websocketUrl: wecomConfig.websocketUrl || DefaultWsUrl,
    botId: wecomConfig.botId ?? "",
    secret: wecomConfig.secret ?? "",
    callbackUrl: wecomConfig.callbackUrl ?? "",
    callbackToken: wecomConfig.callbackToken ?? "",
    encodingAesKey: wecomConfig.encodingAesKey ?? "",
    corpId: wecomConfig.corpId ?? "",
    corpSecret: wecomConfig.corpSecret ?? "",
    sendThinkingMessage: wecomConfig.sendThinkingMessage ?? true,
    config: wecomConfig,
  };
}

/** 是否已配置当前接收模式所需字段 */
export function isWecomAccountConfigured(account: ResolvedWeComAccount): boolean {
  if (account.receiveMode === "http") {
    return Boolean(
      account.callbackUrl?.trim() &&
        account.callbackToken?.trim() &&
        account.encodingAesKey?.trim(),
    );
  }
  return Boolean(account.botId?.trim() && account.secret?.trim());
}

/**
 * 设置企业微信账户配置
 */
export function setWeComAccount(
  cfg: OpenClawConfig,
  account: Partial<WeComConfig>,
): OpenClawConfig {
  const existing = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const merged: WeComConfig = {
    enabled: account.enabled ?? existing?.enabled ?? true,
    botId: account.botId ?? existing?.botId ?? "",
    secret: account.secret ?? existing?.secret ?? "",
    ...(account.receiveMode !== undefined || existing?.receiveMode
      ? { receiveMode: account.receiveMode ?? existing?.receiveMode }
      : {}),
    ...(account.callbackToken !== undefined || existing?.callbackToken
      ? { callbackToken: account.callbackToken ?? existing?.callbackToken }
      : {}),
    ...(account.encodingAesKey !== undefined || existing?.encodingAesKey
      ? { encodingAesKey: account.encodingAesKey ?? existing?.encodingAesKey }
      : {}),
    ...(account.callbackUrl !== undefined || existing?.callbackUrl
      ? { callbackUrl: account.callbackUrl ?? existing?.callbackUrl }
      : {}),
    allowFrom: account.allowFrom ?? existing?.allowFrom,
    dmPolicy: account.dmPolicy ?? existing?.dmPolicy,
    // 以下字段仅在已有配置值或显式传入时才写入，onboarding 时不主动生成
    ...(account.websocketUrl || existing?.websocketUrl
      ? { websocketUrl: account.websocketUrl ?? existing?.websocketUrl }
      : {}),
    ...(account.name || existing?.name
      ? { name: account.name ?? existing?.name }
      : {}),
    ...(account.sendThinkingMessage !== undefined || existing?.sendThinkingMessage !== undefined
      ? { sendThinkingMessage: account.sendThinkingMessage ?? existing?.sendThinkingMessage }
      : {}),
  };

return {
    ...cfg,
    channels: {
      ...cfg.channels,
      [CHANNEL_ID]: merged,
    },
  };
}
