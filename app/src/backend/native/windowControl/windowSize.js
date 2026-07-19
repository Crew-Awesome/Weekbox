/**
 * @typedef {Object} WindowDimensions
 * @property {number} width
 * @property {number} height
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [dpi]
 */

/**
 * @param {number} width
 * @param {number} height
 * @returns {Promise<void>}
 */
export async function centerWindow(width, height) {
    const screenW = window.screen.availWidth || window.screen.width;
    const screenH = window.screen.availHeight || window.screen.height;
    await Neutralino.window.move(
        Math.max(0, Math.round((screenW - width) / 2)),
        Math.max(0, Math.round((screenH - height) / 2))
    );
}

/**
 * @returns {Promise<void>}
 */
export async function ensureTmpDirectory() {
    try {
        await Neutralino.filesystem.createDirectory('./.tmp');
    } catch (e) {}
}

/**
 * @returns {Promise<WindowDimensions|null>}
 */
export async function readStoredWindowDimensions() {
    try {
        const data = await Neutralino.filesystem.readFile('./.tmp/windowData.json');
        const dimensions = JSON.parse(data);
        if (dimensions?.width && dimensions?.height) {
            return dimensions;
        }
    } catch (e) {}
    return null;
}

/**
 * @param {WindowDimensions} size
 * @returns {Promise<void>}
 */
export async function writeStoredWindowDimensions(size) {
    try {
        await ensureTmpDirectory();
        await Neutralino.filesystem.writeFile('./.tmp/windowData.json', JSON.stringify(size));
    } catch (e) {}
}
