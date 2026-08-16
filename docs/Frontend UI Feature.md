```
graph TD
    %% Definir colores y estilos
    classDef core fill:#ffe4e1,stroke:#d6a3a3,stroke-width:2px,color:#333;
    classDef features fill:#e0f7fa,stroke:#80deea,stroke-width:2px,color:#333;
    classDef shared fill:#e8f5e9,stroke:#a5d6a7,stroke-width:2px,color:#333;
    classDef entry fill:#fff9c4,stroke:#fff176,stroke-width:2px,color:#333;
    classDef backend fill:#e1bee7,stroke:#ce93d8,stroke-width:2px,color:#333;

    Entry[App.tsx]:::entry --> FeatLayout[@features / Layout]:::features
    
    subgraph Capa Visual [Frontend UI]
        FeatLayout --> FeatHome[Feature: Home]:::features
        FeatLayout --> FeatLoading[Feature: Loading]:::features
        
        FeatHome --> SharedMol[Shared: Molecules<br>Carousel, Banner]:::shared
        FeatHome --> SharedAtom[Shared: Atoms<br>Cards, Progress]:::shared
        FeatLoading --> SharedAtom
    end

    subgraph Capa Núcleo [Core / Lógica Base]
        FeatHome -.-> CorePlatform[@core / Platform]:::core
        FeatHome -.-> CoreAPI[@core / Services]:::core
        FeatLoading -.-> CorePlatform
    end

    subgraph Extensión Nativa [Backend Neutralino]
        CorePlatform ==> NodeMain[Node Extension<br>extensions/node]:::backend
        CoreAPI ==> NodeMain
        NodeMain --> FS[(File System / Mods)]
        NodeMain --> APIs((GameBanana / GameJolt))
    end
```

- **Amarillo (`App.tsx`)**: El punto de entrada de la aplicación React.
- **Cian (`@features`)**: Pantallas y contenedores con lógica de negocio específica de la UI. Dependen de `Shared` y de `Core`.
- **Verde (`@shared`)**: Componentes de UI puros (Átomos, Moléculas). No deben depender de `Features` ni hacer llamadas directas complejas a `Core` si es posible.
- **Rojo (`@core`)**: Adaptadores, llamadas a APIs externas y gestores del File System. No contiene nada de UI (cero React Components).
- **Morado (Backend)**: El código de Node.js que corre de fondo y hace el trabajo pesado real en el sistema operativo.
