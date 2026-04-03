import { W_ as defineChannelPluginEntry } from "./pi-embedded-CswW9luA.js";
import { n as setSynologyRuntime, t as synologyChatPlugin } from "./channel-D-IzUHvA.js";
//#region extensions/synology-chat/index.ts
var synology_chat_default = defineChannelPluginEntry({
	id: "synology-chat",
	name: "Synology Chat",
	description: "Native Synology Chat channel plugin for OpenClaw",
	plugin: synologyChatPlugin,
	setRuntime: setSynologyRuntime
});
//#endregion
export { synology_chat_default as t };
