import { m as normalizeE164 } from "./utils-CS0Ikux6.js";
import { s as SignalConfigSchema } from "./zod-schema.providers-core-COy5nBQ0.js";
import { r as getChatChannelMeta } from "./registry-C5UkPpaO.js";
import { H_ as createChannelPluginBase, Il as listSignalAccountIds, Ll as resolveDefaultSignalAccountId, Rl as resolveSignalAccount, X_ as adaptScopedAccountAccessor, ev as createScopedChannelConfigAdapter, yh as createRestrictSendersChannelSecurity } from "./pi-embedded-CswW9luA.js";
import { n as describeAccountSnapshot } from "./account-helpers-BiC682rw.js";
import { r as buildChannelConfigSchema } from "./config-schema-CKb8N9O1.js";
import { n as createSignalSetupWizardProxy } from "./setup-core-BhbR6Dev.js";
//#region extensions/signal/src/shared.ts
const SIGNAL_CHANNEL = "signal";
async function loadSignalChannelRuntime() {
	return await import("./channel2.runtime-D99HjWqV.js");
}
const signalSetupWizard = createSignalSetupWizardProxy(async () => (await loadSignalChannelRuntime()).signalSetupWizard);
const signalConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: SIGNAL_CHANNEL,
	listAccountIds: listSignalAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveSignalAccount),
	defaultAccountId: resolveDefaultSignalAccountId,
	clearBaseFields: [
		"account",
		"httpUrl",
		"httpHost",
		"httpPort",
		"cliPath",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => allowFrom.map((entry) => String(entry).trim()).filter(Boolean).map((entry) => entry === "*" ? "*" : normalizeE164(entry.replace(/^signal:/i, ""))).filter(Boolean),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const signalSecurityAdapter = createRestrictSendersChannelSecurity({
	channelKey: SIGNAL_CHANNEL,
	resolveDmPolicy: (account) => account.config.dmPolicy,
	resolveDmAllowFrom: (account) => account.config.allowFrom,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "Signal groups",
	openScope: "any member",
	groupPolicyPath: "channels.signal.groupPolicy",
	groupAllowFromPath: "channels.signal.groupAllowFrom",
	mentionGated: false,
	policyPathSuffix: "dmPolicy",
	normalizeDmEntry: (raw) => normalizeE164(raw.replace(/^signal:/i, "").trim())
});
function createSignalPluginBase(params) {
	return createChannelPluginBase({
		id: SIGNAL_CHANNEL,
		meta: { ...getChatChannelMeta(SIGNAL_CHANNEL) },
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			media: true,
			reactions: true
		},
		streaming: { blockStreamingCoalesceDefaults: {
			minChars: 1500,
			idleMs: 1e3
		} },
		reload: { configPrefixes: ["channels.signal"] },
		configSchema: buildChannelConfigSchema(SignalConfigSchema),
		config: {
			...signalConfigAdapter,
			isConfigured: (account) => account.configured,
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: account.configured,
				extra: { baseUrl: account.baseUrl }
			})
		},
		security: signalSecurityAdapter,
		setup: params.setup
	});
}
//#endregion
export { signalSetupWizard as i, signalConfigAdapter as n, signalSecurityAdapter as r, createSignalPluginBase as t };
