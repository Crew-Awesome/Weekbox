/**
 * Mod Downloader and Extractor
 * Uses native OS tools (curl, powershell/unzip) to avoid Node/JS memory leaks with large binaries.
 */
import { getModTempPath, getModInstallPath, getTempPath, getModsPath } from '../paths.js';

function quote(str) {
    return `"${str}"`;
}

function log(msg) {
    const time = new Date().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
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
        // Ignore if exists
    }
}

async function removeDir(path) {
    try {
        if (window.NL_OS === 'Windows') {
            await Neutralino.os.execCommand(`powershell -NoProfile -Command "Remove-Item -LiteralPath ${quote(path)} -Recurse -Force -ErrorAction Ignore"`);
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
    // Loop up to 3 times to handle deeply nested folders
    for (let i = 0; i < 3; i++) {
        try {
            const files = await Neutralino.filesystem.readDirectory(installPath);
            const realFiles = files.filter(f => f.entry !== '.' && f.entry !== '..');
            
            // If there's exactly one item and it's a directory, we need to extract its contents up one level
            if (realFiles.length === 1 && realFiles[0].type === 'DIRECTORY') {
                const nestedDirName = realFiles[0].entry;
                const nestedDirPath = window.NL_OS === 'Windows' 
                    ? `${installPath}\\${nestedDirName}` 
                    : `${installPath}/${nestedDirName}`;
                    
                console.log(`[Downloader] Nested folder detected: "${nestedDirName}". Normalizing...`);
                
                if (window.NL_OS === 'Windows') {
                    // Use LiteralPath and -Force to ensure hidden files are moved too, avoiding PowerShell errors
                    const moveCmd = `powershell -NoProfile -NonInteractive -Command "Get-ChildItem -LiteralPath ${quote(nestedDirPath)} -Force | Move-Item -Destination ${quote(installPath)} -Force"`;
                    await execAsync(moveCmd);
                    
                    // Use -Recurse to ensure the directory is deleted even if some lock or hidden file remained
                    const rmCmd = `powershell -NoProfile -NonInteractive -Command "Remove-Item -LiteralPath ${quote(nestedDirPath)} -Recurse -Force"`;
                    await execAsync(rmCmd);
                } else {
                    // Use bash with dotglob to ensure hidden files are moved too
                    const moveCmd = `bash -c "shopt -s dotglob; mv ${quote(nestedDirPath)}/* ${quote(installPath)}/; rmdir ${quote(nestedDirPath)}"`;
                    await execAsync(moveCmd);
                }
            } else {
                // Structure is fine (either multiple files/folders, or single file which is valid)
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
        
        // 1. Prepare directories
        await ensureDir(await getTempPath());
        await ensureDir(await getModsPath());
        await ensureDir(tempPath);
        
        // 2. Download ZIP via native cURL (optimized)
        // -sSL: silent, show errors, follow redirects
        // --compressed: accept compressed streams to save bandwidth
        // -J: use server-provided filename
        // -O: write output to a local file
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
        
        // 3. Find the downloaded file
        const files = await Neutralino.filesystem.readDirectory(tempPath);
        // Exclude '.' and '..' which are returned by readDirectory
        const downloadedFile = files.find(f => f.type === 'FILE' && f.entry !== '.' && f.entry !== '..');
        
        if (!downloadedFile) {
            throw new Error("Download succeeded, but no file was written to disk.");
        }
        
        const fileName = downloadedFile.entry;
        const filePath = window.NL_OS === 'Windows' 
            ? `${tempPath}\\${fileName}` 
            : `${tempPath}/${fileName}`;
            
        log(`File downloaded successfully: ${fileName}`);
        
        // 4. Verify Extension
        let ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
        // Gamebanana sometimes forces a raw ID as filename without extension (e.g., '1758117')
        // We will assume it's a zip if there's no text extension or if it's purely numeric
        if (!ext || !isNaN(Number(ext))) {
            log(`File has no valid extension (detected '.${ext}'). Assuming it is a .zip archive.`);
            ext = 'zip';
        } else {
            log(`Detected format: .${ext}`);
        }
        
        await removeDir(installPath);
        await ensureDir(installPath);
        
        // 5. Extract based on format (Forcing rar and 7z as requested by user)
        if (ext === 'zip' || ext === 'rar' || ext === '7z') {
            log(`Extracting ${ext.toUpperCase()} archive...`);
            if (window.NL_OS === 'Windows') {
                // Using tar.exe built into Windows 10/11 - extremely fast and memory efficient compared to PowerShell
                const exCmd = `cmd.exe /c "tar -xf ${quote(filePath)} -C ${quote(installPath)}"`;
                const exResult = await execAsync(exCmd);
                if (exResult.exitCode !== 0) throw new Error(`tar Extraction failed (format might be unsupported or corrupted): ${exResult.stdErr}`);
            } else {
                const exCmd = `unzip -o ${quote(filePath)} -d ${quote(installPath)}`;
                const exResult = await execAsync(exCmd);
                if (exResult.exitCode !== 0) throw new Error(`Unzip failed: ${exResult.stdErr}`);
            }
        } else {
            throw new Error(`Formato de archivo no soportado: .${ext}`);
        }
        
        log(`Extraction complete! Normalizing directory structure...`);
        
        // 6. Normalize structure (fix nested folders)
        await normalizeExtractedMod(installPath);
        
        log(`Mod available at: ${installPath}`);
        
        // 7. Clean up temporary files
        await removeDir(tempPath);
        
        return { success: true, path: installPath };
        
    } catch (error) {
        log(`Mod installation failed: ${error}`);
        // Clean up broken temp folder
        await removeDir(tempPath).catch(() => {});
        return { success: false, error: error.message };
    }
}
