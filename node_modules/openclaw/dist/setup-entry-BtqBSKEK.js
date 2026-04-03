import { G_ as defineSetupPluginEntry } from "./pi-embedded-CswW9luA.js";
import { a as imessageSetupAdapter } from "./setup-core---77Z50a.js";
import { r as imessageSetupWizard, t as createIMessagePluginBase } from "./shared-CFuLrHMX.js";
//#region extensions/imessage/src/channel.setup.ts
const imessageSetupPlugin = { ...createIMessagePluginBase({
	setupWizard: imessageSetupWizard,
	setup: imessageSetupAdapter
}) };
//#endregion
//#region extensions/imessage/setup-entry.ts
var setup_entry_default = defineSetupPluginEntry(imessageSetupPlugin);
//#endregion
export { imessageSetupPlugin as n, setup_entry_default as t };
