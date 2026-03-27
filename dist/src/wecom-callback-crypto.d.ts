/**
 * 企业微信智能机器人「接收消息 URL」模式下的 JSON 加解密（与官方 wxbizmsgcrypt 算法一致）。
 * receiveid 在企业自建智能机器人场景下传空字符串。
 *
 * @see https://developer.work.weixin.qq.com/document/path/101033
 */
/**
 * 校验 msg_signature 是否与 token、timestamp、nonce、encrypt 一致
 */
export declare function verifyMsgSignature(token: string, timestamp: string, nonce: string, encrypt: string, msgSignature: string): boolean;
/**
 * 解密 encrypt 字段（Base64 密文）得到 UTF-8 明文字符串（通常为 JSON）
 */
export declare function decryptEncryptField(encodingAesKey: string, encryptB64: string, receiveId?: string): string;
/**
 * 加密明文（通常为 JSON 字符串），得到 Base64 密文，用于被动回复包中的 encrypt 字段
 */
export declare function encryptToEncryptField(encodingAesKey: string, plainText: string, receiveId?: string): string;
/**
 * URL 验证（GET）：解密 echostr，返回需在响应体中回写的明文字符串
 */
export declare function decryptUrlVerifyEchoStr(token: string, timestamp: string, nonce: string, echostr: string, msgSignature: string, encodingAesKey: string): string;
/**
 * 构造被动回复 JSON 包（含签名），写入 HTTP 响应体
 */
export declare function buildEncryptedJsonResponse(token: string, encodingAesKey: string, plainJson: string, nonce: string): {
    body: string;
    timestamp: string;
};
