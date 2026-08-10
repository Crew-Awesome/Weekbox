# Guía de Arquitectura de API de Componentes

Este proyecto utiliza un patrón de diseño basado en **Puntos de Acceso Centralizados (APIs)** y **Alias de Importación** (`@shared` y `@features`) para mantener el código organizado, limpio y modular.

## Por qué utilizamos este sistema?

En React, es común terminar con importaciones largas y confusas conocidas como *Callback Hell de imports*:
```tsx
// MALA PRÁCTICA *SAPE*
import Card from '../../../shared/components/molecules/card-mainmenu/card';
import Searchbar from '../../../shared/components/molecules/searchbar/searchbar';
import { Sidebar } from '../../shared/components/organisms/sidebar/sidebar';
```

Al utilizar nuestra API, abstraemos la estructura interna de carpetas y proporcionamos una interfaz limpia:
```tsx
// MONO BUENO
import Shared from '@shared';
import Features from '@features';

// Uso directo y semántico
<Shared.molecules.Card />
<Features.Layout />
```

---

## 1. La API de `@shared`

La carpeta `shared/` contiene componentes genéricos y reutilizables en cualquier parte de la aplicación. Se basa en la metodología de **Atomic Design** (Átomos, Moléculas, Organismos).

### ¿Cómo añadir un nuevo componente a Shared?

1. **Crear el componente**: Crea tu archivo `.tsx` en la carpeta correspondiente (`atoms`, `molecules` u `organisms`).
   *Ejemplo: `shared/components/atoms/button/button.tsx`*
2. **Exportarlo en la API**: Abre `frontend/src/shared/shared.tsx`.
3. **Importar y registrar**: Añade tu componente al objeto `Shared`.

```tsx
// En shared.tsx
import Button from './components/atoms/button/button';

const Shared = {
  atoms: {
    ProgressBar,
    AppVersion,
    Titles,
    Button, // <-- el nuevo componente!
  },
  molecules: { ... },
  organisms: { ... }
};
```

---

## 2. La API de `@features`

La carpeta `features/` contiene bloques lógicos grandes, contextos, o páginas enteras que son específicas de ciertas partes de la app (no son genéricas como las de `shared`).

### ¿Cómo expandir la API de Features?

1. **Crear la feature**: Desarrolla tu componente o módulo dentro de `frontend/src/features/`.
   *Ejemplo: `frontend/src/features/library/library-page.tsx`*
2. **Exportarlo en el index**: Abre `frontend/src/features/index.ts`.
3. **Añadir al objeto Features**: Exporta tu módulo a través del objeto principal.

```tsx
// En features/index.ts
import { Layout } from './layout';
import { LibraryPage } from './library/library-page'; // <-- Importas tu módulo

const Features = {
  Layout,
  LibraryPage, // <-- Lo añades a la API
};

export default Features;
```

---

## Configuración Subyacente (Solo para saber)

Si alguna vez creas un **nuevo alias** (ej. `@core` o `@utils`), recuerda que debes registrarlo en dos lugares:

1. **`vite.config.ts`**: Para que el empaquetador (bundler) sepa dónde encontrar los archivos físicos.
2. **`tsconfig.app.json`**: Para que TypeScript y tu editor de código (VS Code) provean autocompletado y no marquen error.
