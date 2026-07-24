// Re-export UI components
export { globalDownloadToast } from './components/download-toast.component.js';
export { setupDropdown } from './components/dropdown.component.js';

// Re-export Media
export { getBase64FromUrl } from './media/base64-transformer.util.js';
export { applyDominantColor } from './media/extract-color.util.js';

// Re-export backend services originally in this file for backwards compatibility
export { extractArchive, downloadArchive, listenForProcess } from '../../backend/services/downloads/archive-transfer.service.js';
export { getGoogleDriveFileId, resolveExternalDownloadUrl, getRangeSupportedFileSize } from '../../backend/services/downloads/external-download.resolver.js';
export { sameProcessId, getOsProcessId } from '../../backend/services/processes/spawned-process.util.js';
export { parseWindowsProcessTree, parsePosixProcessTree, findDescendantPids } from '../../backend/services/processes/process-tree.util.js';
export { ProcessService } from '../../backend/services/processes/process.service.js';
export { getParentPath, sanitizePathSegment, getRealEntries, getModFolderName, getEngineModFolderName, sanitizeModFolderName } from '../../backend/services/filesystem/path.util.js';
export { APIneuFileSystem } from '../../backend/services/filesystem/api-neu-file-system.service.js';
export { ExecutableService } from '../../backend/services/filesystem/executable.service.js';
export { ModInjectionService } from '../../backend/services/filesystem/mod-injection.service.js';
export { isValidEngineVersion } from '../../backend/services/filesystem/engine-version.service.js';
export { ModRepository } from '../../backend/services/filesystem/mod-repository.service.js';
export { ModCoverService } from '../../backend/services/filesystem/mod-cover.service.js';
export { LibraryMaintenanceService } from '../../backend/services/filesystem/library-maintenance.service.js';
export { FS } from '../../backend/services/filesystem.js';
