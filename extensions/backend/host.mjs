import "./runtime.mjs";
import { gameBananaApi } from "./providers/gamebanana/gamebanana.js";
import { peoApi } from "./providers/peo/peo.js";
import * as github from "./providers/github/github-release.js";
import { FS } from "./services/filesystem.js";
import { appSettings } from "./core/system/settings.js";
import { getSelectedEngine, setSelectedEngine } from "./core/state/state.js";
import { parseWeekboxLink } from "./deep-links.mjs";
import { normalizeVersion, compareVersions } from "./core/updates/versioning.js";
import { appUpdater } from "./core/updates/app-updater.js";
import * as releaseAssets from "./core/updates/release-assets.js";
import { syncWindowsProtocolRegistration } from "./core/system/windows-protocol.js";
import { networkStatus } from "./core/system/network-status.js";
import * as archiveTransfer from "./services/downloads/archive-transfer.js";
import * as downloadValidation from "./services/downloads/download-validation.js";
import * as externalDownloads from "./services/downloads/external-download.resolver.js";
import { nativeFetch } from "./services/network/native-http.js";

const FILESYSTEM_METHODS = new Set([
  "runStartupMaintenance", "getDefaultStoragePath", "findFallbackStorage",
  "isCompleteStorage", "getStorageDestinationPath", "assertStoragePathAllowed",
  "copyFileAndVerify", "writeStorageManifest", "ensureStorageManifest",
  "ensureStorageDirectoriesAt", "setStoragePaths", "ensureStorageDirectories",
  "hasRunningProcesses", "findExistingStorage", "hasStorageFolder", "useExistingStorage",
  "moveStorageTo", "copyDirectoryWithProgress", "copyStorageDirectoriesWithProgress",
  "shouldRecommendDefaultStorage", "isOneDriveStorage", "isStorageInExecutableDirectory",
  "isICloudStorage", "cleanupHiddenModLinks", "importPsychOnlineEngineMods",
  "cleanupIncompleteDownloads", "hasModFiles", "cleanupInvalidInstalledMods",
  "cleanupInvalidEngineInstallations", "isEngineInstalled", "findExecutable",
  "getExecutableSearchError", "runEngine", "closeEngine", "closeEngineAndWait",
  "isEngineRunning", "getWineInstallations", "getEngineUpdateKey", "isEngineUpdateInProgress",
  "setEngineUpdateInProgress", "getRunningEngineMod", "getModLaunchState", "toggleModLaunch",
  "inspectLocalMod", "getInstalledEngines", "injectModIntoEngine", "injectModsIntoEngine",
  "injectModIntoInstalledEngines", "cleanupEngineMods", "getInstalledMods", "getStandaloneMods",
  "runStandaloneMod", "closeStandaloneMod", "isStandaloneModRunning", "isModRunning",
  "isModLockedForChanges", "assertModChangeAllowed", "saveInstalledMod",
  "getAvailableLocalModFolderName", "importLocalMod", "setModHidden", "setModEngineVersion",
  "setModEngineCompatibility", "updateModAppearance", "getModCover", "ensureModCover",
  "migrateLegacyModCovers", "addDependencyConsumer", "removeDependencyConsumer", "setModTags",
  "setModType", "moveModToDependencies", "moveDependencyToMods", "removeInstalledMod",
  "isModInstalled", "flattenModFolder",
]);

async function callFilesystem({ method, args = [] } = {}) {
  if (!FILESYSTEM_METHODS.has(method)) {
    throw new Error(`Unsupported filesystem method: ${method}`);
  }
  await FS.init({ deferMaintenance: true });
  const values = Array.isArray(args) ? args : [args];
  return FS[method](...values);
}

async function callNetwork({ url, method = "GET", headers, body } = {}) {
  if (!url) throw new Error("Network URL is required");
  const response = await nativeFetch(url, { method, headers, body });
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
}

