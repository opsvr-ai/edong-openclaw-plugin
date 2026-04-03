import { t as formatDocsLink } from "./links-8xRhWBQL.js";
import { g as DEFAULT_ACCOUNT_ID } from "./session-key-DAhnzjyr.js";
import { l as normalizeSecretInputString } from "./types.secrets-DgX397vI.js";
import { o as MSTeamsConfigSchema } from "./zod-schema.providers-core-COy5nBQ0.js";
import { Fv as createAllowlistProviderGroupPolicyWarningCollector, K_ as stripChannelTargetPrefix, Kv as projectConfigWarningCollector, U_ as createChatChannelPlugin, V_ as buildChannelOutboundSessionRoute, k_ as formatAllowFromLowercase, q_ as stripTargetKindPrefix, rv as createTopLevelChannelConfigAdapter } from "./pi-embedded-CswW9luA.js";
import { n as describeAccountSnapshot } from "./account-helpers-BiC682rw.js";
import { n as createMessageToolCardSchema } from "./channel-actions-DZIaeZzh.js";
import { r as buildChannelConfigSchema } from "./config-schema-CKb8N9O1.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-BICCrA63.js";
import { i as buildProbeChannelStatusSummary, l as createComputedAccountStatusAdapter, u as createDefaultChannelRuntimeState } from "./status-helpers-D9rzemcb.js";
import { i as createPairingPrefixStripper } from "./channel-pairing-CA9BsqQV.js";
import { C as createTopLevelChannelDmPolicy, D as mergeAllowFromEntries, S as createTopLevelChannelAllowFromSetter, T as createTopLevelChannelGroupPolicySetter, st as splitSetupEntries, x as createStandardChannelSetupStatus } from "./setup-wizard-proxy--gFyw5Eh.js";
import { n as createRuntimeOutboundDelegates, t as createRuntimeDirectoryLiveAdapter } from "./runtime-forwarders-B4Fz8OBx.js";
import { i as createLazyRuntimeNamedExport } from "./lazy-runtime-CnopfQel.js";
import { p as createChannelDirectoryAdapter, r as listDirectoryEntriesFromSources } from "./directory-runtime-BgPR38m_.js";
import { c as hasConfiguredMSTeamsCredentials, l as resolveMSTeamsCredentials, t as getMSTeamsRuntime } from "./runtime-DJ4SDe_9.js";
import { a as parseMSTeamsTeamEntry, i as parseMSTeamsTeamChannelInput, n as normalizeMSTeamsUserInput, o as resolveMSTeamsChannelAllowlist, r as parseMSTeamsConversationId, s as resolveMSTeamsUserAllowlist, t as normalizeMSTeamsMessagingTarget, u as resolveMSTeamsGroupToolPolicy } from "./resolve-allowlist-DzkUrvXF.js";
//#region extensions/msteams/src/session-route.ts
function resolveMSTeamsOutboundSessionRoute(params) {
	let trimmed = stripChannelTargetPrefix(params.target, "msteams", "teams");
	if (!trimmed) return null;
	const isUser = trimmed.toLowerCase().startsWith("user:");
	const rawId = stripTargetKindPrefix(trimmed);
	if (!rawId) return null;
	const conversationId = rawId.split(";")[0] ?? rawId;
	const isChannel = !isUser && /@thread\.tacv2/i.test(conversationId);
	return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "msteams",
		accountId: params.accountId,
		peer: {
			kind: isUser ? "direct" : isChannel ? "channel" : "group",
			id: conversationId
		},
		chatType: isUser ? "direct" : isChannel ? "channel" : "group",
		from: isUser ? `msteams:${conversationId}` : isChannel ? `msteams:channel:${conversationId}` : `msteams:group:${conversationId}`,
		to: isUser ? `user:${conversationId}` : `conversation:${conversationId}`
	});
}
//#endregion
//#region extensions/msteams/src/setup-core.ts
const msteamsSetupAdapter = {
	resolveAccountId: () => DEFAULT_ACCOUNT_ID,
	applyAccountConfig: ({ cfg }) => ({
		...cfg,
		channels: {
			...cfg.channels,
			msteams: {
				...cfg.channels?.msteams,
				enabled: true
			}
		}
	})
};
//#endregion
//#region extensions/msteams/src/setup-surface.ts
const channel = "msteams";
const setMSTeamsAllowFrom = createTopLevelChannelAllowFromSetter({ channel });
const setMSTeamsGroupPolicy = createTopLevelChannelGroupPolicySetter({
	channel,
	enabled: true
});
function looksLikeGuid(value) {
	return /^[0-9a-fA-F-]{16,}$/.test(value);
}
async function promptMSTeamsCredentials(prompter) {
	return {
		appId: String(await prompter.text({
			message: "Enter MS Teams App ID",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim(),
		appPassword: String(await prompter.text({
			message: "Enter MS Teams App Password",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim(),
		tenantId: String(await prompter.text({
			message: "Enter MS Teams Tenant ID",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim()
	};
}
async function promptMSTeamsAllowFrom(params) {
	const existing = params.cfg.channels?.msteams?.allowFrom ?? [];
	await params.prompter.note([
		"Allowlist MS Teams DMs by display name, UPN/email, or user id.",
		"We resolve names to user IDs via Microsoft Graph when credentials allow.",
		"Examples:",
		"- alex@example.com",
		"- Alex Johnson",
		"- 00000000-0000-0000-0000-000000000000"
	].join("\n"), "MS Teams allowlist");
	while (true) {
		const entry = await params.prompter.text({
			message: "MS Teams allowFrom (usernames or ids)",
			placeholder: "alex@example.com, Alex Johnson",
			initialValue: existing[0] ? String(existing[0]) : void 0,
			validate: (value) => String(value ?? "").trim() ? void 0 : "Required"
		});
		const parts = splitSetupEntries(String(entry));
		if (parts.length === 0) {
			await params.prompter.note("Enter at least one user.", "MS Teams allowlist");
			continue;
		}
		const resolved = await resolveMSTeamsUserAllowlist({
			cfg: params.cfg,
			entries: parts
		}).catch(() => null);
		if (!resolved) {
			const ids = parts.filter((part) => looksLikeGuid(part));
			if (ids.length !== parts.length) {
				await params.prompter.note("Graph lookup unavailable. Use user IDs only.", "MS Teams allowlist");
				continue;
			}
			const unique = mergeAllowFromEntries(existing, ids);
			return setMSTeamsAllowFrom(params.cfg, unique);
		}
		const unresolved = resolved.filter((item) => !item.resolved || !item.id);
		if (unresolved.length > 0) {
			await params.prompter.note(`Could not resolve: ${unresolved.map((item) => item.input).join(", ")}`, "MS Teams allowlist");
			continue;
		}
		const unique = mergeAllowFromEntries(existing, resolved.map((item) => item.id));
		return setMSTeamsAllowFrom(params.cfg, unique);
	}
}
async function noteMSTeamsCredentialHelp(prompter) {
	await prompter.note([
		"1) Azure Bot registration -> get App ID + Tenant ID",
		"2) Add a client secret (App Password)",
		"3) Set webhook URL + messaging endpoint",
		"Tip: you can also set MSTEAMS_APP_ID / MSTEAMS_APP_PASSWORD / MSTEAMS_TENANT_ID.",
		`Docs: ${formatDocsLink("/channels/msteams", "msteams")}`
	].join("\n"), "MS Teams credentials");
}
function setMSTeamsTeamsAllowlist(cfg, entries) {
	const teams = { ...cfg.channels?.msteams?.teams ?? {} };
	for (const entry of entries) {
		const teamKey = entry.teamKey;
		if (!teamKey) continue;
		const existing = teams[teamKey] ?? {};
		if (entry.channelKey) {
			const channels = { ...existing.channels };
			channels[entry.channelKey] = channels[entry.channelKey] ?? {};
			teams[teamKey] = {
				...existing,
				channels
			};
		} else teams[teamKey] = existing;
	}
	return {
		...cfg,
		channels: {
			...cfg.channels,
			msteams: {
				...cfg.channels?.msteams,
				enabled: true,
				teams
			}
		}
	};
}
function listMSTeamsGroupEntries(cfg) {
	return Object.entries(cfg.channels?.msteams?.teams ?? {}).flatMap(([teamKey, value]) => {
		const channels = value?.channels ?? {};
		const channelKeys = Object.keys(channels);
		if (channelKeys.length === 0) return [teamKey];
		return channelKeys.map((channelKey) => `${teamKey}/${channelKey}`);
	});
}
async function resolveMSTeamsGroupAllowlist(params) {
	let resolvedEntries = params.entries.map((entry) => parseMSTeamsTeamEntry(entry)).filter(Boolean);
	if (params.entries.length === 0 || !resolveMSTeamsCredentials(params.cfg.channels?.msteams)) return resolvedEntries;
	try {
		const lookups = await resolveMSTeamsChannelAllowlist({
			cfg: params.cfg,
			entries: params.entries
		});
		const resolvedChannels = lookups.filter((entry) => entry.resolved && entry.teamId && entry.channelId);
		const resolvedTeams = lookups.filter((entry) => entry.resolved && entry.teamId && !entry.channelId);
		const unresolved = lookups.filter((entry) => !entry.resolved).map((entry) => entry.input);
		resolvedEntries = [
			...resolvedChannels.map((entry) => ({
				teamKey: entry.teamId,
				channelKey: entry.channelId
			})),
			...resolvedTeams.map((entry) => ({ teamKey: entry.teamId })),
			...unresolved.map((entry) => parseMSTeamsTeamEntry(entry)).filter(Boolean)
		];
		const summary = [];
		if (resolvedChannels.length > 0) summary.push(`Resolved channels: ${resolvedChannels.map((entry) => entry.channelId).filter(Boolean).join(", ")}`);
		if (resolvedTeams.length > 0) summary.push(`Resolved teams: ${resolvedTeams.map((entry) => entry.teamId).filter(Boolean).join(", ")}`);
		if (unresolved.length > 0) summary.push(`Unresolved (kept as typed): ${unresolved.join(", ")}`);
		if (summary.length > 0) await params.prompter.note(summary.join("\n"), "MS Teams channels");
		return resolvedEntries;
	} catch (err) {
		await params.prompter.note(`Channel lookup failed; keeping entries as typed. ${String(err)}`, "MS Teams channels");
		return resolvedEntries;
	}
}
const msteamsGroupAccess = {
	label: "MS Teams channels",
	placeholder: "Team Name/Channel Name, teamId/conversationId",
	currentPolicy: ({ cfg }) => cfg.channels?.msteams?.groupPolicy ?? "allowlist",
	currentEntries: ({ cfg }) => listMSTeamsGroupEntries(cfg),
	updatePrompt: ({ cfg }) => Boolean(cfg.channels?.msteams?.teams),
	setPolicy: ({ cfg, policy }) => setMSTeamsGroupPolicy(cfg, policy),
	resolveAllowlist: async ({ cfg, entries, prompter }) => await resolveMSTeamsGroupAllowlist({
		cfg,
		entries,
		prompter
	}),
	applyAllowlist: ({ cfg, resolved }) => setMSTeamsTeamsAllowlist(cfg, resolved)
};
const msteamsDmPolicy = createTopLevelChannelDmPolicy({
	label: "MS Teams",
	channel,
	policyKey: "channels.msteams.dmPolicy",
	allowFromKey: "channels.msteams.allowFrom",
	getCurrent: (cfg) => cfg.channels?.msteams?.dmPolicy ?? "pairing",
	promptAllowFrom: promptMSTeamsAllowFrom
});
const msteamsSetupWizard = {
	channel,
	resolveAccountIdForConfigure: () => DEFAULT_ACCOUNT_ID,
	resolveShouldPromptAccountIds: () => false,
	status: createStandardChannelSetupStatus({
		channelLabel: "MS Teams",
		configuredLabel: "configured",
		unconfiguredLabel: "needs app credentials",
		configuredHint: "configured",
		unconfiguredHint: "needs app creds",
		configuredScore: 2,
		unconfiguredScore: 0,
		includeStatusLine: true,
		resolveConfigured: ({ cfg }) => Boolean(resolveMSTeamsCredentials(cfg.channels?.msteams)) || hasConfiguredMSTeamsCredentials(cfg.channels?.msteams)
	}),
	credentials: [],
	finalize: async ({ cfg, prompter }) => {
		const resolved = resolveMSTeamsCredentials(cfg.channels?.msteams);
		const hasConfigCreds = hasConfiguredMSTeamsCredentials(cfg.channels?.msteams);
		const canUseEnv = Boolean(!hasConfigCreds && normalizeSecretInputString(process.env.MSTEAMS_APP_ID) && normalizeSecretInputString(process.env.MSTEAMS_APP_PASSWORD) && normalizeSecretInputString(process.env.MSTEAMS_TENANT_ID));
		let next = cfg;
		let appId = null;
		let appPassword = null;
		let tenantId = null;
		if (!resolved && !hasConfigCreds) await noteMSTeamsCredentialHelp(prompter);
		if (canUseEnv) if (await prompter.confirm({
			message: "MSTEAMS_APP_ID + MSTEAMS_APP_PASSWORD + MSTEAMS_TENANT_ID detected. Use env vars?",
			initialValue: true
		})) next = msteamsSetupAdapter.applyAccountConfig({
			cfg: next,
			accountId: DEFAULT_ACCOUNT_ID,
			input: {}
		});
		else ({appId, appPassword, tenantId} = await promptMSTeamsCredentials(prompter));
		else if (hasConfigCreds) {
			if (!await prompter.confirm({
				message: "MS Teams credentials already configured. Keep them?",
				initialValue: true
			})) ({appId, appPassword, tenantId} = await promptMSTeamsCredentials(prompter));
		} else ({appId, appPassword, tenantId} = await promptMSTeamsCredentials(prompter));
		if (appId && appPassword && tenantId) next = {
			...next,
			channels: {
				...next.channels,
				msteams: {
					...next.channels?.msteams,
					enabled: true,
					appId,
					appPassword,
					tenantId
				}
			}
		};
		return {
			cfg: next,
			accountId: DEFAULT_ACCOUNT_ID
		};
	},
	dmPolicy: msteamsDmPolicy,
	groupAccess: msteamsGroupAccess,
	disable: (cfg) => ({
		...cfg,
		channels: {
			...cfg.channels,
			msteams: {
				...cfg.channels?.msteams,
				enabled: false
			}
		}
	})
};
//#endregion
//#region extensions/msteams/src/channel.ts
const meta = {
	id: "msteams",
	label: "Microsoft Teams",
	selectionLabel: "Microsoft Teams (Bot Framework)",
	docsPath: "/channels/msteams",
	docsLabel: "msteams",
	blurb: "Bot Framework; enterprise support.",
	aliases: ["teams"],
	order: 60
};
const TEAMS_GRAPH_PERMISSION_HINTS = {
	"ChannelMessage.Read.All": "channel history",
	"Chat.Read.All": "chat history",
	"Channel.ReadBasic.All": "channel list",
	"Team.ReadBasic.All": "team list",
	"TeamsActivity.Read.All": "teams activity",
	"Sites.Read.All": "files (SharePoint)",
	"Files.Read.All": "files (OneDrive)"
};
const collectMSTeamsSecurityWarnings = createAllowlistProviderGroupPolicyWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.msteams !== void 0,
	resolveGroupPolicy: ({ cfg }) => cfg.channels?.msteams?.groupPolicy,
	collect: ({ groupPolicy }) => groupPolicy === "open" ? ["- MS Teams groups: groupPolicy=\"open\" allows any member to trigger (mention-gated). Set channels.msteams.groupPolicy=\"allowlist\" + channels.msteams.groupAllowFrom to restrict senders."] : []
});
const loadMSTeamsChannelRuntime = createLazyRuntimeNamedExport(() => import("./channel.runtime-DTpGJ9yL.js"), "msTeamsChannelRuntime");
const resolveMSTeamsChannelConfig = (cfg) => ({
	allowFrom: cfg.channels?.msteams?.allowFrom,
	defaultTo: cfg.channels?.msteams?.defaultTo
});
const msteamsConfigAdapter = createTopLevelChannelConfigAdapter({
	sectionKey: "msteams",
	resolveAccount: (cfg) => ({
		accountId: DEFAULT_ACCOUNT_ID,
		enabled: cfg.channels?.msteams?.enabled !== false,
		configured: Boolean(resolveMSTeamsCredentials(cfg.channels?.msteams))
	}),
	resolveAccessorAccount: ({ cfg }) => resolveMSTeamsChannelConfig(cfg),
	resolveAllowFrom: (account) => account.allowFrom,
	formatAllowFrom: (allowFrom) => formatAllowFromLowercase({ allowFrom }),
	resolveDefaultTo: (account) => account.defaultTo
});
function describeMSTeamsMessageTool({ cfg }) {
	const enabled = cfg.channels?.msteams?.enabled !== false && Boolean(resolveMSTeamsCredentials(cfg.channels?.msteams));
	return {
		actions: enabled ? ["poll"] : [],
		capabilities: enabled ? ["cards"] : [],
		schema: enabled ? { properties: { card: createMessageToolCardSchema() } } : null
	};
}
const msteamsPlugin = createChatChannelPlugin({
	base: {
		id: "msteams",
		meta: {
			...meta,
			aliases: [...meta.aliases]
		},
		setupWizard: msteamsSetupWizard,
		capabilities: {
			chatTypes: [
				"direct",
				"channel",
				"thread"
			],
			polls: true,
			threads: true,
			media: true
		},
		agentPrompt: { messageToolHints: () => ["- Adaptive Cards supported. Use `action=send` with `card={type,version,body}` to send rich cards.", "- MSTeams targeting: omit `target` to reply to the current conversation (auto-inferred). Explicit targets: `user:ID` or `user:Display Name` (requires Graph API) for DMs, `conversation:19:...@thread.tacv2` for groups/channels. Prefer IDs over display names for speed."] },
		groups: { resolveToolPolicy: resolveMSTeamsGroupToolPolicy },
		reload: { configPrefixes: ["channels.msteams"] },
		configSchema: buildChannelConfigSchema(MSTeamsConfigSchema),
		config: {
			...msteamsConfigAdapter,
			isConfigured: (_account, cfg) => Boolean(resolveMSTeamsCredentials(cfg.channels?.msteams)),
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: account.configured
			})
		},
		setup: msteamsSetupAdapter,
		messaging: {
			normalizeTarget: normalizeMSTeamsMessagingTarget,
			resolveOutboundSessionRoute: (params) => resolveMSTeamsOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: (raw) => {
					const trimmed = raw.trim();
					if (!trimmed) return false;
					if (/^conversation:/i.test(trimmed)) return true;
					if (/^user:/i.test(trimmed)) {
						const id = trimmed.slice(5).trim();
						return /^[0-9a-fA-F-]{16,}$/.test(id);
					}
					return trimmed.includes("@thread");
				},
				hint: "<conversationId|user:ID|conversation:ID>"
			}
		},
		directory: createChannelDirectoryAdapter({
			self: async ({ cfg }) => {
				const creds = resolveMSTeamsCredentials(cfg.channels?.msteams);
				if (!creds) return null;
				return {
					kind: "user",
					id: creds.appId,
					name: creds.appId
				};
			},
			listPeers: async ({ cfg, query, limit }) => listDirectoryEntriesFromSources({
				kind: "user",
				sources: [cfg.channels?.msteams?.allowFrom ?? [], Object.keys(cfg.channels?.msteams?.dms ?? {})],
				query,
				limit,
				normalizeId: (raw) => {
					const normalized = normalizeMSTeamsMessagingTarget(raw) ?? raw;
					const lowered = normalized.toLowerCase();
					if (lowered.startsWith("user:") || lowered.startsWith("conversation:")) return normalized;
					return `user:${normalized}`;
				}
			}),
			listGroups: async ({ cfg, query, limit }) => listDirectoryEntriesFromSources({
				kind: "group",
				sources: [Object.values(cfg.channels?.msteams?.teams ?? {}).flatMap((team) => Object.keys(team.channels ?? {}))],
				query,
				limit,
				normalizeId: (raw) => `conversation:${raw.replace(/^conversation:/i, "").trim()}`
			}),
			...createRuntimeDirectoryLiveAdapter({
				getRuntime: loadMSTeamsChannelRuntime,
				listPeersLive: (runtime) => runtime.listMSTeamsDirectoryPeersLive,
				listGroupsLive: (runtime) => runtime.listMSTeamsDirectoryGroupsLive
			})
		}),
		resolver: { resolveTargets: async ({ cfg, inputs, kind, runtime }) => {
			const results = inputs.map((input) => ({
				input,
				resolved: false,
				id: void 0,
				name: void 0,
				note: void 0
			}));
			const stripPrefix = (value) => normalizeMSTeamsUserInput(value);
			const markPendingLookupFailed = (pending) => {
				pending.forEach(({ index }) => {
					const entry = results[index];
					if (entry) entry.note = "lookup failed";
				});
			};
			const resolvePending = async (pending, resolveEntries, applyResolvedEntry) => {
				if (pending.length === 0) return;
				try {
					(await resolveEntries(pending.map((entry) => entry.query))).forEach((entry, idx) => {
						const target = results[pending[idx]?.index ?? -1];
						if (!target) return;
						applyResolvedEntry(target, entry);
					});
				} catch (err) {
					runtime.error?.(`msteams resolve failed: ${String(err)}`);
					markPendingLookupFailed(pending);
				}
			};
			if (kind === "user") {
				const pending = [];
				results.forEach((entry, index) => {
					const trimmed = entry.input.trim();
					if (!trimmed) {
						entry.note = "empty input";
						return;
					}
					const cleaned = stripPrefix(trimmed);
					if (/^[0-9a-fA-F-]{16,}$/.test(cleaned) || cleaned.includes("@")) {
						entry.resolved = true;
						entry.id = cleaned;
						return;
					}
					pending.push({
						input: entry.input,
						query: cleaned,
						index
					});
				});
				await resolvePending(pending, (entries) => resolveMSTeamsUserAllowlist({
					cfg,
					entries
				}), (target, entry) => {
					target.resolved = entry.resolved;
					target.id = entry.id;
					target.name = entry.name;
					target.note = entry.note;
				});
				return results;
			}
			const pending = [];
			results.forEach((entry, index) => {
				const trimmed = entry.input.trim();
				if (!trimmed) {
					entry.note = "empty input";
					return;
				}
				const conversationId = parseMSTeamsConversationId(trimmed);
				if (conversationId !== null) {
					entry.resolved = Boolean(conversationId);
					entry.id = conversationId || void 0;
					entry.note = conversationId ? "conversation id" : "empty conversation id";
					return;
				}
				const parsed = parseMSTeamsTeamChannelInput(trimmed);
				if (!parsed.team) {
					entry.note = "missing team";
					return;
				}
				const query = parsed.channel ? `${parsed.team}/${parsed.channel}` : parsed.team;
				pending.push({
					input: entry.input,
					query,
					index
				});
			});
			await resolvePending(pending, (entries) => resolveMSTeamsChannelAllowlist({
				cfg,
				entries
			}), (target, entry) => {
				if (!entry.resolved || !entry.teamId) {
					target.resolved = false;
					target.note = entry.note;
					return;
				}
				target.resolved = true;
				if (entry.channelId) {
					target.id = `${entry.teamId}/${entry.channelId}`;
					target.name = entry.channelName && entry.teamName ? `${entry.teamName}/${entry.channelName}` : entry.channelName ?? entry.teamName;
				} else {
					target.id = entry.teamId;
					target.name = entry.teamName;
					target.note = "team id";
				}
				if (entry.note) target.note = entry.note;
			});
			return results;
		} },
		actions: {
			describeMessageTool: describeMSTeamsMessageTool,
			handleAction: async (ctx) => {
				if (ctx.action === "send" && ctx.params.card) {
					const card = ctx.params.card;
					const to = typeof ctx.params.to === "string" ? ctx.params.to.trim() : typeof ctx.params.target === "string" ? ctx.params.target.trim() : "";
					if (!to) return {
						isError: true,
						content: [{
							type: "text",
							text: "Card send requires a target (to)."
						}],
						details: { error: "Card send requires a target (to)." }
					};
					const { sendAdaptiveCardMSTeams } = await loadMSTeamsChannelRuntime();
					const result = await sendAdaptiveCardMSTeams({
						cfg: ctx.cfg,
						to,
						card
					});
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								ok: true,
								channel: "msteams",
								messageId: result.messageId,
								conversationId: result.conversationId
							})
						}],
						details: {
							ok: true,
							channel: "msteams",
							messageId: result.messageId
						}
					};
				}
				return null;
			}
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID, { port: null }),
			buildChannelSummary: ({ snapshot }) => buildProbeChannelStatusSummary(snapshot, { port: snapshot.port ?? null }),
			probeAccount: async ({ cfg }) => await (await loadMSTeamsChannelRuntime()).probeMSTeams(cfg.channels?.msteams),
			formatCapabilitiesProbe: ({ probe }) => {
				const teamsProbe = probe;
				const lines = [];
				const appId = typeof teamsProbe?.appId === "string" ? teamsProbe.appId.trim() : "";
				if (appId) lines.push({ text: `App: ${appId}` });
				const graph = teamsProbe?.graph;
				if (graph) {
					const roles = Array.isArray(graph.roles) ? graph.roles.map((role) => String(role).trim()).filter(Boolean) : [];
					const scopes = Array.isArray(graph.scopes) ? graph.scopes.map((scope) => String(scope).trim()).filter(Boolean) : [];
					const formatPermission = (permission) => {
						const hint = TEAMS_GRAPH_PERMISSION_HINTS[permission];
						return hint ? `${permission} (${hint})` : permission;
					};
					if (graph.ok === false) lines.push({
						text: `Graph: ${graph.error ?? "failed"}`,
						tone: "error"
					});
					else if (roles.length > 0 || scopes.length > 0) {
						if (roles.length > 0) lines.push({ text: `Graph roles: ${roles.map(formatPermission).join(", ")}` });
						if (scopes.length > 0) lines.push({ text: `Graph scopes: ${scopes.map(formatPermission).join(", ")}` });
					} else if (graph.ok === true) lines.push({ text: "Graph: ok" });
				}
				return lines;
			},
			resolveAccountSnapshot: ({ account, runtime }) => ({
				accountId: account.accountId,
				enabled: account.enabled,
				configured: account.configured,
				extra: { port: runtime?.port ?? null }
			})
		}),
		gateway: { startAccount: async (ctx) => {
			const { monitorMSTeamsProvider } = await import("./src-Bfl4qN-g.js");
			const port = ctx.cfg.channels?.msteams?.webhook?.port ?? 3978;
			ctx.setStatus({
				accountId: ctx.accountId,
				port
			});
			ctx.log?.info(`starting provider (port ${port})`);
			return monitorMSTeamsProvider({
				cfg: ctx.cfg,
				runtime: ctx.runtime,
				abortSignal: ctx.abortSignal
			});
		} }
	},
	security: { collectWarnings: projectConfigWarningCollector(collectMSTeamsSecurityWarnings) },
	pairing: { text: {
		idLabel: "msteamsUserId",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: createPairingPrefixStripper(/^(msteams|user):/i),
		notify: async ({ cfg, id, message }) => {
			const { sendMessageMSTeams } = await loadMSTeamsChannelRuntime();
			await sendMessageMSTeams({
				cfg,
				to: id,
				text: message
			});
		}
	} },
	threading: { buildToolContext: ({ context, hasRepliedRef }) => ({
		currentChannelId: context.To?.trim() || void 0,
		currentThreadTs: context.ReplyToId,
		hasRepliedRef
	}) },
	outbound: {
		deliveryMode: "direct",
		chunker: (text, limit) => getMSTeamsRuntime().channel.text.chunkMarkdownText(text, limit),
		chunkerMode: "markdown",
		textChunkLimit: 4e3,
		pollMaxOptions: 12,
		...createRuntimeOutboundDelegates({
			getRuntime: loadMSTeamsChannelRuntime,
			sendText: { resolve: (runtime) => runtime.msteamsOutbound.sendText },
			sendMedia: { resolve: (runtime) => runtime.msteamsOutbound.sendMedia },
			sendPoll: { resolve: (runtime) => runtime.msteamsOutbound.sendPoll }
		})
	}
});
//#endregion
export { msteamsPlugin as t };
