import { t as formatDocsLink } from "./links-8xRhWBQL.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "./session-key-DAhnzjyr.js";
import { o as isSecretRef } from "./types.secrets-DgX397vI.js";
import { r as GoogleChatConfigSchema } from "./zod-schema.providers-core-COy5nBQ0.js";
import { r as getChatChannelMeta } from "./registry-C5UkPpaO.js";
import { t as resolveAccountEntry } from "./account-lookup-C4CvUou_.js";
import { A_ as formatNormalizedAllowFromEntries, Bm as resolveChannelMediaMaxBytes, Iv as createAllowlistProviderOpenWarningCollector, Nv as composeAccountWarningCollectors, U_ as createChatChannelPlugin, X_ as adaptScopedAccountAccessor, ev as createScopedChannelConfigAdapter } from "./pi-embedded-CswW9luA.js";
import { n as describeAccountSnapshot, o as resolveMergedAccountConfig, t as createAccountListHelpers } from "./account-helpers-BiC682rw.js";
import { c as jsonResult, d as readNumberParam, f as readReactionParams, h as readStringParam, i as createActionGate } from "./common-DArxwyX8.js";
import { a as migrateBaseNameToDefaultAccount, i as createPatchedAccountSetupAdapter, n as applySetupAccountConfigPatch } from "./setup-helpers-BHFbY0Qo.js";
import { r as buildChannelConfigSchema } from "./config-schema-CKb8N9O1.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-BICCrA63.js";
import { l as createComputedAccountStatusAdapter, u as createDefaultChannelRuntimeState } from "./status-helpers-D9rzemcb.js";
import { D as mergeAllowFromEntries, _ as createNestedChannelDmPolicy, st as splitSetupEntries, x as createStandardChannelSetupStatus, y as createNestedChannelParsedAllowFromPrompt } from "./setup-wizard-proxy--gFyw5Eh.js";
import { c as missingTargetError } from "./channel-feedback-mKZrhk-A.js";
import { o as resolveChannelGroupRequireMention } from "./config-runtime-gAoemo4L.js";
import { i as createLazyRuntimeNamedExport } from "./lazy-runtime-CnopfQel.js";
import { d as listResolvedDirectoryUserEntriesFromAllowFrom, p as createChannelDirectoryAdapter, u as listResolvedDirectoryGroupEntriesFromMapKeys } from "./directory-runtime-BgPR38m_.js";
import { t as extractToolSend } from "./tool-send-BD7UaIJ1.js";
import { r as runPassiveAccountLifecycle, t as createAccountStatusSink } from "./channel-lifecycle-CGlugnkL.js";
import { n as buildPassiveProbedChannelStatusSummary } from "./extension-shared-Cq6iF1q-.js";
import { a as findGoogleChatDirectMessage, c as sendGoogleChatMessage, o as listGoogleChatReactions, r as deleteGoogleChatReaction, t as createGoogleChatReaction, u as uploadGoogleChatAttachment } from "./api-BS7lTvAw.js";
import { t as getGoogleChatRuntime } from "./runtime-B2AIp8U0.js";
//#region extensions/googlechat/src/accounts.ts
const ENV_SERVICE_ACCOUNT$1 = "GOOGLE_CHAT_SERVICE_ACCOUNT";
const ENV_SERVICE_ACCOUNT_FILE$1 = "GOOGLE_CHAT_SERVICE_ACCOUNT_FILE";
const { listAccountIds: listGoogleChatAccountIds, resolveDefaultAccountId: resolveDefaultGoogleChatAccountId } = createAccountListHelpers("googlechat");
function mergeGoogleChatAccountConfig(cfg, accountId) {
	const raw = cfg.channels?.["googlechat"] ?? {};
	const base = resolveMergedAccountConfig({
		channelConfig: raw,
		accounts: raw.accounts,
		accountId,
		omitKeys: ["defaultAccount"]
	});
	const defaultAccountConfig = resolveAccountEntry(raw.accounts, "default") ?? {};
	if (accountId === "default") return base;
	const { enabled: _ignoredEnabled, dangerouslyAllowNameMatching: _ignoredDangerouslyAllowNameMatching, serviceAccount: _ignoredServiceAccount, serviceAccountRef: _ignoredServiceAccountRef, serviceAccountFile: _ignoredServiceAccountFile, ...defaultAccountShared } = defaultAccountConfig;
	return {
		...defaultAccountShared,
		...base
	};
}
function parseServiceAccount(value) {
	if (value && typeof value === "object") {
		if (isSecretRef(value)) return null;
		return value;
	}
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		return null;
	}
}
function resolveCredentialsFromConfig(params) {
	const { account, accountId } = params;
	const inline = parseServiceAccount(account.serviceAccount);
	if (inline) return {
		credentials: inline,
		source: "inline"
	};
	if (isSecretRef(account.serviceAccount)) throw new Error(`channels.googlechat.accounts.${accountId}.serviceAccount: unresolved SecretRef "${account.serviceAccount.source}:${account.serviceAccount.provider}:${account.serviceAccount.id}". Resolve this command against an active gateway runtime snapshot before reading it.`);
	if (isSecretRef(account.serviceAccountRef)) throw new Error(`channels.googlechat.accounts.${accountId}.serviceAccount: unresolved SecretRef "${account.serviceAccountRef.source}:${account.serviceAccountRef.provider}:${account.serviceAccountRef.id}". Resolve this command against an active gateway runtime snapshot before reading it.`);
	const file = account.serviceAccountFile?.trim();
	if (file) return {
		credentialsFile: file,
		source: "file"
	};
	if (accountId === "default") {
		const envJson = process.env[ENV_SERVICE_ACCOUNT$1];
		const envInline = parseServiceAccount(envJson);
		if (envInline) return {
			credentials: envInline,
			source: "env"
		};
		const envFile = process.env[ENV_SERVICE_ACCOUNT_FILE$1]?.trim();
		if (envFile) return {
			credentialsFile: envFile,
			source: "env"
		};
	}
	return { source: "none" };
}
function resolveGoogleChatAccount(params) {
	const accountId = normalizeAccountId(params.accountId);
	const baseEnabled = params.cfg.channels?.["googlechat"]?.enabled !== false;
	const merged = mergeGoogleChatAccountConfig(params.cfg, accountId);
	const accountEnabled = merged.enabled !== false;
	const enabled = baseEnabled && accountEnabled;
	const credentials = resolveCredentialsFromConfig({
		accountId,
		account: merged
	});
	return {
		accountId,
		name: merged.name?.trim() || void 0,
		enabled,
		config: merged,
		credentialSource: credentials.source,
		credentials: credentials.credentials,
		credentialsFile: credentials.credentialsFile
	};
}
function listEnabledGoogleChatAccounts(cfg) {
	return listGoogleChatAccountIds(cfg).map((accountId) => resolveGoogleChatAccount({
		cfg,
		accountId
	})).filter((account) => account.enabled);
}
//#endregion
//#region extensions/googlechat/src/targets.ts
function normalizeGoogleChatTarget(raw) {
	const trimmed = raw?.trim();
	if (!trimmed) return;
	const normalized = trimmed.replace(/^(googlechat|google-chat|gchat):/i, "").replace(/^user:(users\/)?/i, "users/").replace(/^space:(spaces\/)?/i, "spaces/");
	if (isGoogleChatUserTarget(normalized)) {
		const suffix = normalized.slice(6);
		return suffix.includes("@") ? `users/${suffix.toLowerCase()}` : normalized;
	}
	if (isGoogleChatSpaceTarget(normalized)) return normalized;
	if (normalized.includes("@")) return `users/${normalized.toLowerCase()}`;
	return normalized;
}
function isGoogleChatUserTarget(value) {
	return value.toLowerCase().startsWith("users/");
}
function isGoogleChatSpaceTarget(value) {
	return value.toLowerCase().startsWith("spaces/");
}
function stripMessageSuffix(target) {
	const index = target.indexOf("/messages/");
	if (index === -1) return target;
	return target.slice(0, index);
}
async function resolveGoogleChatOutboundSpace(params) {
	const normalized = normalizeGoogleChatTarget(params.target);
	if (!normalized) throw new Error("Missing Google Chat target.");
	const base = stripMessageSuffix(normalized);
	if (isGoogleChatSpaceTarget(base)) return base;
	if (isGoogleChatUserTarget(base)) {
		const dm = await findGoogleChatDirectMessage({
			account: params.account,
			userName: base
		});
		if (!dm?.name) throw new Error(`No Google Chat DM found for ${base}`);
		return dm.name;
	}
	return base;
}
//#endregion
//#region extensions/googlechat/src/actions.ts
const providerId = "googlechat";
function listEnabledAccounts(cfg) {
	return listEnabledGoogleChatAccounts(cfg).filter((account) => account.enabled && account.credentialSource !== "none");
}
function isReactionsEnabled(accounts, cfg) {
	for (const account of accounts) if (createActionGate(account.config.actions ?? (cfg.channels?.["googlechat"])?.actions)("reactions")) return true;
	return false;
}
function resolveAppUserNames(account) {
	return new Set(["users/app", account.config.botUser?.trim()].filter(Boolean));
}
const googlechatMessageActions = {
	describeMessageTool: ({ cfg }) => {
		const accounts = listEnabledAccounts(cfg);
		if (accounts.length === 0) return null;
		const actions = /* @__PURE__ */ new Set([]);
		actions.add("send");
		if (isReactionsEnabled(accounts, cfg)) {
			actions.add("react");
			actions.add("reactions");
		}
		return { actions: Array.from(actions) };
	},
	extractToolSend: ({ args }) => {
		return extractToolSend(args, "sendMessage");
	},
	handleAction: async ({ action, params, cfg, accountId }) => {
		const account = resolveGoogleChatAccount({
			cfg,
			accountId
		});
		if (account.credentialSource === "none") throw new Error("Google Chat credentials are missing.");
		if (action === "send") {
			const to = readStringParam(params, "to", { required: true });
			const content = readStringParam(params, "message", {
				required: true,
				allowEmpty: true
			});
			const mediaUrl = readStringParam(params, "media", { trim: false });
			const threadId = readStringParam(params, "threadId") ?? readStringParam(params, "replyTo");
			const space = await resolveGoogleChatOutboundSpace({
				account,
				target: to
			});
			if (mediaUrl) {
				const core = getGoogleChatRuntime();
				const maxBytes = (account.config.mediaMaxMb ?? 20) * 1024 * 1024;
				const loaded = await core.channel.media.fetchRemoteMedia({
					url: mediaUrl,
					maxBytes
				});
				const upload = await uploadGoogleChatAttachment({
					account,
					space,
					filename: loaded.fileName ?? "attachment",
					buffer: loaded.buffer,
					contentType: loaded.contentType
				});
				await sendGoogleChatMessage({
					account,
					space,
					text: content,
					thread: threadId ?? void 0,
					attachments: upload.attachmentUploadToken ? [{
						attachmentUploadToken: upload.attachmentUploadToken,
						contentName: loaded.fileName
					}] : void 0
				});
				return jsonResult({
					ok: true,
					to: space
				});
			}
			await sendGoogleChatMessage({
				account,
				space,
				text: content,
				thread: threadId ?? void 0
			});
			return jsonResult({
				ok: true,
				to: space
			});
		}
		if (action === "react") {
			const messageName = readStringParam(params, "messageId", { required: true });
			const { emoji, remove, isEmpty } = readReactionParams(params, { removeErrorMessage: "Emoji is required to remove a Google Chat reaction." });
			if (remove || isEmpty) {
				const reactions = await listGoogleChatReactions({
					account,
					messageName
				});
				const appUsers = resolveAppUserNames(account);
				const toRemove = reactions.filter((reaction) => {
					const userName = reaction.user?.name?.trim();
					if (appUsers.size > 0 && !appUsers.has(userName ?? "")) return false;
					if (emoji) return reaction.emoji?.unicode === emoji;
					return true;
				});
				for (const reaction of toRemove) {
					if (!reaction.name) continue;
					await deleteGoogleChatReaction({
						account,
						reactionName: reaction.name
					});
				}
				return jsonResult({
					ok: true,
					removed: toRemove.length
				});
			}
			return jsonResult({
				ok: true,
				reaction: await createGoogleChatReaction({
					account,
					messageName,
					emoji
				})
			});
		}
		if (action === "reactions") return jsonResult({
			ok: true,
			reactions: await listGoogleChatReactions({
				account,
				messageName: readStringParam(params, "messageId", { required: true }),
				limit: readNumberParam(params, "limit", { integer: true }) ?? void 0
			})
		});
		throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
	}
};
//#endregion
//#region extensions/googlechat/src/group-policy.ts
function resolveGoogleChatGroupRequireMention(params) {
	return resolveChannelGroupRequireMention({
		cfg: params.cfg,
		channel: "googlechat",
		groupId: params.groupId,
		accountId: params.accountId
	});
}
const googlechatSetupAdapter = createPatchedAccountSetupAdapter({
	channelKey: "googlechat",
	validateInput: ({ accountId, input }) => {
		if (input.useEnv && accountId !== "default") return "GOOGLE_CHAT_SERVICE_ACCOUNT env vars can only be used for the default account.";
		if (!input.useEnv && !input.token && !input.tokenFile) return "Google Chat requires --token (service account JSON) or --token-file.";
		return null;
	},
	buildPatch: (input) => {
		const patch = input.useEnv ? {} : input.tokenFile ? { serviceAccountFile: input.tokenFile } : input.token ? { serviceAccount: input.token } : {};
		const audienceType = input.audienceType?.trim();
		const audience = input.audience?.trim();
		const webhookPath = input.webhookPath?.trim();
		const webhookUrl = input.webhookUrl?.trim();
		return {
			...patch,
			...audienceType ? { audienceType } : {},
			...audience ? { audience } : {},
			...webhookPath ? { webhookPath } : {},
			...webhookUrl ? { webhookUrl } : {}
		};
	}
});
//#endregion
//#region extensions/googlechat/src/setup-surface.ts
const channel = "googlechat";
const ENV_SERVICE_ACCOUNT = "GOOGLE_CHAT_SERVICE_ACCOUNT";
const ENV_SERVICE_ACCOUNT_FILE = "GOOGLE_CHAT_SERVICE_ACCOUNT_FILE";
const USE_ENV_FLAG = "__googlechatUseEnv";
const AUTH_METHOD_FLAG = "__googlechatAuthMethod";
const googlechatDmPolicy = createNestedChannelDmPolicy({
	label: "Google Chat",
	channel,
	section: "dm",
	policyKey: "channels.googlechat.dm.policy",
	allowFromKey: "channels.googlechat.dm.allowFrom",
	getCurrent: (cfg) => cfg.channels?.googlechat?.dm?.policy ?? "pairing",
	promptAllowFrom: createNestedChannelParsedAllowFromPrompt({
		channel,
		section: "dm",
		defaultAccountId: DEFAULT_ACCOUNT_ID,
		enabled: true,
		message: "Google Chat allowFrom (users/<id> or raw email; avoid users/<email>)",
		placeholder: "users/123456789, name@example.com",
		parseEntries: (raw) => ({ entries: mergeAllowFromEntries(void 0, splitSetupEntries(raw)) })
	}),
	enabled: true
});
const googlechatSetupWizard = {
	channel,
	status: createStandardChannelSetupStatus({
		channelLabel: "Google Chat",
		configuredLabel: "configured",
		unconfiguredLabel: "needs service account",
		configuredHint: "configured",
		unconfiguredHint: "needs auth",
		includeStatusLine: true,
		resolveConfigured: ({ cfg }) => listGoogleChatAccountIds(cfg).some((accountId) => resolveGoogleChatAccount({
			cfg,
			accountId
		}).credentialSource !== "none")
	}),
	introNote: {
		title: "Google Chat setup",
		lines: [
			"Google Chat apps use service-account auth and an HTTPS webhook.",
			"Set the Chat API scopes in your service account and configure the Chat app URL.",
			"Webhook verification requires audience type + audience value.",
			`Docs: ${formatDocsLink("/channels/googlechat", "googlechat")}`
		]
	},
	prepare: async ({ cfg, accountId, credentialValues, prompter }) => {
		if (accountId === "default" && (Boolean(process.env[ENV_SERVICE_ACCOUNT]) || Boolean(process.env[ENV_SERVICE_ACCOUNT_FILE]))) {
			if (await prompter.confirm({
				message: "Use GOOGLE_CHAT_SERVICE_ACCOUNT env vars?",
				initialValue: true
			})) return {
				cfg: applySetupAccountConfigPatch({
					cfg,
					channelKey: channel,
					accountId,
					patch: {}
				}),
				credentialValues: {
					...credentialValues,
					[USE_ENV_FLAG]: "1"
				}
			};
		}
		const method = await prompter.select({
			message: "Google Chat auth method",
			options: [{
				value: "file",
				label: "Service account JSON file"
			}, {
				value: "inline",
				label: "Paste service account JSON"
			}],
			initialValue: "file"
		});
		return { credentialValues: {
			...credentialValues,
			[USE_ENV_FLAG]: "0",
			[AUTH_METHOD_FLAG]: String(method)
		} };
	},
	credentials: [],
	textInputs: [{
		inputKey: "tokenFile",
		message: "Service account JSON path",
		placeholder: "/path/to/service-account.json",
		shouldPrompt: ({ credentialValues }) => credentialValues[USE_ENV_FLAG] !== "1" && credentialValues[AUTH_METHOD_FLAG] === "file",
		validate: ({ value }) => String(value ?? "").trim() ? void 0 : "Required",
		normalizeValue: ({ value }) => String(value).trim(),
		applySet: async ({ cfg, accountId, value }) => applySetupAccountConfigPatch({
			cfg,
			channelKey: channel,
			accountId,
			patch: { serviceAccountFile: value }
		})
	}, {
		inputKey: "token",
		message: "Service account JSON (single line)",
		placeholder: "{\"type\":\"service_account\", ... }",
		shouldPrompt: ({ credentialValues }) => credentialValues[USE_ENV_FLAG] !== "1" && credentialValues[AUTH_METHOD_FLAG] === "inline",
		validate: ({ value }) => String(value ?? "").trim() ? void 0 : "Required",
		normalizeValue: ({ value }) => String(value).trim(),
		applySet: async ({ cfg, accountId, value }) => applySetupAccountConfigPatch({
			cfg,
			channelKey: channel,
			accountId,
			patch: { serviceAccount: value }
		})
	}],
	finalize: async ({ cfg, accountId, prompter }) => {
		const account = resolveGoogleChatAccount({
			cfg,
			accountId
		});
		const audienceType = await prompter.select({
			message: "Webhook audience type",
			options: [{
				value: "app-url",
				label: "App URL (recommended)"
			}, {
				value: "project-number",
				label: "Project number"
			}],
			initialValue: account.config.audienceType === "project-number" ? "project-number" : "app-url"
		});
		const audience = await prompter.text({
			message: audienceType === "project-number" ? "Project number" : "App URL",
			placeholder: audienceType === "project-number" ? "1234567890" : "https://your.host/googlechat",
			initialValue: account.config.audience || void 0,
			validate: (value) => String(value ?? "").trim() ? void 0 : "Required"
		});
		return { cfg: migrateBaseNameToDefaultAccount({
			cfg: applySetupAccountConfigPatch({
				cfg,
				channelKey: channel,
				accountId,
				patch: {
					audienceType,
					audience: String(audience).trim()
				}
			}),
			channelKey: channel
		}) };
	},
	dmPolicy: googlechatDmPolicy
};
//#endregion
//#region extensions/googlechat/src/channel.ts
const meta = getChatChannelMeta("googlechat");
const loadGoogleChatChannelRuntime = createLazyRuntimeNamedExport(() => import("./channel.runtime-DVZwGdas.js"), "googleChatChannelRuntime");
const formatAllowFromEntry = (entry) => entry.trim().replace(/^(googlechat|google-chat|gchat):/i, "").replace(/^user:/i, "").replace(/^users\//i, "").toLowerCase();
const googleChatConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: "googlechat",
	listAccountIds: listGoogleChatAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveGoogleChatAccount),
	defaultAccountId: resolveDefaultGoogleChatAccountId,
	clearBaseFields: [
		"serviceAccount",
		"serviceAccountFile",
		"audienceType",
		"audience",
		"webhookPath",
		"webhookUrl",
		"botUser",
		"name"
	],
	resolveAllowFrom: (account) => account.config.dm?.allowFrom,
	formatAllowFrom: (allowFrom) => formatNormalizedAllowFromEntries({
		allowFrom,
		normalizeEntry: formatAllowFromEntry
	}),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const googlechatActions = {
	describeMessageTool: (ctx) => googlechatMessageActions.describeMessageTool?.(ctx) ?? null,
	extractToolSend: (ctx) => googlechatMessageActions.extractToolSend?.(ctx) ?? null,
	handleAction: async (ctx) => {
		if (!googlechatMessageActions.handleAction) throw new Error("Google Chat actions are not available.");
		return await googlechatMessageActions.handleAction(ctx);
	}
};
const collectGoogleChatSecurityWarnings = composeAccountWarningCollectors(createAllowlistProviderOpenWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.googlechat !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	buildOpenWarning: {
		surface: "Google Chat spaces",
		openBehavior: "allows any space to trigger (mention-gated)",
		remediation: "Set channels.googlechat.groupPolicy=\"allowlist\" and configure channels.googlechat.groups"
	}
}), (account) => account.config.dm?.policy === "open" && "- Google Chat DMs are open to anyone. Set channels.googlechat.dm.policy=\"pairing\" or \"allowlist\".");
const googlechatPlugin = createChatChannelPlugin({
	base: {
		id: "googlechat",
		meta: { ...meta },
		setup: googlechatSetupAdapter,
		setupWizard: googlechatSetupWizard,
		capabilities: {
			chatTypes: [
				"direct",
				"group",
				"thread"
			],
			reactions: true,
			threads: true,
			media: true,
			nativeCommands: false,
			blockStreaming: true
		},
		streaming: { blockStreamingCoalesceDefaults: {
			minChars: 1500,
			idleMs: 1e3
		} },
		reload: { configPrefixes: ["channels.googlechat"] },
		configSchema: buildChannelConfigSchema(GoogleChatConfigSchema),
		config: {
			...googleChatConfigAdapter,
			isConfigured: (account) => account.credentialSource !== "none",
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: account.credentialSource !== "none",
				extra: { credentialSource: account.credentialSource }
			})
		},
		groups: { resolveRequireMention: resolveGoogleChatGroupRequireMention },
		messaging: {
			normalizeTarget: normalizeGoogleChatTarget,
			targetResolver: {
				looksLikeId: (raw, normalized) => {
					const value = normalized ?? raw.trim();
					return isGoogleChatSpaceTarget(value) || isGoogleChatUserTarget(value);
				},
				hint: "<spaces/{space}|users/{user}>"
			}
		},
		directory: createChannelDirectoryAdapter({
			listPeers: async (params) => listResolvedDirectoryUserEntriesFromAllowFrom({
				...params,
				resolveAccount: adaptScopedAccountAccessor(resolveGoogleChatAccount),
				resolveAllowFrom: (account) => account.config.dm?.allowFrom,
				normalizeId: (entry) => normalizeGoogleChatTarget(entry) ?? entry
			}),
			listGroups: async (params) => listResolvedDirectoryGroupEntriesFromMapKeys({
				...params,
				resolveAccount: adaptScopedAccountAccessor(resolveGoogleChatAccount),
				resolveGroups: (account) => account.config.groups
			})
		}),
		resolver: { resolveTargets: async ({ inputs, kind }) => {
			return inputs.map((input) => {
				const normalized = normalizeGoogleChatTarget(input);
				if (!normalized) return {
					input,
					resolved: false,
					note: "empty target"
				};
				if (kind === "user" && isGoogleChatUserTarget(normalized)) return {
					input,
					resolved: true,
					id: normalized
				};
				if (kind === "group" && isGoogleChatSpaceTarget(normalized)) return {
					input,
					resolved: true,
					id: normalized
				};
				return {
					input,
					resolved: false,
					note: "use spaces/{space} or users/{user}"
				};
			});
		} },
		actions: googlechatActions,
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			collectStatusIssues: (accounts) => accounts.flatMap((entry) => {
				const accountId = String(entry.accountId ?? "default");
				const enabled = entry.enabled !== false;
				const configured = entry.configured === true;
				if (!enabled || !configured) return [];
				const issues = [];
				if (!entry.audience) issues.push({
					channel: "googlechat",
					accountId,
					kind: "config",
					message: "Google Chat audience is missing (set channels.googlechat.audience).",
					fix: "Set channels.googlechat.audienceType and channels.googlechat.audience."
				});
				if (!entry.audienceType) issues.push({
					channel: "googlechat",
					accountId,
					kind: "config",
					message: "Google Chat audienceType is missing (app-url or project-number).",
					fix: "Set channels.googlechat.audienceType and channels.googlechat.audience."
				});
				return issues;
			}),
			buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot, {
				credentialSource: snapshot.credentialSource ?? "none",
				audienceType: snapshot.audienceType ?? null,
				audience: snapshot.audience ?? null,
				webhookPath: snapshot.webhookPath ?? null,
				webhookUrl: snapshot.webhookUrl ?? null
			}),
			probeAccount: async ({ account }) => (await loadGoogleChatChannelRuntime()).probeGoogleChat(account),
			resolveAccountSnapshot: ({ account }) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: account.credentialSource !== "none",
				extra: {
					credentialSource: account.credentialSource,
					audienceType: account.config.audienceType,
					audience: account.config.audience,
					webhookPath: account.config.webhookPath,
					webhookUrl: account.config.webhookUrl,
					dmPolicy: account.config.dm?.policy ?? "pairing"
				}
			})
		}),
		gateway: { startAccount: async (ctx) => {
			const account = ctx.account;
			const statusSink = createAccountStatusSink({
				accountId: account.accountId,
				setStatus: ctx.setStatus
			});
			ctx.log?.info(`[${account.accountId}] starting Google Chat webhook`);
			const { resolveGoogleChatWebhookPath, startGoogleChatMonitor } = await loadGoogleChatChannelRuntime();
			statusSink({
				running: true,
				lastStartAt: Date.now(),
				webhookPath: resolveGoogleChatWebhookPath({ account }),
				audienceType: account.config.audienceType,
				audience: account.config.audience
			});
			await runPassiveAccountLifecycle({
				abortSignal: ctx.abortSignal,
				start: async () => await startGoogleChatMonitor({
					account,
					config: ctx.cfg,
					runtime: ctx.runtime,
					abortSignal: ctx.abortSignal,
					webhookPath: account.config.webhookPath,
					webhookUrl: account.config.webhookUrl,
					statusSink
				}),
				stop: async (unregister) => {
					unregister?.();
				},
				onStop: async () => {
					statusSink({
						running: false,
						lastStopAt: Date.now()
					});
				}
			});
		} }
	},
	pairing: { text: {
		idLabel: "googlechatUserId",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: (entry) => formatAllowFromEntry(entry),
		notify: async ({ cfg, id, message }) => {
			const account = resolveGoogleChatAccount({ cfg });
			if (account.credentialSource === "none") return;
			const user = normalizeGoogleChatTarget(id) ?? id;
			const space = await resolveGoogleChatOutboundSpace({
				account,
				target: isGoogleChatUserTarget(user) ? user : `users/${user}`
			});
			const { sendGoogleChatMessage } = await loadGoogleChatChannelRuntime();
			await sendGoogleChatMessage({
				account,
				space,
				text: message
			});
		}
	} },
	security: {
		dm: {
			channelKey: "googlechat",
			resolvePolicy: (account) => account.config.dm?.policy,
			resolveAllowFrom: (account) => account.config.dm?.allowFrom,
			allowFromPathSuffix: "dm.",
			normalizeEntry: (raw) => formatAllowFromEntry(raw)
		},
		collectWarnings: collectGoogleChatSecurityWarnings
	},
	threading: { topLevelReplyToMode: "googlechat" },
	outbound: {
		base: {
			deliveryMode: "direct",
			chunker: (text, limit) => getGoogleChatRuntime().channel.text.chunkMarkdownText(text, limit),
			chunkerMode: "markdown",
			textChunkLimit: 4e3,
			resolveTarget: ({ to }) => {
				const trimmed = to?.trim() ?? "";
				if (trimmed) {
					const normalized = normalizeGoogleChatTarget(trimmed);
					if (!normalized) return {
						ok: false,
						error: missingTargetError("Google Chat", "<spaces/{space}|users/{user}>")
					};
					return {
						ok: true,
						to: normalized
					};
				}
				return {
					ok: false,
					error: missingTargetError("Google Chat", "<spaces/{space}|users/{user}>")
				};
			}
		},
		attachedResults: {
			channel: "googlechat",
			sendText: async ({ cfg, to, text, accountId, replyToId, threadId }) => {
				const account = resolveGoogleChatAccount({
					cfg,
					accountId
				});
				const space = await resolveGoogleChatOutboundSpace({
					account,
					target: to
				});
				const thread = threadId ?? replyToId ?? void 0;
				const { sendGoogleChatMessage } = await loadGoogleChatChannelRuntime();
				return {
					messageId: (await sendGoogleChatMessage({
						account,
						space,
						text,
						thread
					}))?.messageName ?? "",
					chatId: space
				};
			},
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, replyToId, threadId }) => {
				if (!mediaUrl) throw new Error("Google Chat mediaUrl is required.");
				const account = resolveGoogleChatAccount({
					cfg,
					accountId
				});
				const space = await resolveGoogleChatOutboundSpace({
					account,
					target: to
				});
				const thread = threadId ?? replyToId ?? void 0;
				const runtime = getGoogleChatRuntime();
				const effectiveMaxBytes = resolveChannelMediaMaxBytes({
					cfg,
					resolveChannelLimitMb: ({ cfg, accountId }) => (cfg.channels?.["googlechat"])?.accounts?.[accountId]?.mediaMaxMb ?? (cfg.channels?.["googlechat"])?.mediaMaxMb,
					accountId
				}) ?? (account.config.mediaMaxMb ?? 20) * 1024 * 1024;
				const loaded = /^https?:\/\//i.test(mediaUrl) ? await runtime.channel.media.fetchRemoteMedia({
					url: mediaUrl,
					maxBytes: effectiveMaxBytes
				}) : await runtime.media.loadWebMedia(mediaUrl, {
					maxBytes: effectiveMaxBytes,
					localRoots: mediaLocalRoots?.length ? mediaLocalRoots : void 0
				});
				const { sendGoogleChatMessage, uploadGoogleChatAttachment } = await loadGoogleChatChannelRuntime();
				const upload = await uploadGoogleChatAttachment({
					account,
					space,
					filename: loaded.fileName ?? "attachment",
					buffer: loaded.buffer,
					contentType: loaded.contentType
				});
				return {
					messageId: (await sendGoogleChatMessage({
						account,
						space,
						text,
						thread,
						attachments: upload.attachmentUploadToken ? [{
							attachmentUploadToken: upload.attachmentUploadToken,
							contentName: loaded.fileName
						}] : void 0
					}))?.messageName ?? "",
					chatId: space
				};
			}
		}
	}
});
//#endregion
export { googlechatPlugin as t };
