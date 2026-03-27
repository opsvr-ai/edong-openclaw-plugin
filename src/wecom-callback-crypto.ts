/**
 * 企业微信智能机器人「接收消息 URL」模式下的 JSON 加解密（与官方 wxbizmsgcrypt 算法一致）。
 * receiveid 在企业自建智能机器人场景下传空字符串。
 *
 * @see https://developer.work.weixin.qq.com/document/path/101033
 */

import * as crypto from "node:crypto";

function sha1Hex(data: string): string {
  return crypto.createHash("sha1").update(data, "utf8").digest("hex");
}

function sortAndJoin(parts: string[]): string {
  return [...parts].sort().join("");
}

/**
 * 校验 msg_signature 是否与 token、timestamp、nonce、encrypt 一致
 */
export function verifyMsgSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
  msgSignature: string,
): boolean {
  const expect = sha1Hex(sortAndJoin([token, timestamp, nonce, encrypt]));
  return expect === msgSignature;
}

function pkcs7Unpad(buf: Buffer): Buffer {
  const pad = buf[buf.length - 1]!;
  if (pad < 1 || pad > 32) return buf;
  return buf.subarray(0, buf.length - pad);
}

function pkcs7Pad(buf: Buffer): Buffer {
  const block = 32;
  const pad = block - (buf.length % block);
  const out = Buffer.alloc(buf.length + pad);
  buf.copy(out);
  out.fill(pad, buf.length);
  return out;
}

function decodeAesKey(encodingAesKey: string): Buffer {
  const key = Buffer.from(encodingAesKey, "base64");
  if (key.length !== 32) {
    throw new Error(`Invalid EncodingAESKey: expected 32 bytes after base64 decode, got ${key.length}`);
  }
  return key;
}

/**
 * 解密 encrypt 字段（Base64 密文）得到 UTF-8 明文字符串（通常为 JSON）
 */
export function decryptEncryptField(encodingAesKey: string, encryptB64: string, receiveId = ""): string {
  const aesKey = decodeAesKey(encodingAesKey);
  const iv = aesKey.subarray(0, 16);
  const cipher = Buffer.from(encryptB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(cipher), decipher.final()]);
  const unpadded = pkcs7Unpad(decrypted);
  if (unpadded.length < 20) {
    throw new Error("Decrypted payload too short");
  }
  const content = unpadded.subarray(16);
  const msgLen = content.readUInt32BE(0);
  const msg = content.subarray(4, 4 + msgLen).toString("utf8");
  const tail = content.subarray(4 + msgLen).toString("utf8");
  if (receiveId !== "" && tail !== receiveId) {
    throw new Error("receiveId mismatch after decrypt");
  }
  return msg;
}

/**
 * 加密明文（通常为 JSON 字符串），得到 Base64 密文，用于被动回复包中的 encrypt 字段
 */
export function encryptToEncryptField(encodingAesKey: string, plainText: string, receiveId = ""): string {
  const aesKey = decodeAesKey(encodingAesKey);
  const iv = aesKey.subarray(0, 16);
  const msgBuf = Buffer.from(plainText, "utf8");
  const rand = crypto.randomBytes(16);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(msgBuf.length, 0);
  const tail = Buffer.from(receiveId, "utf8");
  const packed = Buffer.concat([rand, lenBuf, msgBuf, tail]);
  const padded = pkcs7Pad(packed);
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  return encrypted.toString("base64");
}

/**
 * URL 验证（GET）：解密 echostr，返回需在响应体中回写的明文字符串
 */
export function decryptUrlVerifyEchoStr(
  token: string,
  timestamp: string,
  nonce: string,
  echostr: string,
  msgSignature: string,
  encodingAesKey: string,
): string {
  if (!verifyMsgSignature(token, timestamp, nonce, echostr, msgSignature)) {
    throw new Error("Invalid msg_signature for URL verify");
  }
  return decryptEncryptField(encodingAesKey, echostr, "");
}

/**
 * 构造被动回复 JSON 包（含签名），写入 HTTP 响应体
 */
export function buildEncryptedJsonResponse(
  token: string,
  encodingAesKey: string,
  plainJson: string,
  nonce: string,
): { body: string; timestamp: string } {
  const encrypt = encryptToEncryptField(encodingAesKey, plainJson, "");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const msgSignature = sha1Hex(sortAndJoin([token, timestamp, nonce, encrypt]));
  const body = JSON.stringify({
    encrypt,
    // 官方字段名为 msg_signature；同时保留 msgsignature 兼容历史实现
    msg_signature: msgSignature,
    msgsignature: msgSignature,
    timestamp: Number(timestamp),
    nonce,
  });
  return { body, timestamp };
}
