/**
 * 企业微信智能机器人「接收消息 URL」HTTP 回调（GET 验证 + POST 收消息）
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawConfig, OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { WsCmd, type WsFrame } from "@wecom/aibot-node-sdk";
import {
  buildEncryptedJsonResponse,
  decryptEncryptField,
  decryptUrlVerifyEchoStr,
  verifyMsgSignature,
} from "./wecom-callback-crypto.js";
import { getWeComRuntime } from "./runtime.js";
import { processWeComMessage } from "./monitor.js";
import { resolveWeComAccount, type ResolvedWeComAccount } from "./utils.js";
import { CHANNEL_ID } from "./const.js";
import { wrapRuntimeEnvWithDebug } from "./debug-log.js";
import { resolveResponseUrl } from "./wecom-transport.js";
import { getWeComWebSocket } from "./state-manager.js";

const DEFAULT_CALLBACK_PATH = "/channels/wecom/callback";

/**
 * 无 response_url 时：同一条用户消息在长耗时下可能被企微重试，产生第二条 POST（新 TCP、新 res）。
 * 若并行跑两次 processWeComMessage，后到的请求可能被 OpenClaw 入站去重跳过，却先结束 HTTP 并写入兜底短文案；
 * 先到的连接稍后写完完整密文，客户端表现混乱或像「第二次无响应」。
 * 对同一 msgid 串行：仅第一条进入 agent，重复 POST 只 ack 空包。
 */
const passiveHttpInFlightMsgids = new Set<string>();

function resolvePluginRuntimeEnv(): RuntimeEnv {
  const pr = getWeComRuntime();
  const child = pr.logging.getChildLogger({ plugin: "wecom-http" });
  const runtimeEnv: RuntimeEnv = {
    log: (...args: unknown[]) => {
      child.info(args.map(String).join(" "));
    },
    error: (...args: unknown[]) => {
      child.error(args.map(String).join(" "));
    },
    exit: (code: number) => {
      process.exit(code);
    },
  };
  return wrapRuntimeEnvWithDebug(runtimeEnv, "http-callback");
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * 将解密后的 JSON 规范为与 WebSocket 一致的 WsFrame
 */
function normalizeDecryptedFrame(json: unknown): WsFrame | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.cmd === "string" && o.headers && typeof o.headers === "object") {
    const h = o.headers as { req_id?: string };
    if (typeof h.req_id === "string") {
      return o as unknown as WsFrame;
    }
  }
  if (typeof o.msgtype === "string" && typeof o.msgid === "string") {
    return {
      cmd: WsCmd.CALLBACK,
      headers: { req_id: String(o.msgid) },
      body: o,
    };
  }
  return null;
}

function sendEncryptedOk(
  res: ServerResponse,
  token: string,
  encodingAesKey: string,
  nonce: string,
): void {
  const plain = JSON.stringify({});
  const { body } = buildEncryptedJsonResponse(token, encodingAesKey, plain, nonce);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}

function sendPlainText(res: ServerResponse, status: number, text: string): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

function extractEncryptFromXml(xml: string): string {
  const cdataMatch = xml.match(/<Encrypt><!\[CDATA\[([\s\S]*?)\]\]><\/Encrypt>/i);
  if (cdataMatch?.[1]) {
    return cdataMatch[1].trim();
  }
  const plainMatch = xml.match(/<Encrypt>([^<]+)<\/Encrypt>/i);
  return plainMatch?.[1]?.trim() ?? "";
}

function extractEncryptField(raw: string): string {
  const body = raw.trim();
  if (!body) return "";

  // JSON 模式（企微智能机器人 URL 回调常见）
  if (body.startsWith("{")) {
    try {
      const parsed = JSON.parse(body) as { encrypt?: string; Encrypt?: string };
      return (parsed.encrypt ?? parsed.Encrypt ?? "").trim();
    } catch {
      return "";
    }
  }

  // 兼容 XML 模式回调包
  if (body.startsWith("<")) {
    return extractEncryptFromXml(body);
  }

  return "";
}

