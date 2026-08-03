// UI Master Barrel Exports

// Config
export { AppUpdateController } from "./config/appUpdateController.js";
export { StorageMoveFeedback } from "./config/storageMoveFeedback.js";
export { configModal } from "./config/index.js";

// Errors
export { wineModal } from "./errors/wineModal.js";
export { errorHandler } from "./errors/errorHandler.js";

// Engines
export {
  describeExtractedFiles,
  flattenEngineDirectory,
} from "./engines/engineInstallFiles.js";
export {
  extractVersionFallback,
  getTargetPlatform,
  getTargetLink,
} from "./engines/utils.js";
export { engineUpdateModal } from "./engines/engineUpdateModal.js";
export { engineUpdateToast } from "./engines/engineUpdateToast.js";
export { downloadEngine } from "./engines/downloadEngine.js";
export { engineUpdateService } from "./engines/engineUpdateService.js";
export { fetchAndRenderReleaseNotes } from "./engines/releaseNotes.js";
export { engineDropdown } from "./engines/dropdown.js";
export { engineInstallToast } from "./engines/engineInstallToast.js";
export { modsMaster } from "./engines/modsMasterClass.js";
export { enginesView, registerEnginesView } from "./engines/index.js";

// Engine Manager
export { engineManagerModal } from "./engine-manager/index.js";

// Mod Manager
export {
  renderTemplate,
  modManagerTemplates,
  __renderTemplate,
  __modManagerTemplates,
} from "./mod-manager/templates.js";
export {
  primeModCover,
  loadModCardImage,
  getModCover,
} from "./mod-manager/modImageLoader.js";
export { setupModSettingsDropdowns } from "./mod-manager/modSettingsDropdowns.js";
export { modSettingsModal } from "./mod-manager/modSettingsModal.js";
export {
  replaceProcessExitListener,
  syncLaunchButton,
} from "./mod-manager/processUiSync.js";
export { dependenciesRenderer } from "./mod-manager/dependenciesRenderer.js";
export { cardRenderer } from "./mod-manager/cardRenderer.js";
export { localModImportModal } from "./mod-manager/localModImportModal.js";
export { openFilterSortModal } from "./mod-manager/filterSortModal.js";
export { modManagerModal } from "./mod-manager/index.js";

// Home
export { homeCarousel } from "./home/carousel.js";
export { homeScroll } from "./home/homeScroll.js";
export { homeSearchDropdown } from "./home/searchDropdown.js";
export { homeSearch } from "./home/search.js";
export { homeView, registerHomeView } from "./home/index.js";
export { newsView, registerNewsView } from "./news.js";

// Home Grid
export { homeGrid } from "./home/grid/index.js";
export { gridState } from "./home/grid/gridState.js";
export { gridRender } from "./home/grid/gridRender.js";
export { filterManager } from "./home/grid/filterManager.js";
export { scrollManager } from "./home/grid/scrollManager.js";
export { createCard } from "./home/grid/cardBuilder.js";

// Home Modal
export { modModalCarousel } from "./home/modal/carousel.js";
export {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
  getCheckoutDialogFocusables,
} from "./home/modal/dialogFocus.js";
export { dependencyReviewModal } from "./home/modal/dependencyReviewModal.js";
export { downloadChoiceModal } from "./home/modal/downloadChoiceModal.js";
export { toastDownloadMod } from "./home/modal/toastDownloadMod.js";
export { downloadMod } from "./home/modal/downloadMod.js";
export {
  ensureModal,
  showModal,
  hideModal,
  resetModal,
  showModData,
  updateDownloadStatus,
} from "./home/modal/modalUi.js";
export { modModal } from "./home/modal/index.js";

// Toasts
export { toastSystem } from "./toasts/toastSystem.js";

// Updates
export { appUpdateModal } from "./updates/appUpdateModal.js";

// Root Modals & Navigation
export { sidebar } from "./sidebar.js";
export { i18n, t } from "./i18n/index.js";
export { existingStorageModal } from "./existingStorageModal.js";
export { firstRunStorageModal } from "./firstRunStorageModal.js";
export { storageRecommendationModal } from "./storageRecommendationModal.js";
