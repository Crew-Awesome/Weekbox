# TODO

## Prioridad Alta (High Priority)

### - [x] [Feature] [Backend] Manejo de Archivos Grandes y Descargas (Streaming e IPC)
- **Problema:** Actualmente, `fs.readBinaryFile` y `fs.writeBinaryFile` transfieren archivos binarios a traves del canal IPC de Neutralino cargando todo en memoria. Para mods pesados (ej. 200MB+), esto puede saturar el puente IPC y causar *crashes* de memoria en Node o en el frontend.
- **Solucion:** Delegar las descargas e instalaciones completamente al backend de Node. Crear comandos IPC como `http.downloadToFile(url, destPath)` o `fs.extractZip(zipPath, destFolder)` para manejar los flujos de datos (*streams*) de manera local en el sistema, enviando solo eventos de progreso (`progress: 45%`) al frontend.

### - [ ] [Fix] [UI] Error Boundary en React
- **Problema:** Las excepciones no capturadas en el ciclo de vida de React causaran una pantalla blanca, bloqueando totalmente la aplicacion de escritorio sin dar explicaciones al usuario.
- **Solucion:** Envolver el componente raiz (`App.tsx` o `Layout.tsx`) en un componente `ErrorBoundary` de React. Esto permitira capturar los errores, evitar la pantalla blanca, y mostrar una UI amigable (ej. "Algo salio mal, haz clic aqui para recargar la interfaz").

## Prioridad Media (Medium Priority)

### - [x] [Refactor] [Frontend] Gestion del Estado Global Complejo
- **Problema:** Un gestor de mods requiere mantener el seguimiento de multiples estados asincronos y globales (ej. cola de descargas, estado de instalacion de cada mod). Usar Context nativo puede causar re-renderizados innecesarios en toda la app.
- **Solucion:** Implementar una libreria ligera de estado global como **Zustand**. Esto permite un manejo centralizado y performante de las descargas y el estado de la aplicacion fuera del ciclo de vida de React, sin causar dolores de cabeza por *prop-drilling*.

### - [ ] [Fix] [UI] Manejo Silencioso de Errores en la API
- **Problema:** En `getMods.ts`, si la peticion a la API `Mod/Multi` de GameBanana falla, el bloque `catch` silenciosamente devuelve `[]`. El usuario vera que los mods cargan, pero con 0 visualizaciones y 0 descargas, haciendole creer que los mods no tienen actividad.
- **Solucion:** Implementar un sistema de notificaciones/Toasts para alertar al usuario ("Advertencia: Problemas conectando con GameBanana, pueden faltar datos de estadisticas").

## Prioridad Baja (Low Priority)

### - [ ] [Perf] [Core] Limite para la Cache en Memoria (LRU)
- **Problema:** El sistema `popularCache` utiliza un `Map` en memoria que crece infinitamente de acuerdo a las llaves que reciba. Aunque por ahora las llaves (`engineId`) son limitadas, en el futuro puede ser un foco de fuga de memoria (*memory leak*).
- **Solucion:** Aplicar un patron de cache de tamano maximo (LRU - Least Recently Used). Por ejemplo, limitar la cache a los 20 ultimos resultados, borrando los datos mas antiguos automaticamente para asegurar que el uso de RAM permanezca estable.
