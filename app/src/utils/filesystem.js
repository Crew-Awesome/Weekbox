import { APIneuFileSystem } from './filesystem/APIneuFileSystem.js';

class FileSystemService extends EventTarget {
    constructor() {
        super();
        this.basePath = '';
        this.enginesPath = '';
        this.modsPath = '';
        this.dataPath = '';
        this.isInitialized = false;
        this.activeDownload = null;
        this.abortController = null;
        this.isPaused = false;
        this.api = APIneuFileSystem;
    }
    
    async init() {
        if (typeof Neutralino !== 'undefined') {
            this.basePath = await Neutralino.os.getPath('documents');
            this.enginesPath = `${this.basePath}/WeekBox/engines`;
            this.modsPath = `${this.basePath}/WeekBox/mods`;
            this.dataPath = `${this.basePath}/WeekBox/data`;
            
            await this.api.ensureDir(`${this.basePath}/WeekBox`);
            await this.api.ensureDir(this.enginesPath);
            await this.api.ensureDir(this.modsPath);
            await this.api.ensureDir(this.dataPath);
        }
        this.isInitialized = true;
    }
    
    async isEngineInstalled(engineId, version) {
        if (!this.isInitialized) return false;
        const targetPath = `${this.enginesPath}/${engineId}/${version}`;
        return await this.api.exists(targetPath);
    }
    
    async findExecutable(dir) {
        try {
            const files = await Neutralino.filesystem.readDirectory(dir);
            const isWindows = window.NL_OS === 'Windows';
            for (const file of files) {
                if (file.type === 'FILE') {
                    if (isWindows && file.entry.endsWith('.exe')) {
                        return `${dir}/${file.entry}`;
                    } else if (!isWindows && !file.entry.includes('.')) {
                        return `${dir}/${file.entry}`;
                    }
                }
            }
        } catch (error) {}
        return null;
    }
    
    async runEngine(engineId, version, onStateChange) {
        const targetPath = `${this.enginesPath}/${engineId}/${version}`;
        const exePath = await this.findExecutable(targetPath);
        if (exePath) {
            if (onStateChange) onStateChange('running');
            try {
                await Neutralino.os.execCommand(`"${exePath}"`, { background: true });
                if (onStateChange) onStateChange('completed');
            } catch (error) {
                if (onStateChange) onStateChange('error');
            }
        } else {
            if (onStateChange) onStateChange('not_found');
        }
    }

    async saveInstalledMod(modId, modName) {
        if (!this.isInitialized) return;
        const jsonPath = `${this.dataPath}/installedmods.json`;
        let installedMods = [];
        
        if (await this.api.exists(jsonPath)) {
            try {
                const content = await this.api.read(jsonPath);
                installedMods = JSON.parse(content);
            } catch (error) {}
        }
        
        const exists = installedMods.find(m => m.id === modId);
        if (!exists) {
            installedMods.push({ name: modName, id: modId });
            await this.api.write(jsonPath, JSON.stringify(installedMods, null, 2));
        }
    }

    async removeInstalledMod(modId) {
        if (!this.isInitialized) return;
        const jsonPath = `${this.dataPath}/installedmods.json`;
        
        if (await this.api.exists(jsonPath)) {
            try {
                const content = await this.api.read(jsonPath);
                let installedMods = JSON.parse(content);
                const initialLength = installedMods.length;
                installedMods = installedMods.filter(m => m.id !== modId);
                
                if (installedMods.length !== initialLength) {
                    await this.api.write(jsonPath, JSON.stringify(installedMods, null, 2));
                }
            } catch (error) {}
        }
    }

    async isModInstalled(modId) {
        if (!this.isInitialized) return false;
        const jsonPath = `${this.dataPath}/installedmods.json`;
        
        if (await this.api.exists(jsonPath)) {
            try {
                const content = await this.api.read(jsonPath);
                const installedMods = JSON.parse(content);
                return installedMods.some(m => m.id === modId);
            } catch (error) {}
        }
        return false;
    }

    async flattenModFolder(targetDir) {
        if (!this.isInitialized) return;
        try {
            const files = await Neutralino.filesystem.readDirectory(targetDir);
            const realFiles = files.filter(f => f.entry !== '.' && f.entry !== '..');
            
            if (realFiles.length === 1 && realFiles[0].type === 'DIRECTORY') {
                const subDirName = realFiles[0].entry;
                const subDirPath = `${targetDir}/${subDirName}`;
                
                const subFiles = await Neutralino.filesystem.readDirectory(subDirPath);
                const realSubFiles = subFiles.filter(f => f.entry !== '.' && f.entry !== '..');
                
                for (const sf of realSubFiles) {
                    const from = `${subDirPath}/${sf.entry}`;
                    const to = `${targetDir}/${sf.entry}`;
                    await Neutralino.filesystem.move(from, to);
                }
                
                await Neutralino.filesystem.remove(subDirPath);
            }
        } catch (err) {}
    }
}

export const FS = new FileSystemService();