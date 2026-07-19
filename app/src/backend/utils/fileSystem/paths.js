/**
 * Utility for resolving and formatting absolute paths for the application data folder.
 * Uses Neutralino API to determine OS-specific paths.
 */

/**
 * Normalizes a path by replacing forward slashes with backslashes on Windows, 
 * or vice versa, based on the OS.
 * @param {string} rawPath 
 * @returns {string} Normalized path
 */
function normalizePath(rawPath) {
    if (window.NL_OS === 'Windows') {
        return rawPath.replace(/\//g, '\\');
    }
    return rawPath.replace(/\\/g, '/');
}

/**
 * Gets the base WeekBox data path (e.g. AppData/Roaming/WeekBox on Windows)
 * @returns {Promise<string>}
 */
export async function getWeekBoxPath() {
    const dataPath = await Neutralino.os.getPath('data');
    return normalizePath(`${dataPath}/WeekBox`);
}

/**
 * Gets the root directory for installed mods
 * @returns {Promise<string>}
 */
export async function getModsPath() {
    const basePath = await getWeekBoxPath();
    return normalizePath(`${basePath}/mods`);
}

/**
 * Gets the temporary directory for downloading mods
 * @returns {Promise<string>}
 */
export async function getTempPath() {
    const basePath = await getWeekBoxPath();
    return normalizePath(`${basePath}/temp`);
}

/**
 * Gets the path for a specific mod installation
 * @param {string} modName 
 * @returns {Promise<string>}
 */
export async function getModInstallPath(modName) {
    const modsPath = await getModsPath();
    // Sanitize mod name for folder usage
    const safeName = modName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    return normalizePath(`${modsPath}/${safeName}`);
}

/**
 * Gets the temporary extraction path for a specific mod
 * Appends a timestamp to guarantee uniqueness and avoid file system lock race conditions
 * @param {string} modName 
 * @returns {Promise<string>}
 */
export async function getModTempPath(modName) {
    const tempPath = await getTempPath();
    const safeName = modName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    return normalizePath(`${tempPath}/temp_mod_${safeName}_${Date.now()}`);
}
