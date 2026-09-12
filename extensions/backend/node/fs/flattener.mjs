import fs from "fs/promises";
import path from "path";

/**
 * Extensiones que indican que se ha alcanzado la raíz o el fondo del mod.
 */
const MARKER_EXTENSIONS = new Set([".json", ".exe"]);

/**
 * Carpetas especiales o basura que deben ignorarse en el recorrido.
 */
const IGNORED_DIRS = new Set([
  "__macosx",
  ".git",
  ".github",
  ".vscode",
  "node_modules",
]);

/**
 * Archivos del sistema o basura que deben ignorarse.
 */
const IGNORED_FILES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
]);

/**
 * Comprueba si un nombre de archivo corresponde a un marcador de mod (.json o .exe).
 * Descarta archivos ocultos de macOS como '._mod.json'.
 *
 * @param {string} fileName - Nombre del archivo.
 * @returns {boolean}
 */
export function isModMarkerFile(fileName) {
  if (typeof fileName !== "string") return false;
  const lower = fileName.toLowerCase();
  if (lower.startsWith("._")) return false;
  const ext = path.extname(lower);
  return MARKER_EXTENSIONS.has(ext);
}

/**
 * Verifica si un directorio contiene directamente algún archivo con extensión .json o .exe.
 *
 * @param {string} dirPath - Ruta absoluta del directorio.
 * @returns {Promise<boolean>}
 */
export async function hasModMarker(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.some(
      (entry) => entry.isFile() && isModMarkerFile(entry.name)
    );
  } catch {
    return false;
  }
}

/**
 * Obtiene las subcarpetas válidas dentro de un directorio, ignorando basura como __MACOSX.
 *
 * @param {string} dirPath - Ruta del directorio.
 * @returns {Promise<string[]>} Rutas completas de las subcarpetas.
 */
export async function getSubdirectories(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name.toLowerCase()))
      .map((e) => path.join(dirPath, e.name));
  } catch {
    return [];
  }
}

/**
 * Limpia archivos y directorios de basura (.DS_Store, __MACOSX, Thumbs.db) dentro de un directorio.
 *
 * @param {string} dirPath - Ruta del directorio a limpiar.
 */
export async function cleanJunk(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const lower = entry.name.toLowerCase();
      if (IGNORED_DIRS.has(lower) || IGNORED_FILES.has(lower)) {
        await fs
          .rm(path.join(dirPath, entry.name), { recursive: true, force: true })
          .catch(() => {});
      }
    }
  } catch {}
}

/**
 * Mueve un archivo o directorio con reintentos y fallback para sistemas con bloqueos transitorios.
 *
 * @param {string} source - Ruta de origen.
 * @param {string} destination - Ruta de destino.
 */
async function safeMove(source, destination) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fs.rename(source, destination);
      return;
    } catch (err) {
      if (attempt === 2) {
        await fs.cp(source, destination, { recursive: true, force: true });
        await fs.rm(source, { recursive: true, force: true });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Encuentra la raíz real del mod dentro de la estructura de carpetas.
 * Si encuentra un .json o un .exe en un nivel, se considera que llegó hasta el fondo.
 *
 * @param {string} folderPath - Carpeta base inicial.
 * @param {number} [maxDepth=10] - Profundidad máxima de inspección.
 * @returns {Promise<string>} Ruta absoluta de la carpeta raíz del mod identificada.
 */
export async function findModRoot(folderPath, maxDepth = 10) {
  let currentDir = path.resolve(folderPath);
  let depth = 0;

  while (depth < maxDepth) {
    if (await hasModMarker(currentDir)) {
      return currentDir;
    }

    const subdirs = await getSubdirectories(currentDir);
    if (subdirs.length === 0) {
      return currentDir;
    }

    if (subdirs.length === 1) {
      currentDir = subdirs[0];
      depth++;
      continue;
    }

    const matchingSubdirs = [];
    for (const sub of subdirs) {
      if (await hasModMarker(sub)) {
        matchingSubdirs.push(sub);
      }
    }

    if (matchingSubdirs.length === 1) {
      return matchingSubdirs[0];
    }

    return currentDir;
  }

  return currentDir;
}

/**
 * Aplanes las carpetas de un mod descomprimido si se encuentra anidado.
 * Promueve todo el contenido de la raíz encontrada a la carpeta destino,
 * eliminando envoltorios y contenedores innecesarios.
 *
 * @param {string} targetFolder - Ruta absoluta de la carpeta destino del mod.
 * @returns {Promise<{ flattened: boolean, originalRoot: string, targetFolder: string }>}
 */
export async function flattenFolder(targetFolder) {
  const normalizedTarget = path.resolve(targetFolder);

  await cleanJunk(normalizedTarget);

  const modRoot = await findModRoot(normalizedTarget);

  if (path.resolve(modRoot) === normalizedTarget) {
    return {
      flattened: false,
      originalRoot: modRoot,
      targetFolder: normalizedTarget,
    };
  }

  const tempParent = path.dirname(normalizedTarget);
  const tempDirName = `.temp_flatten_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tempDir = path.join(tempParent, tempDirName);

  try {
    await safeMove(modRoot, tempDir);

    await fs.rm(normalizedTarget, { recursive: true, force: true });
    await fs.mkdir(normalizedTarget, { recursive: true });

    const items = await fs.readdir(tempDir);
    for (const item of items) {
      const srcItem = path.join(tempDir, item);
      const destItem = path.join(normalizedTarget, item);
      await safeMove(srcItem, destItem);
    }

    await cleanJunk(normalizedTarget);

    return {
      flattened: true,
      originalRoot: modRoot,
      targetFolder: normalizedTarget,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

export const folderFlattener = {
  flatten: flattenFolder,
  findModRoot,
  hasModMarker,
  isModMarkerFile,
  cleanJunk,
};

export default folderFlattener;
