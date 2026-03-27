import { G_ as defineSetupPluginEntry } from "./pi-embedded-CswW9luA.js";
import { r as discordSetupAdapter } from "./setup-core-BBlL7X9e.js";
import { t as createDiscordPluginBase } from "./shared-D6SNJHwd.js";
//#region extensions/discord/src/channel.setup.ts
const discordSetupPlugin = { ...createDiscordPluginBase({ setup: discordSetupAdapter }) };
//#endregion
//#region extensions/discord/setup-entry.ts
var setup_entry_default = defineSetupPluginEntry(discordSetupPlugin);
//#endregion
export { discordSetupPlugin as n, setup_entry_default as t };
