// utils/filesystem/APIneuFileSystem.js

export const APIneuFileSystem = {
    /**
     * Comprueba si un archivo o directorio existe.
     */
    async exists(path) {
        try {
            await Neutralino.filesystem.getStats(path);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Asegura que un directorio exista. Si no existe, lo crea.
     */
    async ensureDir(path) {
        const exists = await this.exists(path);
        if (!exists) {
            try {
                await Neutralino.filesystem.createDirectory(path);
            } catch (error) {
                console.warn(`No se pudo crear el directorio (puede que el padre no exista): ${path}`, error);
                // Aquí se podría implementar una creación recursiva si fuera necesario.
            }
        }
    },

    /**
     * Escribe datos en un archivo. Reemplaza el archivo si ya existe.
     */
    async write(path, data, isBinary = false) {
        if (isBinary) {
            await Neutralino.filesystem.writeBinaryFile(path, data);
        } else {
            await Neutralino.filesystem.writeFile(path, data);
        }
    },

    /**
     * Agrega datos al final de un archivo existente.
     */
    async append(path, data, isBinary = false) {
        if (isBinary) {
            await Neutralino.filesystem.appendBinaryFile(path, data);
        } else {
            await Neutralino.filesystem.appendFile(path, data);
        }
    },

    /**
     * Lee el contenido de un archivo.
     */
    async read(path, isBinary = false) {
        if (isBinary) {
            return await Neutralino.filesystem.readBinaryFile(path);
        } else {
            return await Neutralino.filesystem.readFile(path);
        }
    },

    /**
     * Borra un archivo o directorio.
     */
    async remove(path) {
        const exists = await this.exists(path);
        if (exists) {
            await Neutralino.filesystem.remove(path);
        }
    }
};