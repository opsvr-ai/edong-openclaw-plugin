import { i as IMessageConfigSchema } from "./zod-schema.providers-core-COy5nBQ0.js";
import { r as getChatChannelMeta } from "./registry-C5UkPpaO.js";
import { $l as resolveIMessageAccount, H_ as createChannelPluginBase, Ql as resolveDefaultIMessageAccountId, X_ as adaptScopedAccountAccessor, Zl as listIMessageAccountIds, av as formatTrimmedAllowFromEntries, ev as createScopedChannelConfigAdapter, yh as createRestrictSendersChannelSecurity } from "./pi-embedded-CswW9luA.js";
import { n as describeAccountSnapshot } from "./account-helpers-BiC682rw.js";
import { r as buildChannelConfigSchema } from "./config-schema-CKb8N9O1.js";
import { n as createIMessageSetupWizardProxy } from "./setup-core---77Z50a.js";
//#region extensions/imessage/src/shared.ts
const IMESSAGE_CHANNEL = "imessage";
async function loadIMessageChannelRuntime() {
	return await import("./channel.runtime-CiDa7U-a.js");
}
const imessageSetupWizard = createIMessageSetupWizardProxy(async () => (await loadIMessageChannelRuntime()).imessageSetupWizard);
const imessageConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: IMESSAGE_CHANNEL,
	listAccountIds: listIMessageAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveIMessageAccount),
	defaultAccountId: resolveDefaultIMessageAccountId,
	clearBaseFields: [
		"cliPath",
		"dbPath",
		"service",
		"region",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatTrimmedAllowFromEntries(allowFrom),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const imessageSecurityAdapter = createRestrictSendersChannelSecurity({
	channelKey: IMESSAGE_CHANNEL,
	resolveDmPolicy: (account) => account.config.dmPolicy,
	resolveDmAllowFrom: (account) => account.config.allowFrom,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "iMessage groups",
	openScope: "any member",
	groupPolicyPath: "channels.imessage.groupPolicy",
	groupAllowFromPath: "channels.imessage.groupAllowFrom",
	mentionGated: false,
	policyPathSuffix: "dmPolicy"
});
function createIMessagePluginBase(params) {
	return createChannelPluginBase({
		id: IMESSAGE_CHANNEL,
		meta: {
			...getChatChannelMeta(IMESSAGE_CHANNEL),
			aliases: ["imsg"],
			showConfigured: false
		},
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			media: true
		},
		reload: { configPrefixes: ["channels.imessage"] },
		configSchema: buildChannelConfigSchema(IMessageConfigSchema),
		config: {
			...imessageConfigAdapter,
			isConfigured: (account) => account.configured,
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: account.configured
			})
		},
		security: imessageSecurityAdapter,
		setup: params.setup
	});
}
//#endregion
export { imessageSecurityAdapter as n, imessageSetupWizard as r, createIMessagePluginBase as t };
