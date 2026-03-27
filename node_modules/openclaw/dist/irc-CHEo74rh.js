import { W_ as defineChannelPluginEntry } from "./pi-embedded-CswW9luA.js";
import { n as setIrcRuntime, t as ircPlugin } from "./channel-C2H-6wcn.js";
//#region extensions/irc/index.ts
var irc_default = defineChannelPluginEntry({
	id: "irc",
	name: "IRC",
	description: "IRC channel plugin",
	plugin: ircPlugin,
	setRuntime: setIrcRuntime
});
//#endregion
export { irc_default as t };
