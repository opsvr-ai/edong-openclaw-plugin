import "./logger-kwZIqwuw.js";
import "./paths-ViKUYWUK.js";
import "./tmp-openclaw-dir-idKIOMmb.js";
import "./theme-CdOoMzRk.js";
import "./globals-DBUMOBZ8.js";
import "./subsystem-DISldKSB.js";
import "./ansi-BEJF8NKS.js";
import "./utils-CS0Ikux6.js";
import "./boundary-path-Dm0QJ7-y.js";
import "./boundary-file-read-DcZxlWD8.js";
import "./logger-BmpSCz93.js";
import "./exec-B5_AYfQG.js";
import { o as resolveRuntimeServiceVersion } from "./version-CD3oP1-d.js";
import { g as resolvePackageExtensionEntries, h as loadPluginManifest, l as detectBundleManifestFormat, m as getPackageManifestMetadata, r as isPathInside, t as checkMinHostVersion, u as loadBundleManifest } from "./min-host-version-RMBWtIAR.js";
import "./runtime-guard-PhQ6PwQa.js";
import "./path-alias-guards-DMcFUz5-.js";
import { a as resolveArchiveKind, i as readJsonFile, r as fileExists } from "./archive-Df6iZdzY.js";
import { d as writeFileFromPathWithinRoot } from "./fs-safe-B2bSW_OI.js";
import { i as validateRegistryNpmSpec } from "./npm-registry-spec-Rowj2qja.js";
import { r as resolveArchiveSourcePath } from "./install-source-utils-DFmsBpAQ.js";
import { i as withExtractedArchiveRoot, r as resolveExistingInstallPath, t as installPackageDir } from "./install-package-dir-B5z3MeXy.js";
import { a as finalizeNpmSpecArchiveInstall, i as resolveTimedInstallModeOptions, n as resolveCanonicalInstallTarget, o as installFromNpmSpecArchiveWithInstaller, r as resolveInstallModeOptions, t as ensureInstallTargetAvailable } from "./install-target-Co0WaDEK.js";
//#region src/plugins/install-security-scan.ts
async function loadInstallSecurityScanRuntime() {
	return await import("./install-security-scan.runtime-D09d8wvb.js");
}
async function scanBundleInstallSource(params) {
	const { scanBundleInstallSourceRuntime } = await loadInstallSecurityScanRuntime();
	await scanBundleInstallSourceRuntime(params);
}
async function scanPackageInstallSource(params) {
	const { scanPackageInstallSourceRuntime } = await loadInstallSecurityScanRuntime();
	await scanPackageInstallSourceRuntime(params);
}
//#endregion
export { checkMinHostVersion, detectBundleManifestFormat, ensureInstallTargetAvailable, fileExists, finalizeNpmSpecArchiveInstall, getPackageManifestMetadata, installFromNpmSpecArchiveWithInstaller, installPackageDir, isPathInside, loadBundleManifest, loadPluginManifest, readJsonFile, resolveArchiveKind, resolveArchiveSourcePath, resolveCanonicalInstallTarget, resolveExistingInstallPath, resolveInstallModeOptions, resolvePackageExtensionEntries, resolveRuntimeServiceVersion, resolveTimedInstallModeOptions, scanBundleInstallSource, scanPackageInstallSource, validateRegistryNpmSpec, withExtractedArchiveRoot, writeFileFromPathWithinRoot };
