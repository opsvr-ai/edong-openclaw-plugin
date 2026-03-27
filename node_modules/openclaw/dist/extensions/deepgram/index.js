import "../../logger-kwZIqwuw.js";
import "../../paths-ViKUYWUK.js";
import "../../tmp-openclaw-dir-idKIOMmb.js";
import "../../theme-CdOoMzRk.js";
import "../../globals-DBUMOBZ8.js";
import "../../subsystem-DISldKSB.js";
import "../../ansi-BEJF8NKS.js";
import "../../logger-BmpSCz93.js";
import "../../ip-Ce8EDTBZ.js";
import "../../ssrf-BifXvxQR.js";
import "../../fetch-guard-BTY_UfUY.js";
import { t as definePluginEntry } from "../../plugin-entry-BRMgG77c.js";
import { n as deepgramMediaUnderstandingProvider } from "../../media-understanding-Ch_w554d.js";
//#region extensions/deepgram/index.ts
var deepgram_default = definePluginEntry({
	id: "deepgram",
	name: "Deepgram Media Understanding",
	description: "Bundled Deepgram audio transcription provider",
	register(api) {
		api.registerMediaUnderstandingProvider(deepgramMediaUnderstandingProvider);
	}
});
//#endregion
export { deepgram_default as default };
