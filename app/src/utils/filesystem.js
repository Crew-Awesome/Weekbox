class FileSystemService extends EventTarget {
    constructor() {
        super();
        this.basePath = '';
        this.enginesPath = '';
        this.isInitialized = false;
        
        this.activeDownload = null;
        this.abortController = null;
        this.isPaused = false;
    }

    async init() {
        if (this.isInitialized) return;
        try {
            const dataPath = await Neutralino.os.getPath('data');
            this.basePath = await Neutralino.filesystem.getJoinedPath(dataPath, 'WeekBox');
            this.enginesPath = await Neutralino.filesystem.getJoinedPath(this.basePath, 'engines');
            await this.ensureDir(this.basePath);
            await this.ensureDir(this.enginesPath);
            this.isInitialized = true;
        } catch (err) {
            console.error("[FS] Init Error:", err);
        }
    }

    async ensureDir(path) {
        try { await Neutralino.filesystem.getStats(path); } 
        catch (e) { await Neutralino.filesystem.createDirectory(path); }
    }

    cleanCmd(str) { 
        return str.replace(/[&;"'`|]/g, ''); 
    }

    emitUpdate(state, data = {}) {
        if (this.activeDownload) {
            this.activeDownload = { ...this.activeDownload, state, ...data };
            this.dispatchEvent(new CustomEvent('dl:update', { detail: this.activeDownload }));
        }
    }

    async isEngineInstalled(engineId, version) {
        await this.init();
        try {
            const versionFolder = await Neutralino.filesystem.getJoinedPath(this.enginesPath, `${engineId}/${version}`);
            return (await this.findExecutable(versionFolder)) !== null;
        } catch (err) { return false; }
    }

    async findExecutable(dir) {
        try {
            const os = window.NL_OS;
            let entries = await Neutralino.filesystem.readDirectory(dir);
            let possibleDirs = [];

            const isTarget = (filename) => {
                const lower = filename.toLowerCase();
                if (lower.includes('crash') || lower.includes('uninstall') || lower.includes('updater')) return false;
                if (os === 'Windows') return lower.endsWith('.exe');
                if (os === 'Darwin') return lower.endsWith('.app');
                if (os === 'Linux') return lower.endsWith('.x86_64') || lower.endsWith('.AppImage') || (!lower.includes('.') && filename !== '..' && filename !== '.');
                return false;
            };

            for (let entry of entries) {
                if (entry.entry === '.' || entry.entry === '..') continue;
                if (entry.type === 'FILE' || (os === 'Darwin' && entry.entry.endsWith('.app'))) {
                    if (isTarget(entry.entry)) return await Neutralino.filesystem.getJoinedPath(dir, entry.entry);
                } else if (entry.type === 'DIRECTORY') {
                    possibleDirs.push(await Neutralino.filesystem.getJoinedPath(dir, entry.entry));
                }
            }
            for (let subDir of possibleDirs) {
                let subEntries = await Neutralino.filesystem.readDirectory(subDir);
                for (let sub of subEntries) {
                    if (sub.entry === '.' || sub.entry === '..') continue;
                    if (sub.type === 'FILE' || (os === 'Darwin' && sub.entry.endsWith('.app'))) {
                        if (isTarget(sub.entry)) return await Neutralino.filesystem.getJoinedPath(subDir, sub.entry);
                    }
                }
            }
            return null;
        } catch (e) { return null; }
    }

    async runEngine(engineId, version, onStateChange) {
        await this.init();
        const versionFolder = await Neutralino.filesystem.getJoinedPath(this.enginesPath, `${engineId}/${version}`);
        const exePath = await this.findExecutable(versionFolder);
        
        if (!exePath) throw new Error("Ejecutable no encontrado.");

        const os = window.NL_OS;
        const normalizedExe = exePath.replace(/\\/g, '/');
        const dirPath = normalizedExe.substring(0, normalizedExe.lastIndexOf('/'));
        
        let command = '';
        if (os === 'Windows') {
            const winDir = this.cleanCmd(dirPath.replace(/\//g, '\\'));
            const winExe = this.cleanCmd(normalizedExe.replace(/\//g, '\\'));
            command = `cd /d "${winDir}" && "${winExe}"`;
        } else if (os === 'Linux') {
            command = `cd "${this.cleanCmd(dirPath)}" && chmod +x "${this.cleanCmd(normalizedExe)}" && "${this.cleanCmd(normalizedExe)}"`;
        } else if (os === 'Darwin') {
            command = `open -W "${this.cleanCmd(normalizedExe)}"`;
        }

        if (onStateChange) onStateChange('running');
        try { await Neutralino.os.execCommand(command); } 
        catch (err) { console.error("Error al ejecutar:", err); }
        if (onStateChange) onStateChange('closed');
    }

    cancelDownload() {
        if (this.abortController) this.abortController.abort();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.activeDownload) {
            this.emitUpdate(this.isPaused ? 'paused' : 'downloading', { 
                text: this.isPaused ? `Paused - ${this.activeDownload.engineName}` : `${this.activeDownload.percent || 0}% - ${this.activeDownload.engineName}` 
            });
        }
        return this.isPaused;
    }

    async installEngine(engineId, engineName, version, downloadUrl) {
        if (this.activeDownload) return false;

        await this.init();
        let filePath = '';
        this.abortController = new AbortController();
        this.isPaused = false;

        this.activeDownload = { engineId, engineName, version, state: 'connecting', percent: 0, text: `Fetching data... - ${engineName}` };
        this.emitUpdate('connecting');

        try {
            const engineFolder = await Neutralino.filesystem.getJoinedPath(this.enginesPath, engineId);
            await this.ensureDir(engineFolder);
            const versionFolder = await Neutralino.filesystem.getJoinedPath(engineFolder, version);
            await this.ensureDir(versionFolder);

            let fileName = downloadUrl.split('/').pop().split('?')[0] || 'download.zip';
            filePath = await Neutralino.filesystem.getJoinedPath(versionFolder, fileName);
            
            try { await Neutralino.filesystem.remove(filePath); } catch(e) {}
            await Neutralino.filesystem.writeBinaryFile(filePath, new ArrayBuffer(0)); 

            const response = await fetch(downloadUrl, { signal: this.abortController.signal });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const totalBytes = parseInt(response.headers.get('content-length') || 0, 10);
            let loadedBytes = 0;
            const reader = response.body.getReader();
            
            let writeBuffer = [];
            let writeBufferSize = 0;
            const MAX_BUFFER_SIZE = 1024 * 1024;

            const flushBuffer = async () => {
                if (writeBufferSize === 0) return;
                const tempArray = new Uint8Array(writeBufferSize);
                let offset = 0;
                for (const chunk of writeBuffer) {
                    tempArray.set(chunk, offset);
                    offset += chunk.length;
                }
                await Neutralino.filesystem.appendBinaryFile(filePath, tempArray.buffer);
                writeBuffer = []; writeBufferSize = 0;
            };

            while (true) {
                while (this.isPaused) {
                    if (this.abortController.signal.aborted) throw new Error("Cancelado");
                    await new Promise(r => setTimeout(r, 200));
                }

                const { done, value } = await reader.read();
                if (done) {
                    await flushBuffer();
                    break;
                }
                
                writeBuffer.push(value);
                writeBufferSize += value.length;
                loadedBytes += value.length;
                
                if (writeBufferSize >= MAX_BUFFER_SIZE) {
                    await flushBuffer();
                    await new Promise(r => setTimeout(r, 1)); 
                }
                
                if (totalBytes) {
                    const percent = ((loadedBytes / totalBytes) * 100).toFixed(1);
                    this.emitUpdate('downloading', { percent, text: `${percent}% - ${engineName}` });
                }
            }

            if (fileName.toLowerCase().endsWith('.zip')) {
                this.emitUpdate('extracting', { percent: 100, text: `Extracting... - ${engineName}` });
                
                const os = window.NL_OS;
                const cleanZip = this.cleanCmd(filePath);
                const cleanDest = this.cleanCmd(versionFolder);
                let cmd = os === 'Windows' 
                    ? `powershell -Command "Expand-Archive -Path '${cleanZip}' -DestinationPath '${cleanDest}' -Force"`
                    : `unzip -o "${cleanZip}" -d "${cleanDest}"`;
                    
                await Neutralino.os.execCommand(cmd);
                try { await Neutralino.filesystem.remove(filePath); } catch(e) {}
            }
            
            this.emitUpdate('finished');
            this.activeDownload = null;
            return true;

        } catch (err) {
            const isCancel = err.name === 'AbortError' || err.message === 'Cancelado';
            if (filePath) { try { await Neutralino.filesystem.remove(filePath); } catch(e) {} }
            
            this.emitUpdate(isCancel ? 'cancelled' : 'error');
            this.activeDownload = null;
            return false;
        }
    }
}

export const FS = new FileSystemService();
window.WeekBoxFS = FS;
