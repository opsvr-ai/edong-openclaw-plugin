import { W_ as defineChannelPluginEntry } from "./pi-embedded-CswW9luA.js";
import { t as zaloPlugin } from "./channel-DC1qJ8AU.js";
import { n as setZaloRuntime } from "./runtime-CSyR2A7Z.js";
//#region extensions/zalo/index.ts
var zalo_default = defineChannelPluginEntry({
	id: "zalo",
	name: "Zalo",
	description: "Zalo channel plugin",
	plugin: zaloPlugin,
	setRuntime: setZaloRuntime
});
//#endregion
export { zalo_default as t };
