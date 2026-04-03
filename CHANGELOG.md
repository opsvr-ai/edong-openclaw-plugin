# 更新日志

## 2026-03-30 - URL回调超时优化

### 新增功能

- **主动消息推送支持**: 当URL回调模式下流式回复超时(errcode 846608)时,自动切换为主动推送API发送消息
- **新增配置项**: `corpId` 和 `corpSecret` 用于主动消息推送

### 修改文件

1. `src/wecom-proactive-sender.ts` (新增)
   - 实现主动消息推送API
   - access_token自动缓存管理

2. `src/utils.ts`
   - WeComConfig新增corpId和corpSecret字段
   - ResolvedWeComAccount新增对应字段

3. `src/wecom-transport.ts`
   - WecomReplyTransport新增supportsProactive和sendProactive
   - createPassiveHttpEncryptedReplyTransport支持主动推送

4. `src/monitor.ts`
   - finishThinkingStream函数优化,支持主动推送降级

5. `src/http-callback.ts`
   - 传递corpId和corpSecret到transport

### 配置示例

```json
{
  "channels": {
    "wecom": {
      "receiveMode": "http",
      "callbackUrl": "https://your-domain.com/channels/wecom/callback",
      "callbackToken": "your_token",
      "encodingAesKey": "your_aes_key",
      "corpId": "your_corp_id",
      "corpSecret": "your_corp_secret"
    }
  }
}
```

### 工作原理

1. 正常情况下使用被动回复或response_url
2. 检测到流式超时(errcode 846608)时
3. 如果配置了corpId/corpSecret,使用主动推送API
4. 否则降级为普通markdown回复

### 优势

- 无缝切换,用户无感知
- 提高长时间处理场景的成功率
- 向后兼容,未配置时保持原有行为
