# Arquitectura del Frontend: Alias y Patrón Fachada

En Weekbox, el código del frontend está estructurado para escalar sin convertirse en un desastre de imports imposibles de leer. Para lograr esto, aplicamos dos cosas o técnicas o eso de software que trabajan en conjunto: **Path Aliasing** (Alias de rutas) y el **Fecade Pattern** (junto con **Barrel file**).

---

## 1. Path Aliasing 

### El Problema
A medida que la aplicación crece, las rutas relativas se vuelven muy profundas. Un componente podría terminar con imports como este:
```typescript
import { ProgressBar } from '../../../../../shared/components/atoms/progress-bar';
```
Esto es frágil. Si mueves el archivo a otra carpeta, la ruta se rompe.

### La Solución
Configuramos **Vite** (`vite.config.ts`) y **TypeScript** (`tsconfig.app.json`) para que reconozcan prefijos especiales con arroba (`@`). 
Estos alias apuntan de forma absoluta a los índices de nuestras carpetas principales:

- `@shared` -> `src/shared/shared.tsx`
- `@features` -> `src/features/index.ts`
- `@utils` -> `src/utils/utils.tsx`
- `@core` -> `src/core/index.ts`

## 2. Facade y Barrel

### El Problema
No basta con acortar la ruta. Si exportáramos cada pequeño archivo suelto, seguirías teniendo que recordar exactamente cómo se llama cada módulo y de dónde viene. 

### La Solución
Aplicamos el patrón de diseño **Fachada** mediante "Archivos Barril" (`index.ts` o `shared.tsx`). En la raíz de cada dominio (`core`, `shared`, `features`), creamos un archivo que importa todo lo necesario de sus subcarpetas y lo empaqueta en un **solo objeto global** bien estructurado.

Por ejemplo, en `@core` (`src/core/index.ts`):
```typescript
import { platform } from './platform';

const Core = {
  platform,
  fs: {},
  services: {}
};

export default Core;
```

---

## Cómo usar esto en el código

Gracias a esta combinación, el código en cualquier componente de React, sin importar en qué subcarpeta viva, se ve así de limpio:

```typescript
import Core from '@core';
import Shared from '@shared';
import Features from '@features';

function MiComponente() {
  // Uso a través de la Fachada (autocompletado por el editor)
  const version = Core.platform.getVersion();
  
  return (
    <Features.Layout>
      <Shared.atoms.Titles text={`Versión ${version}`} />
      <Shared.molecules.Carousel />
    </Features.Layout>
  );
}
```

### Toma esto siempre en cuenta de esta arquitectura:
1. **Nunca uses rutas relativas largas** (`../../../`) para salir de tu dominio. Si necesitas algo de `shared`, usa `@shared`.
2. **Si creas un nuevo servicio en Core**, asegúrate de exportarlo agregándolo al objeto de la fachada en `src/core/index.ts`.
3. **El Frontend no debe saber cómo se implementa**. El botón no debe saber que la API está en Node o en Web, solo debe llamar a `Core.platform` o `Core.services` y confiar en que la Fachada hará su trabajo.
Y yap.