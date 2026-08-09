flowchart TD
    subgraph RootOrchestrator["Raíz del Proyecto (package.json)"]
        Scripts["Scripts NPM (dev, dev:pc, dev:mobile, build:pc)"]
    end

    subgraph Frontend["Módulo Frontend (React 19 + TypeScript + Vite)"]
        UI["Interfaz de Usuario & Vistas"]
        Router["HashRouter (Navegación Desacoplada)"]
        PlatformBridge["Capa Unificada de Plataforma (Platform Bridge / Adapter)"]
    end

    subgraph DesktopRuntime["Runtime de Escritorio (Neutralinojs)"]
        NeuWindow["Ventana Nativa (WebView ligero)"]
        NeuCore["Neutralino Core API (Eventos / Sistema)"]
        AppStatic["Archivos Estáticos (/app)"]
    end

    subgraph BackendNode["Backend de Node.js (extensions/node)"]
        ExtMain["Punto de Entrada (main.js)"]
        ExtBridge["Puente IPC (neutralino-extension.js)"]
        ExpressServer["Servidor Local / API (Express / WebSockets)"]
        DiscordService["Discord Rich Presence"]
        FileSystemService["Gestor de Archivos (7z, Mods, GameBanana API)"]
        OSProcesses["Procesos del Sistema Operativo"]
    end

    subgraph MobileRuntime["Módulo Móvil (Expo / React Native)"]
        ExpoHost["App Host Móvil (mobile-app)"]
        RNWebView["React Native WebView"]
        NativeMobileAPIs["APIs Nativas Móvil (Haptics, Storage, Notificaciones)"]
    end

    %% Relaciones de compilación y orquestación
    Scripts -->|"Compila y vigila código"| Frontend
    Frontend -->|"Genera bundle estático"| AppStatic
    AppStatic -->|"Cargado localmente por"| NeuWindow

    %% Relaciones Desktop
    UI -->|"Petición agnóstica"| PlatformBridge
    PlatformBridge -->|"Desktop Adapter: Dispatch extensión"| NeuCore
    NeuCore -->|"IPC Bidireccional"| ExtBridge
    ExtBridge -->|"Enruta llamadas"| ExtMain
    ExtMain --> ExpressServer
    ExtMain --> DiscordService
    ExtMain --> FileSystemService
    ExtMain --> OSProcesses
    ExtMain -->|"Respuesta de eventos"| ExtBridge
    ExtBridge -->|"Evento a la ventana"| UI

    %% Relaciones Mobile
    ExpoHost --> RNWebView
    RNWebView -->|"Carga interfaz vía Wi-Fi / Red Local"| Frontend
    PlatformBridge -->|"Mobile Adapter: postMessage"| RNWebView
    RNWebView -->|"Puente de mensajes bidireccional"| NativeMobileAPIs