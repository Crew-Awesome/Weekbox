// utils/filesystem/downloadMod.js
import { APIneuFileSystem } from "./APIneuFileSystem.js";

export const downloadMod = {
  async install(modId, downloadUrl, targetModFolder, onProgress) {
    const tempFilePath = `${targetModFolder}/temp_mod_${modId}.zip`;

    try {
      onProgress({ status: "Iniciando descarga del mod...", progress: 0 });
      await APIneuFileSystem.ensureDir(targetModFolder);

      const os = window.NL_OS;
      let downloadCmd = "";
      let extractCmd = "";

      if (os === "Windows") {
        downloadCmd = `powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${tempFilePath}'"`;
        extractCmd = `powershell -Command "Expand-Archive -Path '${tempFilePath}' -DestinationPath '${targetModFolder}' -Force"`;
      } else {
        downloadCmd = `curl -L "${downloadUrl}" -o "${tempFilePath}"`;
        extractCmd = `unzip -o "${tempFilePath}" -d "${targetModFolder}"`;
      }

      onProgress({ status: "Descargando mod...", progress: 40 });
      await Neutralino.os.execCommand(downloadCmd, { background: false });

      onProgress({ status: "Extrayendo mod...", progress: 80 });
      await Neutralino.os.execCommand(extractCmd, { background: false });

      onProgress({ status: "Limpieza...", progress: 95 });
      await APIneuFileSystem.remove(tempFilePath);

      onProgress({ status: "Mod instalado", progress: 100 });
      return true;
    } catch (error) {
      console.error(`Error al instalar el mod ${modId}:`, error);
      await APIneuFileSystem.remove(tempFilePath);
      return false;
    }
  },
};
