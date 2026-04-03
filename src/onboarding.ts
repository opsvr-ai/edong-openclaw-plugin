/**
 * 企业微信 setupWizard — 声明式 CLI setup wizard 配置。
 *
 * 框架通过 plugin.setupWizard 字段识别并驱动 channel 的引导配置流程。
 */

import type { ChannelSetupWizard, ChannelSetupDmPolicy } from "openclaw/plugin-sdk/setup";
import type { ChannelSetupAdapter } from "openclaw/plugin-sdk/setup";
import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
import { addWildcardAllowFrom } from "./openclaw-compat.js";
import type { WeComConfig } from "./utils.js";
import { resolveWeComAccount, setWeComAccount, isWecomAccountConfigured } from "./utils.js";
import { DEFAULT_CALLBACK_PATH } from "./http-callback.js";
import { CHANNEL_ID } from "./const.js";

// ============================================================================
// ChannelSetupAdapter — 框架用于应用配置输入的适配器
// ============================================================================

export const wecomSetupAdapter: ChannelSetupAdapter = {
  applyAccountConfig: ({ cfg, input }) => {
    const patch: Partial<WeComConfig> = {};

    if (input.token !== undefined) {
      patch.botId = String(input.token).trim();
    }
    if (input.privateKey !== undefined) {
      patch.secret = String(input.privateKey).trim();
    }
    if (input.webhookUrl !== undefined) {
      patch.callbackUrl = String(input.webhookUrl).trim();
    }

    // 如果是首次配置，默认启用（从空凭据开始填写时）
    const account = resolveWeComAccount(cfg);
    const emptyCredentials =
      account.receiveMode === "http"
        ? !account.callbackUrl?.trim() &&
          !account.callbackToken?.trim() &&
          !account.encodingAesKey?.trim()
        : !account.botId?.trim() && !account.secret?.trim();
    if (emptyCredentials) {
      patch.enabled = true;
    }

    return setWeComAccount(cfg, patch);
  },
};

// ============================================================================
// DM Policy 配置
// ============================================================================

/**
 * 设置企业微信 dmPolicy
 */
function setWeComDmPolicy(
  cfg: OpenClawConfig,
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled",
): OpenClawConfig {
  const account = resolveWeComAccount(cfg);
  const existingAllowFrom = account.config.allowFrom ?? [];
  const allowFrom =
    dmPolicy === "open"
      ? addWildcardAllowFrom(existingAllowFrom.map((x) => String(x)))
      : existingAllowFrom.map((x) => String(x));

  return setWeComAccount(cfg, {
    dmPolicy,
    allowFrom,
  });
}

