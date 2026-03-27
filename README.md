> 💡 **快速上手指引 & 交流群**
>
> 📖 [点击查看完整接入指引文档](https://doc.weixin.qq.com/doc/w3_AFYA1wY6ACoCNRxfnyGRJQaSa6jjJ?scode=AJEAIQdfAAo0RJmzxLAFYA1wY6ACo) — 包含配置步骤、产品介绍、常见问题解答等。
>
> 💬 扫码加入企业微信交流群：
>
> <img src="https://wwcdn.weixin.qq.com/node/wework/images/202603241759.3fb01c32cc.png" alt="扫码入群交流" width="200" />

# 特别说明
> ****2026.3.22 版本 OpenClaw 兼容说明****
> 
> 如果你的 OpenClaw 是 2026.3.22 及以上的版本，请升级插件到 2026.3.24 及以上版本。
> 
> 如果你的 OpenClaw 是 2026.3.22 以下的版本，请保持插件版本在 2026.3.20 版本。
> 
> 你可以使用以下命令快速安装： `npx -y @wecom/wecom-openclaw-cli install --force`

# 🤖 Edong OpenClaw Plugin

**Edong (联盟E动) channel plugin for [OpenClaw](https://github.com/openclaw)**.

> A bot plugin powered by Edong (联盟E动) AI Bot WebSocket persistent connections. Supports direct messages & group chats, streaming replies, and proactive messaging.

---

📖 [WeCom AI Bot Official Documentation](https://open.work.weixin.qq.com/help?doc_id=21657)


## ✨ Features

- 🔗 WebSocket persistent connection for stable communication
- 💬 Supports both direct messages (DM) and group chat
- 📤 Proactive messaging to specific users or groups
- 🖼️ Receives and processes image and file messages with automatic downloading
- ⏳ Streaming replies with "thinking" placeholder messages
- 📝 Markdown formatting support for replies
- 🔒 Built-in access control: DM Policy (pairing / open / allowlist / disabled) and Group Policy (open / allowlist / disabled)
- ⚡ Auto heartbeat keep-alive and reconnection (up to 100 reconnect attempts)
- 🧙 Interactive CLI setup wizard

---

## 🚀 Getting Started

### Requirements

- OpenClaw `>= 2026.2.13`

### Quick Install

Use the CLI tool to automatically install the plugin and complete bot configuration in one step:

```shell
# Automatically install the channel plugin and quickly complete configuration; also works for updates
npx -y @wecom/wecom-openclaw-cli install
```

More Options
```shell
# If installation fails, try force install
npx -y @wecom/wecom-openclaw-cli install --force

# Use --help to learn more about the tool
npx -y @wecom/wecom-openclaw-cli --help
```

### Manual Install

```shell
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### Configuration

#### Option 1: Interactive Setup

```shell
openclaw channels add
```

Follow the prompts to enter your WeCom bot's **Bot ID** and **Secret**.

#### Option 2: CLI Quick Setup

```shell
openclaw config set channels.wecom.botId <YOUR_BOT_ID>
openclaw config set channels.wecom.secret <YOUR_BOT_SECRET>
openclaw config set channels.wecom.enabled true
openclaw gateway restart
```

### Configuration Reference

| Config Path | Description | Options | Default |
|---|---|---|---|
| `channels.wecom.botId` | WeCom bot ID | — | — |
| `channels.wecom.secret` | WeCom bot secret | — | — |
| `channels.wecom.enabled` | Enable the channel | `true` / `false` | `false` |
| `channels.wecom.websocketUrl` | WebSocket endpoint | — | `wss://openws.work.weixin.qq.com` |
| `channels.wecom.dmPolicy` | DM access policy | `pairing` / `open` / `allowlist` / `disabled` | `open` |
| `channels.wecom.allowFrom` | DM allowlist (user IDs) | — | `[]` |
| `channels.wecom.groupPolicy` | Group chat access policy | `open` / `allowlist` / `disabled` | `open` |
| `channels.wecom.groupAllowFrom` | Group allowlist (group IDs) | — | `[]` |
| `channels.wecom.sendThinkingMessage` | Send "thinking" placeholder | `true` / `false` | `true` |
| `channels.wecom.receiveMode` | Inbound API mode (see WeCom admin) | `websocket` / `http` | `websocket` |
| `channels.wecom.callbackUrl` | URL callback: full **callback URL** (same as WeCom admin “receive messages”) | — | — |
| `channels.wecom.callbackToken` | URL callback: **Token** from bot admin | — | — |
| `channels.wecom.encodingAesKey` | URL callback: **EncodingAESKey** (43 chars) | — | — |

#### URL callback (HTTP) mode

When the bot is set to **receive messages via URL** in WeCom (not WebSocket), align with [WeCom callback encryption (path/101033)](https://developer.work.weixin.qq.com/document/path/101033):

1. `channels.wecom.receiveMode` to `http`
2. `channels.wecom.callbackUrl`, `channels.wecom.callbackToken`, `channels.wecom.encodingAesKey` — the same **URL**, **Token**, and **EncodingAESKey** as in the WeCom admin console (typically the callback URL is your **OpenClaw gateway** public URL + `/channels/wecom/callback`, e.g. `https://your-host/channels/wecom/callback`)
3. **Bot ID / Secret** are only required for **WebSocket** mode; they are not needed for URL callback inbound.

Replies use `response_url` (HTTP POST). Proactive outbound messaging and media upload still require **long-connection** mode (`receiveMode` default `websocket` with `secret`).

---

## 🔒 Access Control

### DM (Direct Message) Access

**Default**: `dmPolicy: "open"` — all users can send direct messages without approval.

#### Approve Pairing

```shell
openclaw pairing list wecom            # View pending pairing requests
openclaw pairing approve wecom <CODE>  # Approve a pairing request
```

#### Allowlist Mode

Configure allowed user IDs via `channels.wecom.allowFrom`:

```json
{
  "channels": {
    "wecom": {
      "dmPolicy": "allowlist",
      "allowFrom": ["user_id_1", "user_id_2"]
    }
  }
}
```

#### Open Mode

Set `dmPolicy: "open"` to allow all users to send direct messages without approval.

#### Disabled Mode

Set `dmPolicy: "disabled"` to completely block all direct messages.

### Group Access

#### Group Policy (`channels.wecom.groupPolicy`)

- `"open"` — Allow messages from all groups (default)
- `"allowlist"` — Only allow groups listed in `groupAllowFrom`
- `"disabled"` — Disable all group messages

### Group Configuration Examples

#### Allow All Groups (Default Behavior)

```json
{
  "channels": {
    "wecom": {
      "groupPolicy": "open"
    }
  }
}
```

#### Allow Only Specific Groups

```json
{
  "channels": {
    "wecom": {
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["group_id_1", "group_id_2"]
    }
  }
}
```

#### Allow Only Specific Senders Within a Group (Sender Allowlist)

In addition to the group allowlist, you can restrict which members within a group are allowed to interact with the bot. Only messages from users listed in `groups.<chatId>.allowFrom` will be processed; messages from other members will be silently ignored. This is a sender-level allowlist that applies to **all messages**.

```json
{
  "channels": {
    "wecom": {
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["group_id_1"],
      "groups": {
        "group_id_1": {
          "allowFrom": ["user_id_1", "user_id_2"]
        }
      }
    }
  }
}
```

---

## 📦 Update

```shell
openclaw plugins update wecom-openclaw-plugin
```

---

## 📄 License

MIT
