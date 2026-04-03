# 企业微信URL回调超时优化说明

## 问题背景

在URL回调模式下,当用户提问较复杂,OpenClaw执行时间较长(超过5分钟)时,HTTP连接可能断开,导致无法响应用户。

## 解决方案

新增**主动消息推送**功能,当检测到流式回复超时(errcode 846608)时,自动切换为主动推送API发送消息。

## 配置方法

在 `openclaw.json` 中添加企业微信的 `corpId` 和 `corpSecret`:

```json
{
  "channels": {
    "wecom": {
      "receiveMode": "http",
      "callbackUrl": "https://your-domain.com/channels/wecom/callback",
      "callbackToken": "your_callback_token",
      "encodingAesKey": "your_encoding_aes_key_43_chars",
      "corpId": "your_corp_id",
      "corpSecret": "your_corp_secret"
    }
  }
}
```

### 配置项说明

- `corpId`: 企业ID,在企业微信管理后台「我的企业」-「企业信息」中查看
- `corpSecret`: 应用Secret,在企业微信管理后台「应用管理」-「自建应用」中查看

## 工作原理

1. **正常流程**: 使用被动回复或response_url方式发送消息
2. **超时检测**: 当收到 errcode 846608 (流式消息超过6分钟)时
3. **自动切换**:
   - 如果配置了 `corpId` 和 `corpSecret`,使用主动推送API发送
   - 如果未配置,降级为普通markdown回复(可能失败)

## 优势

- **无缝切换**: 用户无感知,自动选择最佳发送方式
- **提高成功率**: 即使连接超时,也能通过主动推送送达消息
- **向后兼容**: 未配置corpId/corpSecret时,保持原有行为

## 注意事项

1. 主动推送API需要企业微信应用的权限,确保应用已启用
2. access_token会自动缓存,有效期7200秒(提前5分钟刷新)
3. 建议配置corpId和corpSecret以获得最佳体验

## API参考

- [主动回复消息](https://developer.work.weixin.qq.com/document/path/101138)
- [被动回复消息](https://developer.work.weixin.qq.com/document/path/101031)
- [获取access_token](https://developer.work.weixin.qq.com/document/path/91039)
