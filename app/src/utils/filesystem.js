// utils/filesystem.js
import { APIneuFileSystem } from './filesystem/APIneuFileSystem.js';
import { downloadMod } from './filesystem/downloadMod.js';

class FileSystemService extends EventTarget {
    constructor() {
        super();
        this.basePath = '';
        this.enginesPath = '';
        this.modsPath = '';
        this.isInitialized = false;
        
        this.activeDownload = null;
        this.abortController = null;
        this.isPaused = false;

        this.api = APIneuFileSystem;
    }

    async init() {
        if (typeof Neutralino !== 'undefined') {
            // Cambiado a la carpeta Documentos del usuario
            this.basePath = await Neutralino.os.getPath('documents');
            this.enginesPath = `${this.basePath}/WeekBox/engines`;
            this.modsPath = `${this.basePath}/WeekBox/mods`;
            
            await this.api.ensureDir(`${this.basePath}/WeekBox`);
            await this.api.ensureDir(this.enginesPath);
            await this.api.ensureDir(this.modsPath);
        }
        this.isInitialized = true;
    }

    async isEngineInstalled(engineId, version) {
        if (!this.isInitialized) return false;
        // Estructura actualizada: WeekBox/engines/{engine}/{version}/
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
        } catch (error) {
            console.error('Error buscando el ejecutable:', error);
        }
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
                console.error("Fallo al ejecutar el engine", error);
                if (onStateChange) onStateChange('error');
            }
        } else {
            console.error("Ejecutable no encontrado");
            if (onStateChange) onStateChange('not_found');
        }
    }

    async installMod(modId, downloadUrl) {
        const targetFolder = `${this.modsPath}/${modId}`;
        const success = await downloadMod.install(
            modId, 
            downloadUrl, 
            targetFolder, 
            (progressData) => {
                const event = new CustomEvent('download-update', { detail: { state: 'progress', ...progressData } });
                this.dispatchEvent(event);
            }
        );
        return success;
    }
}

export const FS = new FileSystemService();