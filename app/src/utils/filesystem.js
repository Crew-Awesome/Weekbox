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
        this.activeEngineProcesses = new Map();
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
        const engineKey = `${engineId}:${version}`;
        if (this.activeEngineProcesses.has(engineKey)) {
            if (onStateChange) onStateChange('already_running');
            return false;
        }

        const targetPath = `${this.enginesPath}/${engineId}/${version}`;
        const exePath = await this.findExecutable(targetPath);
        if (exePath) {
            if (onStateChange) onStateChange('running');
            try {
                const process = await Neutralino.os.spawnProcess(`"${exePath}"`);
                this.activeEngineProcesses.set(engineKey, process);

                const handler = event => {
                    if (event.detail.id !== process.id || event.detail.action !== 'exit') return;
                    Neutralino.events.off('spawnedProcess', handler);
                    this.activeEngineProcesses.delete(engineKey);
                    if (onStateChange) onStateChange('completed');
                };

                await Neutralino.events.on('spawnedProcess', handler);
                if (onStateChange) onStateChange('launched');
                return true;
            } catch (error) {
                if (onStateChange) onStateChange('error');
                return false;
            }
        } else {
            if (onStateChange) onStateChange('not_found');
            return false;
        }
    }

    async closeEngine(engineId, version, onStateChange) {
        const engineKey = `${engineId}:${version}`;
        const process = this.activeEngineProcesses.get(engineKey);
        if (!process) return false;

        if (onStateChange) onStateChange('closing');
        try {
            await Neutralino.os.updateSpawnedProcess(process.id, 'exit');
            return true;
        } catch (error) {
            if (onStateChange) onStateChange('error');
            return false;
        }
    }

    isEngineRunning(engineId, version) {
        return this.activeEngineProcesses.has(`${engineId}:${version}`);
    }

    async getInstalledEngines() {
        if (!this.isInitialized) return [];
        try {
            const engineEntries = await Neutralino.filesystem.readDirectory(this.enginesPath);
            const engines = await Promise.all(engineEntries
                .filter(entry => entry.type === 'DIRECTORY')
                .map(async entry => {
                    const enginePath = `${this.enginesPath}/${entry.entry}`;
                    const versions = await Neutralino.filesystem.readDirectory(enginePath);
                    return versions
                        .filter(version => version.type === 'DIRECTORY')
                        .map(version => ({ id: entry.entry, version: version.entry }));
                }));
            return engines.flat();
        } catch (error) {
            return [];
        }
    }

    async linkModToEngine(mod, engineId, version) {
        const folderName = mod.folderName || mod.name.replace(/[<>:"/\\|?*]+/g, '').trim();
        const sourcePath = `${this.modsPath}/${folderName}`;
        const modsPath = `${this.enginesPath}/${engineId}/${version}/mods`;
        const linkPath = `${modsPath}/${folderName}`;

        if (!await this.api.exists(sourcePath)) {
            throw new Error(`Mod files not found for ${mod.name}`);
        }

        await this.api.ensureDir(modsPath);
        if (await this.api.exists(linkPath)) return { linked: false, path: linkPath };

        const command = window.NL_OS === 'Windows'
            ? `cmd /c mklink /J "${linkPath}" "${sourcePath}"`
            : `ln -s "${sourcePath}" "${linkPath}"`;
        const result = await Neutralino.os.execCommand(command, { background: false });
        if (result.exitCode !== 0) throw new Error(result.stdErr || `Could not inject ${mod.name}`);

        return { linked: true, path: linkPath };
    }

    async injectModIntoEngine(modId, engineId, version) {
        const mod = (await this.getInstalledMods()).find(item => item.id === modId);
        if (!mod) throw new Error('Installed mod metadata was not found');
        return this.linkModToEngine(mod, engineId, version);
    }

    async injectModsIntoEngine(engineId, version) {
        const mods = await this.getInstalledMods();
        const matchingMods = mods.filter(mod => mod.engineId === engineId);
        return Promise.allSettled(matchingMods.map(mod => this.linkModToEngine(mod, engineId, version)));
    }

    async injectModIntoInstalledEngines(modId) {
        const mod = (await this.getInstalledMods()).find(item => item.id === modId);
        if (!mod?.engineId) return [];

        const engines = await this.getInstalledEngines();
        return Promise.allSettled(engines
            .filter(engine => engine.id === mod.engineId)
            .map(engine => this.linkModToEngine(mod, engine.id, engine.version)));
    }

    async getInstalledMods() {
        if (!this.isInitialized) return [];
        const jsonPath = `${this.dataPath}/installedmods.json`;
        if (!await this.api.exists(jsonPath)) return [];

        try {
            const content = await this.api.read(jsonPath);
            const installedMods = JSON.parse(content);
            return Array.isArray(installedMods) ? installedMods : [];
        } catch (error) {
            return [];
        }
    }

    async saveInstalledMod(modId, modName, metadata = {}) {
        if (!this.isInitialized) return;
        const jsonPath = `${this.dataPath}/installedmods.json`;
        const installedMods = await this.getInstalledMods();
        
        const exists = installedMods.find(m => m.id === modId);
        if (!exists) {
            installedMods.push({ name: modName, id: modId, ...metadata });
            await this.api.write(jsonPath, JSON.stringify(installedMods, null, 2));
        }
    }

    async assignModEngine(modId, engineId) {
        if (!this.isInitialized) return false;
        const jsonPath = `${this.dataPath}/installedmods.json`;
        const installedMods = await this.getInstalledMods();
        const mod = installedMods.find(item => item.id === modId);
        if (!mod) return false;

        mod.engineId = engineId || null;
        await this.api.write(jsonPath, JSON.stringify(installedMods, null, 2));
        return true;
    }

    async removeInstalledMod(modId) {
        if (!this.isInitialized) return;
        const jsonPath = `${this.dataPath}/installedmods.json`;
        
        if (await this.api.exists(jsonPath)) {
            try {
                let installedMods = await this.getInstalledMods();
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
                const installedMods = await this.getInstalledMods();
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
