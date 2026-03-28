/**
 * 企业微信消息内容解析模块
 *
 * 负责从 WsFrame 中提取文本、图片、引用等内容
 */
export interface MessageBody {
    msgid: string;
    aibotid?: string;
    chatid?: string;
    chattype: "single" | "group";
    from: {
        userid: string;
    };
    response_url?: string;
    /** 部分回调仅下发 code，需拼成主动回复 URL（path/101138） */
    response_code?: string;
    msgtype: string;
    text?: {
        content: string;
    };
    image?: {
        url?: string;
        aeskey?: string;
    };
    voice?: {
        content?: string;
    };
    mixed?: {
        msg_item: Array<{
            msgtype: "text" | "image";
            text?: {
                content: string;
            };
            image?: {
                url?: string;
                aeskey?: string;
            };
        }>;
    };
    file?: {
        url?: string;
        aeskey?: string;
    };
    video?: {
        url?: string;
        aeskey?: string;
    };
    /** 事件/消息时间戳（秒），用于与 msgid 组合避免入站去重误判 */
    create_time?: number;
    quote?: {
        msgtype: string;
        text?: {
            content: string;
        };
        voice?: {
            content: string;
        };
        image?: {
            url?: string;
            aeskey?: string;
        };
        file?: {
            url?: string;
            aeskey?: string;
        };
    };
}
export interface ParsedMessageContent {
    textParts: string[];
    imageUrls: string[];
    imageAesKeys: Map<string, string>;
    fileUrls: string[];
    fileAesKeys: Map<string, string>;
    quoteContent: string | undefined;
}
/**
 * 解析消息内容（支持单条消息、图文混排和引用消息）
 * @returns 提取的文本数组、图片URL数组和引用消息内容
 */
export declare function parseMessageContent(body: MessageBody): ParsedMessageContent;