async function handleIncomingCallback(params: {
  account: ResolvedWeComAccount;
  cfg: OpenClawConfig;
  req: IncomingMessage;
  res: ServerResponse;
  token: string;
  encodingAesKey: string;
  msgSignature: string;
  timestamp: string;
  nonce: string;
}): Promise<void> {
  const { account, cfg, req, res, token, encodingAesKey, msgSignature, timestamp, nonce } = params;
  const runtimeEnv = resolvePluginRuntimeEnv();

  if (req.method === "GET") {
    const url = new URL(req.url ?? "/", "http://localhost");
    const echostrRaw = url.searchParams.get("echostr") ?? "";
    let echostr = echostrRaw;
    try {
      echostr = decodeURIComponent(echostrRaw);
    } catch {
      /* use raw */
    }
    try {
      const plain = decryptUrlVerifyEchoStr(token, timestamp, nonce, echostr, msgSignature, encodingAesKey);
      sendPlainText(res, 200, plain);
    } catch (e) {
      runtimeEnv.error(`[wecom] URL verify failed: ${String(e)}`);
      sendPlainText(res, 403, "verify failed");
    }
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return;
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch (e) {
    runtimeEnv.error(`[wecom] read body failed: ${String(e)}`);
    res.statusCode = 400;
    res.end();
    return;
  }

  const encrypt = extractEncryptField(raw);
  if (!encrypt) {
    sendPlainText(res, 400, "missing encrypt");
    return;
  }

  if (!verifyMsgSignature(token, timestamp, nonce, encrypt, msgSignature)) {
    sendPlainText(res, 403, "invalid signature");
    return;
  }

  let plain: string;
  try {
    plain = decryptEncryptField(encodingAesKey, encrypt, "");
  } catch (e) {
    runtimeEnv.error(`[wecom] decrypt failed: ${String(e)}`);
    sendPlainText(res, 400, "decrypt failed");
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(plain);
  } catch {
    runtimeEnv.error(`[wecom] decrypted payload is not json: ${plain.slice(0, 200)}`);
    sendPlainText(res, 400, "invalid plaintext");
    return;
  }

  if (
    payload &&
    typeof payload === "object" &&
    (payload as { msgtype?: string }).msgtype === "event"
  ) {
    runtimeEnv.log(`[wecom] http: skip event payload`);
    sendEncryptedOk(res, token, encodingAesKey, nonce);
    return;
  }

  const frame = normalizeDecryptedFrame(payload);
  if (!frame) {
    runtimeEnv.log(`[wecom] http: unrecognized payload shape`);
    sendEncryptedOk(res, token, encodingAesKey, nonce);
    return;
  }

  if (frame.cmd === WsCmd.EVENT_CALLBACK) {
    runtimeEnv.log(`[wecom] http: skip event callback (msgid=${(frame.body as { msgid?: string })?.msgid})`);
    sendEncryptedOk(res, token, encodingAesKey, nonce);
    return;
  }

  if (frame.cmd !== WsCmd.CALLBACK) {
    runtimeEnv.log(`[wecom] http: skip cmd=${frame.cmd}`);
    sendEncryptedOk(res, token, encodingAesKey, nonce);
    return;
  }

  // 流式刷新回调（msgtype=stream，无用户文本）：不是新一轮用户发言，不应走 agent；否则会「空内容跳过」且无明确日志。
  const streamCheck = frame.body as {
    msgtype?: string;
    stream?: { id?: string };
    text?: { content?: string };
  };
  if (
    streamCheck.msgtype === "stream" &&
    !streamCheck.text?.content?.trim()
  ) {
    runtimeEnv.log(
      `[wecom] http: msgtype=stream without user text (stream refresh id=${streamCheck.stream?.id ?? "n/a"}), ack empty only`,
    );
    sendEncryptedOk(res, token, encodingAesKey, nonce);
    return;
  }

  const responseUrl = resolveResponseUrl(frame);
  if (!responseUrl) {
    const msgid = (frame.body as { msgid?: string } | undefined)?.msgid?.trim();
    if (msgid && passiveHttpInFlightMsgids.has(msgid)) {
      runtimeEnv.log(
        `[wecom] http: passive duplicate POST while first still in-flight (msgid=${msgid}), ack empty encrypted only`,
      );
      sendEncryptedOk(res, token, encodingAesKey, nonce);
      return;
    }
    if (msgid) {
      passiveHttpInFlightMsgids.add(msgid);
    }

    const releaseMsgidLock = () => {
      if (msgid) {
        passiveHttpInFlightMsgids.delete(msgid);
      }
    };

    const ws = getWeComWebSocket(account.accountId);
    if (ws?.isConnected) {
      runtimeEnv.log(
        `[wecom] http: no response_url but WS connected → ack empty encrypted, then async proactive reply via stream (hybrid)`,
      );
      sendEncryptedOk(res, token, encodingAesKey, nonce);
      void processWeComMessage({
        frame,
        account,
        config: cfg,
        runtime: runtimeEnv,
        wsClient: ws,
        httpCallbackQueryNonce: nonce,
      })
        .catch((err) => {
          runtimeEnv.error(`[wecom] http callback process failed: ${String(err)}`);
        })
        .finally(releaseMsgidLock);
      return;
    }

    runtimeEnv.log(
      `[wecom] http: no response_url and WS offline → passive encrypted body in same HTTP response (doc 101033); configure websocketUrl/secret + channel running for hybrid`,
    );
    try {
      await processWeComMessage({
        frame,
        account,
        config: cfg,
        runtime: runtimeEnv,
        wsClient: null,
        passiveHttpReply: { res, token, encodingAesKey, nonce },
        httpCallbackQueryNonce: nonce,
      });
      if (!res.writableEnded) {
        sendEncryptedOk(res, token, encodingAesKey, nonce);
      }
    } catch (err) {
      runtimeEnv.error(`[wecom] http callback process failed: ${String(err)}`);
      if (!res.writableEnded) {
        sendEncryptedOk(res, token, encodingAesKey, nonce);
      }
    } finally {
      releaseMsgidLock();
    }
    return;
  }

  sendEncryptedOk(res, token, encodingAesKey, nonce);

  void processWeComMessage({
    frame,
    account,
    config: cfg,
    runtime: runtimeEnv,
    wsClient: null,
    httpCallbackQueryNonce: nonce,
  }).catch((err) => {
    runtimeEnv.error(`[wecom] http callback process failed: ${String(err)}`);
  });
}

/**
 * 注册 HTTP 回调路由（应在插件 register 阶段调用一次）
 */
export function registerWecomHttpCallbackRoute(api: OpenClawPluginApi): void {
  const path = DEFAULT_CALLBACK_PATH;
  api.registerHttpRoute({
    path,
    auth: "plugin",
    match: "exact",
    handler: async (req, res) => {
      const pr = getWeComRuntime();
      const runtimeEnv = resolvePluginRuntimeEnv();
      const cfg = pr.config.loadConfig() as OpenClawConfig;
      const account = resolveWeComAccount(cfg);
      if (account.receiveMode !== "http") {
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("wecom receiveMode is not http");
        return true;
      }
      const token = account.callbackToken.trim();
      const encodingAesKey = account.encodingAesKey.trim();
      if (!token || !encodingAesKey) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("wecom callback token/aes key not configured");
        return true;
      }

      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname.replace(/\/$/, "") !== path.replace(/\/$/, "")) {
        return false;
      }

      const msgSignature =
        url.searchParams.get("msg_signature") ??
        url.searchParams.get("signature") ??
        "";
      const timestamp = url.searchParams.get("timestamp") ?? "";
      const nonce = url.searchParams.get("nonce") ?? "";
      if (!msgSignature || !timestamp || !nonce) {
        sendPlainText(res, 400, "missing query params");
        return true;
      }

      const enabled = account.enabled !== false;
      const ch = cfg.channels?.[CHANNEL_ID] as { enabled?: boolean } | undefined;
      if (!enabled || ch?.enabled === false) {
        res.statusCode = 503;
        res.end("wecom channel disabled");
        return true;
      }

      try {
        await handleIncomingCallback({
          account,
          cfg,
          req,
          res,
          token,
          encodingAesKey,
          msgSignature,
          timestamp,
          nonce,
        });
      } catch (e) {
        runtimeEnv.error(`[wecom] http handler error: ${String(e)}`);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        }
      }
      return true;
    },
  });
  api.logger.info?.(`[wecom] registered HTTP callback at ${path}`);
}

export { DEFAULT_CALLBACK_PATH };
