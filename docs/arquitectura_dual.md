# Arquitectura Dual: Entornos de Desarrollo y Producción

Este proyecto utiliza un patrón de **Adapter (Adaptador)** que permite una **Arquitectura Dual**. Esto significa que el código fuente del frontend puede ejecutarse y probarse tanto en un entorno web tradicional como en la aplicación nativa de escritorio, sin tener que modificar la lógica o recompilar el binario completo cada vez.

## ¿Cómo funciona?

La aplicación está diseñada bajo el principio de que los componentes de la Interfaz de Usuario (UI) no deben saber en qué entorno se están ejecutando.

Todo el contacto con el Sistema Operativo, Sistema de Archivos, Gestión de Ventanas y Peticiones HTTP externas pasa por un **Core** central unificado (`src/core`). 

Dentro del Core, la carpeta `platform/` tiene la magia:

### 1. `web.adapter.ts` (Modo Web/Desarrollo)
Cuando ejecutas el servidor de desarrollo puro con Vite (`npm run dev:frontend`), el sistema detecta que no existe el entorno de Neutralinojs, por lo tanto inyecta el `web.adapter.ts`.
Este adaptador utiliza "Mocks" o alternativas compatibles con la API del navegador (como `fetch` estándar y `localStorage`) para simular el comportamiento de escritorio, permitiendo un desarrollo ultrarrápido y Hot Module Replacement (HMR).

### 2. `desktop.adapter.ts` (Modo Nativo/Producción)
Cuando se ejecuta la aplicación de escritorio (`neu run` o la versión empaquetada), se inyecta la variable global de Neutralino. El código utiliza el `desktop.adapter.ts`, que actúa como puente para acceder a la API de `window.Neutralino` nativa.

Adicionalmente, este adaptador se comunica por IPC con nuestra propia **Extensión de Node.js** (`extensions/backend/host.mjs`).

## La Extensión de Node.js

Para evitar que el canal de IPC estándar de Neutralinojs colapse al enviar binarios muy pesados, implementamos una extensión de Node.js que se arranca en segundo plano junto con la aplicación.

La extensión actúa como un servidor de bajo nivel y se encarga de:
- Descargas mediante streams para archivos grandes.
- Extracción y manejo intensivo de archivos.
- Escucha y manejo de Deeplinks (`weekbox://`).
- Peticiones pesadas que en el navegador podrían sufrir de CORS.

### Ciclo de vida y comunicación
El frontend (en modo escritorio) envía un evento de "heartbeat" periódico (ping). Si la ventana se cierra forzosamente y el frontend deja de hacer pings, la extensión de Node.js aplica una función de autoterminado para evitar quedarse como un proceso zombi en la memoria de la computadora de los usuarios.
