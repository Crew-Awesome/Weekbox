/**
 * @description Constantes principales para el Backend de Weekbox.
 */

/**
 * @description Obtiene la ruta del directorio AppData de Weekbox.
 * Funciona de manera multiplataforma (Windows: AppData/Roaming, Linux: ~/.config, Mac: ~/Library/Application Support).
 *
 * @returns {Promise<string>} La ruta absoluta a la carpeta de datos de Weekbox.
 */
export const getWeekboxAppDataPath = async (): Promise<string> => {
  if (typeof window.Neutralino !== "undefined") {
    const dataPath = await window.Neutralino.os.getPath("data");
    const weekboxPath = `${dataPath}/Weekbox`.replace(/\\/g, "/");

    console.log(
      "%c FS %c " + weekboxPath,
      "background: #8b5cf6; color: #ffffff; font-weight: bold; border-radius: 4px; padding: 2px 4px;",
      "color: inherit;",
    );

    return weekboxPath;
  }

  // Fallback para entornos web donde Neutralino no est� disponible
  return "Weekbox";
};
