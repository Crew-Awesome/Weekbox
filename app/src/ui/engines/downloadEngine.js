// ui/engines/downloadEngine.js
import { FS } from '../../utils/filesystem.js';

export const downloadEngine = {
    /**
     * Descarga y extrae un engine mostrando el progreso real.
     */
    async install(engineId, version, downloadUrl, onProgress) {
        if (!FS.isInitialized) await FS.init();
        
        const enginesBasePath = FS.enginesPath;
        // Nueva estructura solicitada: WeekBox/engines/{engine}/{version}/
        const engineDir = `${enginesBasePath}/${engineId}/${version}`;
        const tempFilePath = `${enginesBasePath}/temp_${engineId}_${version}.zip`;

        // Validamos que onProgress sea una función antes de llamarla para evitar TypeError
        const updateProgress = (status, progress) => {
            if (typeof onProgress === 'function') {
                onProgress({ status, progress });
            }
        };

        try {
            updateProgress('Preparando entorno...', 0);
            await FS.api.ensureDir(enginesBasePath);
            await FS.api.ensureDir(`${enginesBasePath}/${engineId}`);
            await FS.api.ensureDir(engineDir);

            const os = window.NL_OS;
            
            // 1. Descarga con progreso real
            updateProgress('Conectando...', 2);
            await this.downloadWithProgress(downloadUrl, tempFilePath, updateProgress);

            // 2. Extracción
            updateProgress('Extrayendo archivos...', 85);
            let extractCmd = "";
            if (os === 'Windows') {
                extractCmd = `powershell -Command "Expand-Archive -Path '${tempFilePath}' -DestinationPath '${engineDir}' -Force"`;
            } else {
                extractCmd = `unzip -o "${tempFilePath}" -d "${engineDir}"`;
            }
            await Neutralino.os.execCommand(extractCmd, { background: false });

            // 3. Limpieza
            updateProgress('Limpiando temporales...', 95);
            await FS.api.remove(tempFilePath);

            updateProgress('Completado', 100);
            return true;

        } catch (error) {
            console.error(`Error al instalar el engine ${engineId}:`, error);
            await FS.api.remove(tempFilePath);
            return false;
        }
    },

    /**
     * Usa spawnProcess para ejecutar curl y leer su output en tiempo real
     */
    async downloadWithProgress(url, outPath, updateProgress) {
        return new Promise(async (resolve, reject) => {
            try {
                let process;
                // Usamos curl con -# (muestra barra de progreso) y -L (sigue redirecciones)
                // curl viene nativo en Windows 10+, macOS y Linux.
                process = await Neutralino.os.spawnProcess(`curl -# -L "${url}" -o "${outPath}"`);

                const handler = (event) => {
                    if (event.detail.id === process.id) {
                        const action = event.detail.action;
                        
                        if (action === 'stdErr' || action === 'stdOut') {
                            const output = event.detail.data;
                            // Parseamos el porcentaje de la salida de curl (ej. "45.3%")
                            const matches = output.match(/(\d+\.?\d*)%/g);
                            if (matches && matches.length > 0) {
                                const lastMatch = matches[matches.length - 1];
                                const percent = parseFloat(lastMatch.replace('%', ''));
                                if (!isNaN(percent)) {
                                    // Mapeamos el 0-100% de la descarga a un 2-85% global del proceso visual
                                    const globalProgress = 2 + (percent * 0.83); 
                                    updateProgress(`Descargando... ${percent.toFixed(1)}%`, globalProgress);
                                }
                            }
                        } else if (action === 'exit') {
                            Neutralino.events.off('spawnedProcess', handler);
                            if (event.detail.data === 0) {
                                resolve();
                            } else {
                                reject(new Error(`La descarga falló con código de salida ${event.detail.data}`));
                            }
                        }
                    }
                };

                await Neutralino.events.on('spawnedProcess', handler);
            } catch (error) {
                reject(error);
            }
        });
    }
};