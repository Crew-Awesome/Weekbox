# Scripts y Entornos de Desarrollo

El archivo `package.json` en la raíz del proyecto orquesta el flujo de desarrollo, permitiendo correr ambos entornos (la UI y la capa de escritorio) al mismo tiempo o por separado.

## Scripts Principales

### `npm run install:all`
Este comando agiliza la configuración inicial. Instala las dependencias en la raíz, pero también se mete a las subcarpetas `frontend` y `extensions/backend` para ejecutar `npm install` en cada una. Solo se necesita ejecutar la primera vez o si cambias de rama.

### `npm run dev:frontend`
Inicia **únicamente** el servidor de Vite en el puerto por defecto (usualmente `5173`).
Se recomienda para maquetar interfaces y diseñar vistas rápidamente desde el navegador Chrome/Firefox. Aquí actuará el `web.adapter.ts`. No hay funciones nativas reales.

### `npm run start:neu`
Ejecuta la ventana de Neutralinojs. Se apoya de la configuración en `neutralino.config.json` para saber si carga los archivos locales generados (build) o si carga un localhost.

### `npm run dev` (Recomendado para pruebas híbridas)
Es el script que hace el "build" de la interfaz gráfica e inmediatamente después utiliza la librería `concurrently` para lanzar dos comandos al mismo tiempo:
1. Escucha cambios en el frontend y lo vuelve a compilar (`watch:frontend`).
2. Levanta la aplicación de Neutralinojs (`start:neu`).

*Nota:* Este flujo no usa Vite HMR (recarga en caliente).

### `npm run dev:pc`
Este es el flujo principal para **desarrollar la app nativa con Hot Reload**.
- `predev:pc`: Antes de lanzar la app, un script de Node inyecta la URL del servidor de Vite (`http://localhost:5173`) dentro de `neutralino.config.json`.
- Luego, arranca el servidor Vite y Neutralino en paralelo. La aplicación de escritorio cargará directamente el servidor web local, obteniendo toda la velocidad de Vite (cambios instantáneos) pero con acceso real a las APIs nativas de escritorio.

### `npm run build:pc`
Comando final de compilación.
- `prebuild:pc`: Reestablece la configuración de `neutralino.config.json` para que deje de apuntar a `localhost` y apunte a la ruta de los archivos relativos estáticos (`/`).
- Luego, genera los archivos optimizados de React (`build:frontend`) y lanza la herramienta interna `neu build` de Neutralinojs para empacar el ejecutable (.exe, .AppImage).

### `npm run format`
Ejecuta un script interno (`scripts/formatter.js`) que formatea el código en masa utilizando Prettier y las configuraciones del proyecto. Ideal correrlo antes de cada commit.
