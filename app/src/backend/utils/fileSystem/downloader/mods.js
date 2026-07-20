/**
 * Mod Downloader and Extractor
 * Uses native OS tools (curl, powershell/unzip) to avoid Node/JS memory leaks with large binaries.
 */
import { getModTempPath, getModInstallPath, getTempPath, getModsPath } from '../paths.js';

function quote(str) {
    return `"${str}"`;
}

function log(msg) {
    /** HH:MM:SS.mmm */
    const time = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${time}] [Downloader] ${msg}`);
}

/**
 * Executes a command asynchronously using spawnProcess to prevent blocking the Neutralino backend.
 * This enables true parallel/simultaneous downloads.
 */
function execAsync(command) {
    return new Promise(async (resolve, reject) => {
        try {
            const processInfo = await Neutralino.os.spawnProcess(command);
            
            const onSpawned = (evt) => {
                if (evt.detail.id === processInfo.id) {
                    if (evt.detail.action === 'exit') {
                        Neutralino.events.off('spawnedProcess', onSpawned);
                        resolve({
                            exitCode: evt.detail.data,
                            stdErr: evt.detail.data !== 0 ? 'Command failed (spawnProcess)' : ''
                        });
                    }
                }
            };
            
            Neutralino.events.on('spawnedProcess', onSpawned);
        } catch (e) {
            resolve({ exitCode: 1, stdErr: e.message });
        }
    });
}

async function ensureDir(path) {
    try {
        await Neutralino.filesystem.createDirectory(path);
    } catch (e) {
        /** Ignore if exists */
    }
}

async function removeDir(path) {
    try {
        if (window.NL_OS === 'Windows') {
            /** Fix: Use single quotes for PowerShell literal paths to avoid nesting double quotes */
            await Neutralino.os.execCommand(`powershell -NoProfile -Command "Remove-Item -LiteralPath '${path}' -Recurse -Force -ErrorAction Ignore"`);
        } else {
            await Neutralino.os.execCommand(`rm -rf ${quote(path)}`);
        }
    } catch (e) {
        console.warn("Could not remove dir:", e);
    }
}

/**
 * Normalizes the extracted mod structure.
 * Fixes the issue where a ZIP file contains a single root folder containing the actual mod.
 * @param {string} installPath - The path where the mod was extracted
 */
async function normalizeExtractedMod(installPath) {
    /** Loop up to 10 times to handle deeply nested folders recursively */
    for (let i = 0; i < 10; i++) {
        try {
            const files = await Neutralino.filesystem.readDirectory(installPath);
            
            /** Filter out system or garbage files that could falsely trigger a multiple files condition */
            const ignoreList = ['.', '..', '__macosx', '.ds_store', 'desktop.ini', 'thumbs.db'];
            const realFiles = files.filter(f => !ignoreList.includes(f.entry.toLowerCase()));
            
            /** If there is exactly one item and it is a directory, we need to extract its contents up one level */
            if (realFiles.length === 1 && realFiles[0].type === 'DIRECTORY') {
                const nestedDirName = realFiles[0].entry;
                const nestedDirPath = window.NL_OS === 'Windows' 
                    ? `${installPath}\\${nestedDirName}` 
                    : `${installPath}/${nestedDirName}`;
                    
                console.log(`[Downloader] Nested folder detected: "${nestedDirName}". Normalizing...`);
                
                if (window.NL_OS === 'Windows') {
                    /** 
                     * Use LiteralPath and -Force to ensure hidden files are moved too, avoiding PowerShell errors.
                     * Fix: Use single quotes for paths to prevent nesting double quotes inside the -Command string.
                     */
                    const moveCmd = `powershell -NoProfile -NonInteractive -Command "Get-ChildItem -LiteralPath '${nestedDirPath}' -Force | Move-Item -Destination '${installPath}' -Force"`;
                    await execAsync(moveCmd);
                    
                    /** Use -Recurse to ensure the directory is deleted even if some lock or hidden file remained */
                    const rmCmd = `powershell -NoProfile -NonInteractive -Command "Remove-Item -LiteralPath '${nestedDirPath}' -Recurse -Force"`;
                    await execAsync(rmCmd);
                } else {
                    /** Use bash with dotglob to ensure hidden files are moved too */
                    const moveCmd = `bash -c "shopt -s dotglob; mv ${quote(nestedDirPath)}/* ${quote(installPath)}/; rmdir ${quote(nestedDirPath)}"`;
                    await execAsync(moveCmd);
                }
            } else {
                /** Structure is fine (contains either multiple real files or folders) */
                console.log(`[Downloader] Normalization complete. Root contains ${realFiles.length} item(s).`);
                break; 
            }
        } catch (e) {
            console.warn(`[Downloader] Error during structure normalization:`, e);
            break;
        }
    }
}

/**
 * Downloads and installs an FNF mod
 * @param {string} modName - Name of the mod
 * @param {string} downloadUrl - GameBanana URL or direct download link
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function installMod(modName, downloadUrl) {
    const tempPath = await getModTempPath(modName);
    const installPath = await getModInstallPath(modName);
    
    try {
        log(`Initiating installation for: ${modName}`);
        
        /** 1. Prepare directories */
        await ensureDir(await getTempPath());
        await ensureDir(await getModsPath());
        await ensureDir(tempPath);
        
        /** 2. Execute download and extraction attempts (Max 3) */
        let lastError = null;
        let extracted = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                log(`Attempt ${attempt}/3 starting...`);

                await removeDir(tempPath);
                await ensureDir(tempPath);

                let dlCmd = '';
                if (window.NL_OS === 'Windows') {
                    dlCmd = `cmd.exe /c "cd /d ${quote(tempPath)} && curl -sSL --compressed -J -O ${quote(downloadUrl)}"`;
                } else {
                    dlCmd = `cd ${quote(tempPath)} && curl -sSL --compressed -J -O ${quote(downloadUrl)}`;
                }

                log(`Downloading via curl...`);
                const dlResult = await execAsync(dlCmd);
                if (dlResult.exitCode !== 0) {
                    throw new Error(`cURL Download failed: ${dlResult.stdErr}`);
                }

                const files = await Neutralino.filesystem.readDirectory(tempPath);
                const downloadedFile = files.find(f => f.type === 'FILE' && f.entry !== '.' && f.entry !== '..');

                if (!downloadedFile) {
                    throw new Error('Download succeeded, but no file was written to disk.');
                }

                const fileName = downloadedFile.entry;
                const filePath = window.NL_OS === 'Windows'
                ? `${tempPath}\\${fileName}`
                : `${tempPath}/${fileName}`;

                log(`File downloaded successfully: ${fileName}`);

                let ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
                if (!ext || !isNaN(Number(ext))) {
                    log(`File has no valid extension (detected '.${ext}'). Assuming it is a .zip archive.`);
                    ext = 'zip';
                } else {
                    log(`Detected format: .${ext}`);
                }

                await removeDir(installPath);
                await ensureDir(installPath);

                if (ext === 'zip' || ext === 'rar' || ext === '7z') {
                    log(`Extracting ${ext.toUpperCase()} archive...`);

                    let exCmd = '';

                    if (window.NL_OS === 'Windows') {
                        exCmd = `cmd.exe /c "tar -xf ${quote(filePath)} -C ${quote(installPath)}"`;
                    } else {
                        exCmd = `unzip -o ${quote(filePath)} -d ${quote(installPath)}`;
                    }

                    const exResult = await execAsync(exCmd);
                    if (exResult.exitCode !== 0) {
                        throw new Error(`Extraction failed: ${exResult.stdErr}`);
                    }
                    } else {
                        throw new Error(`Type not supported: .${ext}`);
                    }

                    log(`Extraction complete! Normalizing directory structure...`);
                    await normalizeExtractedMod(installPath);

                    extracted = true;
                    log(`Attempt ${attempt}/3 succeeded.`);
                    break;
                } catch (err) {
                    lastError = err;
                    log(`Attempt ${attempt}/3 failed: ${err.message}`);

                    await removeDir(tempPath).catch(() => {});
                    await removeDir(installPath).catch(() => {});

                if (attempt === 3) {
                    throw lastError;
                }
            }
        }

        if (!extracted) {
            throw lastError || new Error('Unknown error during mod installation.');
        }

        log(`Mod available at: ${installPath}`);
        await removeDir(tempPath);
        return { success: true, path: installPath };
    } catch (error) {
        log(`Mod installation failed: ${error}`);
        /** Clean up broken temp folder */
        await removeDir(tempPath).catch(() => {});
        return { success: false, error: error.message };
    }
}