const dmPolicy: ChannelSetupDmPolicy = {
  label: "联盟E动",
  channel: CHANNEL_ID,
  policyKey: `channels.${CHANNEL_ID}.dmPolicy`,
  allowFromKey: `channels.${CHANNEL_ID}.allowFrom`,
  getCurrent: (cfg) => {
    const account = resolveWeComAccount(cfg);
    return account.config.dmPolicy ?? "open";
  },
  setPolicy: (cfg, policy) => {
    return setWeComDmPolicy(cfg, policy);
  },
  promptAllowFrom: async ({ cfg, prompter }) => {
    const account = resolveWeComAccount(cfg);
    const existingAllowFrom = account.config.allowFrom ?? [];

    const entry = await prompter.text({
      message: "联盟E动允许来源（用户ID或群组ID，逗号分隔）",
      placeholder: "user123, group456",
      initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : undefined,
    });

    const allowFrom = String(entry ?? "")
      .split(/[\n,;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    return setWeComAccount(cfg, { allowFrom });
  },
};

// ============================================================================
// ChannelSetupWizard — 声明式 setup wizard 配置
// ============================================================================

export const wecomSetupWizard: ChannelSetupWizard = {
  channel: CHANNEL_ID,

  // ── 状态 ──────────────────────────────────────────────────────────────
  status: {
    configuredLabel: "已配置 ✓",
    unconfiguredLabel: "需要完成凭据配置",
    configuredHint: "已配置",
    unconfiguredHint: "需要设置",
    resolveConfigured: ({ cfg }) => {
      return isWecomAccountConfigured(resolveWeComAccount(cfg));
    },
    resolveStatusLines: ({ cfg, configured }) => {
      const account = resolveWeComAccount(cfg);
      const mode =
        account.receiveMode === "http" ? "URL 回调" : "长连接";
      return [`联盟E动: ${configured ? "已配置" : "未完成配置"}（${mode}）`];
    },
  },

  // ── 引导说明 ──────────────────────────────────────────────────────────
  introNote: {
    title: "联盟E动设置",
    lines: [
      "接下来会先选择接收消息方式（与企微后台「API 模式」一致，长连接与 URL 回调互斥）。",
      "长连接：需要 Bot ID + Secret（WebSocket）。",
      `URL 回调：与企微「接收消息」一致，填写 URL、Token、EncodingAESKey（见文档 path/101033）；URL 通常为网关公网地址 + ${DEFAULT_CALLBACK_PATH} 。`,
    ],
    shouldShow: ({ cfg }) => {
      return !isWecomAccountConfigured(resolveWeComAccount(cfg));
    },
  },

  prepare: async ({ cfg, prompter }) => {
    const account = resolveWeComAccount(cfg);
    const initial: "websocket" | "http" =
      account.receiveMode === "http" ? "http" : "websocket";
    const mode = await prompter.select<"websocket" | "http">({
      message: "智能机器人接收消息方式",
      options: [
        {
          value: "websocket",
          label: "长连接（WebSocket）",
          hint: "需 Bot ID + Secret，无需公网回调 URL",
        },
        {
          value: "http",
          label: "接收消息 URL（HTTP 回调）",
          hint: `需 Token + EncodingAESKey；回调地址填 …${DEFAULT_CALLBACK_PATH}`,
        },
      ],
      initialValue: initial,
    });
    let next = cfg;
    if (mode === "http") {
      next = setWeComAccount(next, {
        receiveMode: "http",
        secret: "",
        botId: "",
      });
    } else {
      next = setWeComAccount(next, {
        receiveMode: "websocket",
        callbackUrl: "",
        callbackToken: "",
        encodingAesKey: "",
      });
    }
    return { cfg: next };
  },

  // ── 凭据输入 ──────────────────────────────────────────────────────────
  credentials: [
    {
      inputKey: "token",
      providerHint: "联盟E动",
      credentialLabel: "Bot ID",
      envPrompt: "使用环境变量中的 Bot ID？",
      keepPrompt: "Bot ID 已配置，保留当前值？",
      inputPrompt: "联盟E动机器人 Bot ID",
      inspect: ({ cfg }) => {
        const account = resolveWeComAccount(cfg);
        const hasValue = Boolean(account.botId?.trim());
        return {
          accountConfigured: hasValue,
          hasConfiguredValue: hasValue,
          resolvedValue: account.botId || undefined,
        };
      },
      applySet: ({ cfg, resolvedValue }) => {
        return setWeComAccount(cfg, { botId: resolvedValue });
      },
      shouldPrompt: ({ cfg }) => {
        return resolveWeComAccount(cfg).receiveMode !== "http";
      },
    },
    {
      inputKey: "privateKey",
      providerHint: "联盟E动",
      credentialLabel: "Secret",
      envPrompt: "使用环境变量中的 Secret？",
      keepPrompt: "Secret 已配置，保留当前值？",
      inputPrompt: "联盟E动机器人 Secret",
      inspect: ({ cfg }) => {
        const account = resolveWeComAccount(cfg);
        const hasValue = Boolean(account.secret?.trim());
        return {
          accountConfigured: hasValue,
          hasConfiguredValue: hasValue,
          resolvedValue: account.secret || undefined,
        };
      },
      applySet: ({ cfg, resolvedValue }) => {
        return setWeComAccount(cfg, { secret: resolvedValue });
      },
      shouldPrompt: ({ cfg }) => {
        return resolveWeComAccount(cfg).receiveMode !== "http";
      },
    },
  ],

  textInputs: [
    {
      inputKey: "webhookUrl",
      message: "接收消息 URL（与企微管理台「API 接收消息」中填写的 URL 一致）",
      placeholder: `https://你的网关${DEFAULT_CALLBACK_PATH}`,
      required: true,
      shouldPrompt: ({ cfg }) => resolveWeComAccount(cfg).receiveMode === "http",
      currentValue: ({ cfg }) => {
        const u = resolveWeComAccount(cfg).callbackUrl?.trim();
        return u || undefined;
      },
      validate: ({ value }) => {
        const v = value.trim();
        if (!v) return undefined;
        try {
          const u = new URL(v);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            return "URL 须以 http:// 或 https:// 开头";
          }
        } catch {
          return "请输入有效的 http(s) URL";
        }
        return undefined;
      },
      applySet: ({ cfg, value }) =>
        setWeComAccount(cfg, { callbackUrl: value.trim() }),
    },
    {
      inputKey: "accessToken",
      message: "接收消息回调 Token（企微管理台「Token」）",
      placeholder: "与 API 接收消息配置中的 Token 一致",
      required: true,
      shouldPrompt: ({ cfg }) => resolveWeComAccount(cfg).receiveMode === "http",
      currentValue: ({ cfg }) => {
        const t = resolveWeComAccount(cfg).callbackToken?.trim();
        return t || undefined;
      },
      applySet: ({ cfg, value }) =>
        setWeComAccount(cfg, { callbackToken: value.trim() }),
    },
    {
      inputKey: "password",
      message: "EncodingAESKey（43 位，与接收消息配置一致）",
      placeholder: "43 字符",
      required: true,
      shouldPrompt: ({ cfg }) => resolveWeComAccount(cfg).receiveMode === "http",
      currentValue: ({ cfg }) => {
        const t = resolveWeComAccount(cfg).encodingAesKey?.trim();
        return t || undefined;
      },
      validate: ({ value }) => {
        const v = value.trim();
        if (v.length > 0 && v.length !== 43) {
          return "EncodingAESKey 长度应为 43";
        }
        return undefined;
      },
      applySet: ({ cfg, value }) =>
        setWeComAccount(cfg, { encodingAesKey: value.trim() }),
    },
  ],

  // ── 完成后的最终处理 ──────────────────────────────────────────────────
  finalize: async ({ cfg }) => {
    const account = resolveWeComAccount(cfg);
    if (isWecomAccountConfigured(account) && !account.enabled) {
      return { cfg: setWeComAccount(cfg, { enabled: true }) };
    }
    return undefined;
  },

  // ── 完成提示 ──────────────────────────────────────────────────────────
  completionNote: {
    title: "联盟E动配置完成",
    lines: [
      "联盟E动机器人已配置完成。",
      "运行 `openclaw start` 启动服务。",
    ],
    shouldShow: ({ cfg }) => {
      return isWecomAccountConfigured(resolveWeComAccount(cfg));
    },
  },

  // ── DM 策略 ──────────────────────────────────────────────────────────
  dmPolicy,

  // ── 禁用 ─────────────────────────────────────────────────────────────
  disable: (cfg) => {
    return setWeComAccount(cfg, { enabled: false });
  },
};
