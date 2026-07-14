import { FS } from '../../../utils/filesystem.js';
import { toastDownloadMod } from './toastDownloadMod.js';

export const downloadMod = {
    activeTasks: new Map(),

    cancel(modId) {
        const task = this.activeTasks.get(modId);
        if (task) {
            task.cancelled = true;
            if (task.pid) {
                const os = window.NL_OS;
                if (os === 'Windows') {
                    Neutralino.os.execCommand(`taskkill /F /PID ${task.pid}`, { background: true }).catch(() => {});
                } else {
                    Neutralino.os.execCommand(`kill -9 ${task.pid}`, { background: true }).catch(() => {});
                }
            }
            
            toastDownloadMod.cancelAnim(modId);
            
            setTimeout(() => {
                this.cleanupData(modId, task.tempFilePath, task.targetModFolder);
                this.activeTasks.delete(modId);
                toastDownloadMod.hide(modId);
                
                const modalBtn = document.getElementById('modal-download-btn');
                if (modalBtn && document.getElementById('mod-modal').classList.contains('show')) {
                    modalBtn.disabled = false;
                    modalBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
                }
            }, 600);
        }
    },

    async cleanupData(modId, tempFilePath, targetModFolder) {
        try {
            if (tempFilePath) await FS.api.remove(tempFilePath);
        } catch (error) {}
        
        try {
            if (targetModFolder) await FS.api.remove(targetModFolder);
        } catch (error) {}
        
        try {
            await FS.removeInstalledMod(modId);
        } catch (error) {}
    },

    async install(modId, modName, downloadUrl) {
        if (!FS.isInitialized) await FS.init();
        
        const modsBasePath = FS.modsPath;
        const sanitizedModName = modName.replace(/[<>:"/\\|?*]+/g, '').trim();
        const targetModFolder = `${modsBasePath}/${sanitizedModName}`;
        const tempFilePath = `${modsBasePath}/temp_${modId}.zip`;
        
        this.activeTasks.set(modId, { 
            cancelled: false, 
            pid: null, 
            tempFilePath, 
            targetModFolder 
        });
        
        toastDownloadMod.show(modId, modName, () => this.cancel(modId));
        
        try {
            await FS.api.ensureDir(modsBasePath);
            await FS.api.ensureDir(targetModFolder);
            
            const os = window.NL_OS;
            
            if (this.activeTasks.get(modId)?.cancelled) throw new Error('Cancelled');

            toastDownloadMod.update(modId, 2, 'Connecting...');
            await this.downloadWithProgress(modId, downloadUrl, tempFilePath, (status, progress) => {
                toastDownloadMod.update(modId, progress, status);
            });
            
            if (this.activeTasks.get(modId)?.cancelled) throw new Error('Cancelled');

            toastDownloadMod.update(modId, 98, 'Extracting...');
            await this.extractArchive(modId, tempFilePath, targetModFolder, os, (file) => {
                toastDownloadMod.update(modId, 98, `Extracting - ${file}`);
            });
            
            if (this.activeTasks.get(modId)?.cancelled) throw new Error('Cancelled');
            
            toastDownloadMod.update(modId, 99, 'Flattening Folder...');
            await FS.flattenModFolder(targetModFolder);

            if (this.activeTasks.get(modId)?.cancelled) throw new Error('Cancelled');

            toastDownloadMod.update(modId, 99, 'Deleting temp Zip...');
            await FS.api.remove(tempFilePath);
            
            await FS.saveInstalledMod(modId, modName);
            
            if (this.activeTasks.get(modId)?.cancelled) throw new Error('Cancelled');

            toastDownloadMod.success(modId);
            
            const modalBtn = document.getElementById('modal-download-btn');
            if (modalBtn && document.getElementById('mod-modal').classList.contains('show')) {
                modalBtn.disabled = true;
                modalBtn.innerHTML = '<i class="fa-solid fa-check"></i> Already Installed';
            }

        } catch (error) {
            if (error.message !== 'Cancelled') {
                await this.cleanupData(modId, tempFilePath, targetModFolder);
                toastDownloadMod.error(modId, error.message || 'Installation failed');
                this.activeTasks.delete(modId);
            }
        }
    },
    
    async downloadWithProgress(modId, url, outPath, onProgress) {
        return new Promise(async (resolve, reject) => {
            try {
                let maxPercent = 0;
                const process = await Neutralino.os.spawnProcess(`curl -# -L "${url}" -o "${outPath}"`);
                
                const task = this.activeTasks.get(modId);
                if (task) task.pid = process.id;

                const handler = (event) => {
                    if (this.activeTasks.get(modId)?.cancelled) {
                        Neutralino.events.off('spawnedProcess', handler);
                        return reject(new Error('Cancelled'));
                    }

                    if (event.detail.id === process.id) {
                        const action = event.detail.action;
                        if (action === 'stdErr' || action === 'stdOut') {
                            const output = event.detail.data;
                            const matches = output.match(/(\d+\.?\d*)%/g);
                            if (matches && matches.length > 0) {
                                const lastMatch = matches[matches.length - 1];
                                const percent = parseFloat(lastMatch.replace('%', ''));
                                if (!isNaN(percent) && percent >= maxPercent) {
                                    maxPercent = percent;
                                    const globalProgress = 2 + (percent * 0.96);
                                    onProgress('Downloading...', globalProgress);
                                }
                            }
                        } else if (action === 'exit') {
                            Neutralino.events.off('spawnedProcess', handler);
                            if (event.detail.data === 0) resolve();
                            else reject(new Error(`Download failed`));
                        }
                    }
                };
                await Neutralino.events.on('spawnedProcess', handler);
            } catch (error) {
                reject(error);
            }
        });
    },

    async extractArchive(modId, zipPath, destPath, os, onFile) {
        return new Promise(async (resolve, reject) => {
            let cmd = "";
            if (os === 'Windows') {
                cmd = `tar -xvf "${zipPath}" -C "${destPath}"`;
            } else {
                cmd = `unzip -o "${zipPath}" -d "${destPath}"`;
            }
            try {
                const process = await Neutralino.os.spawnProcess(cmd);
                
                const task = this.activeTasks.get(modId);
                if (task) task.pid = process.id;

                const handler = (event) => {
                    if (this.activeTasks.get(modId)?.cancelled) {
                        Neutralino.events.off('spawnedProcess', handler);
                        return reject(new Error('Cancelled'));
                    }

                    if (event.detail.id === process.id) {
                        if (event.detail.action === 'stdOut' || event.detail.action === 'stdErr') {
                            const output = event.detail.data.trim();
                            if (output && onFile) {
                                const lines = output.split('\n');
                                let fileName = lines[lines.length - 1].trim()
                                    .replace(/^x\s+/, '')
                                    .replace(/^inflating:\s+/, '')
                                    .replace(/^extracting:\s+/, '')
                                    .replace(/^creating:\s+/, '');
                                const pathParts = fileName.split(/[/\\]/);
                                if (pathParts.length > 2) fileName = `.../${pathParts.slice(-2).join('/')}`;
                                onFile(fileName);
                            }
                        } else if (event.detail.action === 'exit') {
                            Neutralino.events.off('spawnedProcess', handler);
                            const code = event.detail.data;
                            if (code === 0 || (os === 'Windows' && code === 1)) {
                                resolve();
                            } else {
                                reject(new Error(`Extraction failed`));
                            }
                        }
                    }
                };
                await Neutralino.events.on('spawnedProcess', handler);
            } catch (err) {
                reject(err);
            }
        });
    }
};