const operations = {
  "backend.health": async () => ({ ready: true, platform: window.NL_OS }),
  "backend.capabilities": async () => Object.keys(operations).sort(),

  "gamebanana.search": ({ query, page = 1, perPage = 12 }) =>
    gameBananaApi.searchMods(query, page, perPage),
  "gamebanana.suggestions": ({ query, limit = 8 }) =>
    gameBananaApi.getSearchSuggestions(query, limit),
  "gamebanana.details": ({ modId, includeRequirements = true }) =>
    gameBananaApi.getModDetails(modId, { includeRequirements }),
  "gamebanana.profile": ({ modId }) => gameBananaApi.getModProfile(modId),
  "gamebanana.grid": ({ filter = "popular", page = 1, categoryId = null, options = {} }) =>
    gameBananaApi.getGridMods(filter, page, categoryId, options),
  "gamebanana.ripe": ({ page = 1, categoryId = null, options = {} }) =>
    gameBananaApi.getRipeMods(page, categoryId, options),
  "gamebanana.psychOnline": ({ filter = "popular", page = 1, categoryId = null, options = {} }) =>
    gameBananaApi.getPsychOnlineGridMods(filter, page, categoryId, options),
  "gamebanana.mergePsychOnline": ({ gameBananaMods = [], peoMods = [] }) =>
    gameBananaApi.mergePsychOnlineDiscoveryMods(gameBananaMods, peoMods),
  "gamebanana.featured": () => gameBananaApi.getFeaturedCarousel(),
  "gamebanana.primaryDownloadFile": ({ data }) => gameBananaApi.getPrimaryDownloadFile(data),
  "gamebanana.downloadFiles": ({ data }) => gameBananaApi.getDownloadFiles(data),
  "gamebanana.externalDownloadFiles": ({ data }) => gameBananaApi.getExternalDownloadFiles(data),
  "gamebanana.downloadOptions": ({ data }) => gameBananaApi.getDownloadOptions(data),
  "gamebanana.externalFileDetails": ({ url }) => gameBananaApi.getExternalFileDetails(url),
  "gamebanana.downloadAvailable": ({ url }) => gameBananaApi.isDownloadAvailable(url),
  "gamebanana.toolDetails": ({ toolId, requireDownload = true }) =>
    gameBananaApi.getToolDetails(toolId, { requireDownload }),
  "gamebanana.requirements": ({ data }) => gameBananaApi.getRequirements(data),
  "gamebanana.requirementDetails": ({ requirement }) => gameBananaApi.getRequirementDetails(requirement),
  "gamebanana.resolveEngine": ({ mod }) => gameBananaApi.resolveEngineIdForMod(mod),
  "gamebanana.submission": ({ url }) => gameBananaApi.getGameBananaSubmission(url),
  "gamebanana.engineIdForSubmission": ({ type, id }) => gameBananaApi.getEngineIdForSubmission(type, id),
  "gamebanana.imageUrl": ({ mod }) => gameBananaApi.getImageUrl(mod),
  "gamebanana.category": ({ category }) => gameBananaApi.getCategoryId(category),
  "gamebanana.engineForCategory": ({ categoryId }) => gameBananaApi.getEngineIdForCategory(categoryId),
  "gamebanana.engineForCategoryName": ({ categories = [] }) => gameBananaApi.getEngineIdForCategoryName(...categories),
  "gamebanana.engineForCategories": ({ categories = [] }) =>
    gameBananaApi.getEngineIdForCategories(...categories),
  "gamebanana.modKindForCategories": ({ categories = [] }) => gameBananaApi.getModKindForCategories(...categories),
  "gamebanana.isExcludedCategory": ({ categories = [] }) => gameBananaApi.isExcludedCategory(...categories),
  "gamebanana.isInCategory": ({ categoryId, categories = [] }) => gameBananaApi.isInCategory(categoryId, ...categories),
  "gamebanana.validRecords": ({ data }) => gameBananaApi.getValidRecords(data),
  "gamebanana.isDeleted": ({ mod }) => gameBananaApi.isDeletedMod(mod),
  "gamebanana.timeAgo": ({ timestamp }) => gameBananaApi.getTimeAgo(timestamp),
  "gamebanana.formatBytes": ({ bytes, decimals = 2 }) => gameBananaApi.formatBytes(bytes, decimals),

  "peo.list": ({ query = "", sort = "submitted:desc" }) => peoApi.listAll(query, sort),
  "peo.details": ({ modId }) => peoApi.getModDetails(modId),

  "github.engineReleases": ({ engineId }) => github.getEngineReleaseVersions(engineId),
  "github.engineUpdate": ({ engineId }) => github.getEngineUpdateCandidate(engineId),

  "network.fetch": callNetwork,
  "network.status": () => ({ online: networkStatus.online }),
  "network.setOnline": ({ online }) => { networkStatus.setOnline(online); return { online: networkStatus.online }; },

  "filesystem.init": ({ deferMaintenance = true } = {}) => FS.init({ deferMaintenance }),
  "filesystem.installedMods": async () => { await FS.init({ deferMaintenance: true }); return FS.getInstalledMods(); },
  "filesystem.installedEngines": async () => { await FS.init({ deferMaintenance: true }); return FS.getInstalledEngines(); },
  "filesystem.saveMod": async ({ modId, modName, metadata = {} }) => { await FS.init({ deferMaintenance: true }); return FS.saveInstalledMod(modId, modName, metadata); },
  "filesystem.removeMod": async ({ modId }) => { await FS.init({ deferMaintenance: true }); return FS.removeInstalledMod(modId); },
  "filesystem.inspectMod": async ({ path }) => { await FS.init({ deferMaintenance: true }); return FS.inspectLocalMod(path); },
  "filesystem.call": callFilesystem,

  "downloads.validateHtml": ({ sample }) => downloadValidation.getHtmlResponseError(sample)?.message || null,
  "downloads.googleDriveFileId": ({ url }) => externalDownloads.getGoogleDriveFileId(url),
  "downloads.mediaFireDirectUrl": ({ html }) => externalDownloads.extractMediaFireDirectUrl(html),
  "downloads.mediaFirePageError": ({ html }) => externalDownloads.getMediaFirePageError(html),
  "downloads.resolveExternalUrl": ({ url }) => externalDownloads.resolveExternalDownloadUrl(
    url,
    (...args) => Neutralino.os.execCommand(...args),
  ),
  "downloads.rangeSupportedFileSize": ({ url }) => externalDownloads.getRangeSupportedFileSize(
    url,
    (...args) => Neutralino.os.execCommand(...args),
  ),
  "downloads.detectArchiveFormat": ({ path }) => archiveTransfer.detectArchiveFormat(path),
  "downloads.segments": ({ totalBytes, outPath }) => archiveTransfer.getDownloadSegments(totalBytes, outPath),
  "downloads.partSizesValid": ({ parts, sizes }) => archiveTransfer.hasExpectedPartSizes(parts, sizes),
  "downloads.windowsMergeCommand": ({ parts, outPath }) => archiveTransfer.buildWindowsMergeCommand(parts, outPath),
  "downloads.unixMergeCommand": ({ parts, outPath }) => archiveTransfer.buildUnixMergeCommand(parts, outPath),
  "downloads.verifyArchive": ({ archivePath, expectedSize = 0, validateArchive = true }) =>
    archiveTransfer.verifyDownloadedArchiveContent(archivePath, expectedSize, validateArchive),
  "downloads.downloadArchive": ({ url, outPath, sourceType, expectedSize = 0, validateArchive = true }) =>
    archiveTransfer.downloadArchive({ url, outPath, sourceType, expectedSize, validateArchive, getTask: () => null }),
  "downloads.extractArchive": ({ archivePath, destinationPath, extractNested = false }) =>
    archiveTransfer.extractArchive({ archivePath, destinationPath, extractNested, getTask: () => null }),

  "updates.currentVersion": () => appUpdater.getCurrentVersion(),
  "updates.check": () => appUpdater.check(),
  "updates.platformPackage": () => releaseAssets.getPlatformPackage(),
  "updates.releaseAsset": ({ release, platform }) => releaseAssets.getReleaseAsset(release, platform),
  "updates.resourcesAsset": ({ release }) => releaseAssets.getResourcesAsset(release),
  "updates.windowsPackage": ({ release }) => releaseAssets.getWindowsPackage(release),
  "updates.install": ({ update }) => appUpdater.install(update, () => {}, () => {}),
  "updates.installResources": ({ update }) => appUpdater.installResourcesUpdate(update, () => {}, () => {}),
  "updates.installWindows": ({ update }) => appUpdater.installWindowsPackage(update, () => {}, () => {}),

  "system.syncProtocol": ({ enabled }) => syncWindowsProtocolRegistration(Boolean(enabled)),

  "settings.get": ({ key }) => appSettings.get(key),
  "settings.set": ({ key, value }) => appSettings.set(key, value),
  "state.getSelectedEngine": () => getSelectedEngine(),
  "state.setSelectedEngine": ({ engine }) => setSelectedEngine(engine),
  "routing.parseDeepLink": ({ value }) => parseWeekboxLink(value),
  "updates.normalizeVersion": ({ value }) => normalizeVersion(value),
  "updates.compareVersions": ({ left, right }) => compareVersions(left, right),
};

async function handleRequest(operation, params = {}) {
  const handler = operations[operation];
  if (!handler) throw new Error(`Unknown backend operation: ${operation}`);
  return handler(params || {});
}

export { handleRequest, operations };
