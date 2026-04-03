/**
 * 企业微信主动消息推送模块
 *
 * 用于URL回调模式下,当连接超时无法被动回复时,
 * 通过主动消息推送API发送消息
 *
 * @see https://developer.work.weixin.qq.com/document/path/101138
 */

import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { REPLY_SEND_TIMEOUT_MS } from "./const.js";
import { withTimeout } from "./timeout.js";

/** 企业微信API基础地址 */
const WECOM_API_BASE = "https://qyapi.weixin.qq.com/cgi-bin";

/** access_token缓存 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCacheMap = new Map<string, TokenCache>();

/**
 * 获取企业微信access_token
 */
async function getAccessToken(params: {
  corpId: string;
  corpSecret: string;
  runtime: RuntimeEnv;
}): Promise<string> {
  const { corpId, corpSecret, runtime } = params;
  const cacheKey = `${corpId}:${corpSecret}`;

  // 检查缓存
  const cached = tokenCacheMap.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // 获取新token
  const url = `${WECOM_API_BASE}/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`;
  const res = await withTimeout(
    fetch(url),
    10000,
    "Get access_token timeout"
  );

  if (!res.ok) {
    throw new Error(`Get access_token failed: ${res.status}`);
  }

  const data = await res.json() as {
    errcode: number;
    errmsg: string;
    access_token?: string;
    expires_in?: number;
  };

  if (data.errcode !== 0 || !data.access_token) {
    throw new Error(`Get access_token failed: ${data.errmsg}`);
  }

  // 缓存token(提前5分钟过期)
  const expiresIn = (data.expires_in || 7200) - 300;
  tokenCacheMap.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  runtime.log?.(`[wecom] Got access_token, expires in ${expiresIn}s`);
  return data.access_token;
}

/**
 * 通过主动消息推送API发送消息
 *
 * @param params.corpId 企业ID
 * @param params.corpSecret 应用Secret
 * @param params.chatId 会话ID
 * @param params.msgtype 消息类型
 * @param params.content 消息内容
 */
export async function sendProactiveMessage(params: {
  corpId: string;
  corpSecret: string;
  chatId: string;
  msgtype: "text" | "markdown";
  content: string;
  runtime: RuntimeEnv;
}): Promise<void> {
  const { corpId, corpSecret, chatId, msgtype, content, runtime } = params;

  const accessToken = await getAccessToken({ corpId, corpSecret, runtime });
  const url = `${WECOM_API_BASE}/message/send?access_token=${encodeURIComponent(accessToken)}`;

  const body: any = {
    touser: chatId,
    msgtype,
    agentid: 0, // 智能机器人使用0
  };

  if (msgtype === "text") {
    body.text = { content };
  } else if (msgtype === "markdown") {
    body.markdown = { content };
  }

  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    }),
    REPLY_SEND_TIMEOUT_MS,
    "Proactive message send timeout"
  );

  if (!res.ok) {
    throw new Error(`Proactive send failed: ${res.status}`);
  }

  const data = await res.json() as {
    errcode: number;
    errmsg: string;
  };

  if (data.errcode !== 0) {
    throw new Error(`Proactive send failed: ${data.errmsg}`);
  }

  runtime.log?.(`[wecom] Proactive message sent to ${chatId}`);
}

