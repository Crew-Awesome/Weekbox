# Cómo Compilar Weekbox desde Cero

Esta guía te explicará paso a paso cómo configurar tu entorno de desarrollo, instalar todas las dependencias necesarias y compilar el ejecutable final de Weekbox para tu sistema operativo.

## 1. Requisitos Previos

Antes de comenzar, necesitas tener instaladas las siguientes herramientas en tu computadora:

1. **Node.js** (Versión 18 o superior).
   - [Descargar Node.js](https://nodejs.org/)
   - Esto incluye automáticamente `npm`, el gestor de paquetes que usaremos para descargar el resto de librerías.
2. **Git** (Opcional, pero recomendado para descargar el proyecto fácilmente).
   - [Descargar Git](https://git-scm.com/)

---

## 2. Instalar el CLI de NeutralinoJS

Weekbox está construido sobre el framework **NeutralinoJS**, el cual funciona como puente entre nuestra interfaz web y tu sistema operativo (Windows/Mac/Linux).

Abre tu terminal favorita (PowerShell, CMD o bash) y ejecuta el siguiente comando para instalar la herramienta de comandos de Neutralino globalmente en tu equipo:

```bash
npm install -g @neutralinojs/neu
```

---

## 3. Descargar el Código Fuente

Abre tu terminal, dirígete a la carpeta donde deseas guardar el proyecto y clónalo usando Git. Alternativamente, puedes simplemente descargar el código (.zip) desde el repositorio y extraerlo.

```bash
git clone <URL_DEL_REPOSITORIO>
cd weekbox
```
*(Sustituye `<URL_DEL_REPOSITORIO>` por el enlace real del repositorio de Weekbox).*

---

## 4. Instalar las Dependencias del Proyecto

Weekbox está dividido en tres áreas técnicas. Tienes que descargar e instalar las librerías necesarias para cada una de ellas.

### A. Instalación Automática
Puedes instalar las dependencias maestras, de la interfaz gráfica y del backend de un solo golpe usando el script preconfigurado desde la carpeta principal del proyecto:

```bash
npm run install:all
```
*(Esto instalará los paquetes de la raíz y luego entrará automáticamente a las carpetas `frontend/` y `extensions/backend/` para instalar el resto de librerías necesarias).*

---

## 5. Modo Desarrollo (Pruebas en Vivo)

Si eres desarrollador y deseas trabajar en el código de Weekbox viendo tus cambios en tiempo real (sin tener que generar un `.exe` pesado cada vez), puedes usar el entorno de desarrollo en vivo.

Desde la carpeta principal (`weekbox`), ejecuta:

```bash
npm run dev:pc
```

**¿Qué ocurre?**
1. Se compilará temporalmente el frontend.
2. Neutralino abrirá Weekbox en modo ventana, pero conectado internamente a tu código en vivo.
3. Si cambias algún archivo visual (como un color o texto en React), la ventana se actualizará mágicamente al instante (HMR - Hot Module Replacement).

---

## 6. Compilar el Ejecutable Final (Producción)

Cuando hayas terminado tus pruebas y desees generar el `.exe` real, empaquetado y listo para ser distribuido a otros jugadores o amigos, sigue estos pasos finales:

Asegúrate de estar en la carpeta raíz del proyecto y ejecuta el comando mágico de empaquetado:

```bash
npm run build:pc
```

**¿Qué ocurre por debajo de la mesa?**
1. El script `prebuild:pc` preparará el archivo `neutralino.config.json` para asegurase de que use archivos locales (`/app/`) en lugar de apuntar a servidores de pruebas locales.
2. Vite optimizará, comprimirá y minificará todo el código de React en una versión estática (`npm run build:frontend`).
3. El comando nativo `neu build` tomará la interfaz compilada y tu código backend, y empaquetará absolutamente todo dentro de un fichero inyectado (`resources.neu`).

### ¿Dónde encuentro mi aplicación compilada?
Una vez que el comando haya finalizado (puede tardar un minuto), notarás que se ha creado una nueva carpeta llamada `dist/` en la raíz del proyecto.

Dentro de `dist/weekbox/` encontrarás los binarios compilados nativos:
- `weekbox-win_x64.exe` (Tu aplicación para Windows)
- `weekbox-linux_x64` (Para distribuciones Linux)
- `weekbox-mac_x64` (Para sistemas macOS)
- Y el archivo fundamental `resources.neu`.

Para jugar, simplemente arrastra esos archivos a la carpeta donde quieres instalarlo y haz doble clic en `weekbox-win_x64.exe`.

¡Felicidades! Has compilado exitosamente Weekbox desde el código fuente.
