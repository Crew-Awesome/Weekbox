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
        this.isInitialized = true;
    }

    async ensureDir(path) {
        // Lógica eliminada
    }

    cleanCmd(str) {
        return str;
    }

    emitUpdate(state, data = {}) {
        // Lógica eliminada
    }

    async isEngineInstalled(engineId, version) {
        // Siempre retorna falso al no haber sistema de archivos
        return false;
    }

    async findExecutable(dir) {
        return null;
    }

    async runEngine(engineId, version, onStateChange) {
        // Lógica de ejecución eliminada
    }

    cancelDownload() {
        if (this.abortController) this.abortController.abort();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    quotePowerShell(value) {
        return value;
    }

    async downloadWithNativeTool(downloadUrl, filePath, os) {
        // Lógica eliminada
    }

    async installEngine(engineId, engineName, version, downloadUrl) {
        // Lógica de descarga e instalación eliminada
        return false;
    }
}

export const FS = new FileSystemService();