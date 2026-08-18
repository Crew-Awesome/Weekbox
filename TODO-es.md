# TODO

## 🔴 Prioridad Alta (High Priority)

### - [x] 🚀 [Feature] [Backend] Manejo de Archivos Grandes y Descargas (Streaming e IPC)
- **Problema:** Actualmente, `fs.readBinaryFile` y `fs.writeBinaryFile` transfieren archivos binarios a través del canal IPC de Neutralino cargando todo en memoria. Para mods pesados (ej. 200MB+), esto puede saturar el puente IPC y causar *crashes* de memoria en Node o en el frontend.
- **Solución:** Delegar las descargas e instalaciones completamente al backend de Node. Crear comandos IPC como `http.downloadToFile(url, destPath)` o `fs.extractZip(zipPath, destFolder)` para manejar los flujos de datos (*streams*) de manera local en el sistema, enviando solo eventos de progreso (`progress: 45%`) al frontend.

### - [ ] 🐛 [Fix] [UI] Error Boundary en React
- **Problema:** Las excepciones no capturadas en el ciclo de vida de React causarán una pantalla blanca, bloqueando totalmente la aplicación de escritorio sin dar explicaciones al usuario.
- **Solución:** Envolver el componente raíz (`App.tsx` o `Layout.tsx`) en un componente `ErrorBoundary` de React. Esto permitirá capturar los errores, evitar la pantalla blanca, y mostrar una UI amigable (ej. "Algo salió mal, haz clic aquí para recargar la interfaz").

## 🟡 Prioridad Media (Medium Priority)

### - [ ] ♻️ [Refactor] [Frontend] Gestión del Estado Global Complejo
- **Problema:** Un gestor de mods requiere mantener el seguimiento de múltiples estados asíncronos y globales (ej. cola de descargas, estado de instalación de cada mod). Usar Context nativo puede causar re-renderizados innecesarios en toda la app.
- **Solución:** Implementar una librería ligera de estado global como **Zustand**. Esto permite un manejo centralizado y performante de las descargas y el estado de la aplicación fuera del ciclo de vida de React, sin causar dolores de cabeza por *prop-drilling*.

### - [ ] 🐛 [Fix] [UI] Manejo Silencioso de Errores en la API
- **Problema:** En `getMods.ts`, si la petición a la API `Mod/Multi` de GameBanana falla, el bloque `catch` silenciosamente devuelve `[]`. El usuario verá que los mods cargan, pero con 0 visualizaciones y 0 descargas, haciéndole creer que los mods no tienen actividad.
- **Solución:** Implementar un sistema de notificaciones/Toasts para alertar al usuario ("Advertencia: Problemas conectando con GameBanana, pueden faltar datos de estadísticas").

## 🟢 Prioridad Baja (Low Priority)

### - [ ] ⚡ [Perf] [Core] Límite para la Caché en Memoria (LRU)
- **Problema:** El sistema `popularCache` utiliza un `Map` en memoria que crece infinitamente de acuerdo a las llaves que reciba. Aunque por ahora las llaves (`engineId`) son limitadas, en el futuro puede ser un foco de fuga de memoria (*memory leak*).
- **Solución:** Aplicar un patrón de caché de tamaño máximo (LRU - Least Recently Used). Por ejemplo, limitar la caché a los 20 últimos resultados, borrando los datos más antiguos automáticamente para asegurar que el uso de RAM permanezca estable.
