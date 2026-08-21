/**
 * In-memory HTTP Cache Manager
 * Prevents redundant network requests by storing JSON responses temporarily.
 */

const cache = new Map();
const DEFAULT_TTL_MS = 180000; // 3 minutos

export const httpCache = {
  /**
   * Obtiene la respuesta de la caché si sigue siendo válida.
   * @param {string} key - Clave única (usualmente la URL)
   * @returns {any|null}
   */
  get(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    // Si ha pasado el TTL, invalidamos la caché
    if (Date.now() - item.timestamp > DEFAULT_TTL_MS) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  },
  
  /**
   * Guarda una respuesta en la caché.
   * @param {string} key - Clave única (usualmente la URL)
   * @param {any} data - Los datos a guardar
   */
  set(key, data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  /**
   * Limpia toda la caché (útil si se presiona algún botón de recargar).
   */
  clear() {
    cache.clear();
  }
};
