# Guía de Contribución y Estructura del Proyecto

Esta guía establece las reglas, estándares y convenciones de estructura para el código del frontend de **Weekbox**. El objetivo es que cualquier persona pueda leer el código, entender dónde va cada pieza y cómo debe nombrarse y documentarse.

---

## 1. Estructura de Directorios (`frontend/src/`)

El proyecto utiliza una arquitectura modular. Cada carpeta tiene un propósito estricto:

### 📁 `src/core/`
- **Para qué es:** Lógica central de la aplicación, adaptadores del sistema y llamadas de red. Es totalmente agnóstico a la interfaz (no contiene código JSX/CSS).
- **Qué VA aquí:** 
  - `platform/`: Adaptadores para comunicar React con Neutralino (Node) o la Web.
  - `fs/`: Funciones para pedirle al backend que instale mods, lea archivos o escriba JSONs.
  - `services/`: Consumo de APIs (ej. llamadas a servidores de GameBanana o Psych Online).
- **Qué NO va aquí:** Botones, vistas, componentes de React, estilos.

### 📁 `src/features/`
- **Para qué es:** Agrupa partes de la UI por su dominio o "Feature". Aquí es donde unimos la lógica de `core` con los componentes visuales de `shared`.
- **Qué VA aquí:** 
  - Páginas y pantallas enteras (`home/`, `settings/`).
  - Contenedores principales (`layout/`, `loading-screen/`).
  - Lógica de UI atada al estado global de una pantalla en específico.
- **Qué NO va aquí:** Componentes visuales genéricos y reutilizables. Un botón estilizado (frontend/src/features/button/) no es un feature.

### 📁 `src/shared/`
- **Para qué es:** Biblioteca de componentes de interfaz reutilizables, guiados por la metodología de *Atomic Design*.
- **Qué VA aquí:** 
  - `components/atoms/`: Botones, Textos, inputs básicos (`app-version`, `progress-bar`).
  - `components/molecules/`: Uniones de átomos (`carousel`, `searchbar`, `banner`).
  - `components/organisms/`: Secciones grandes de UI reusables (`sidebar`).
- **Qué NO va aquí:** Llamadas a bases de datos o fetching de datos (los componentes aquí deben recibir datos vía *props*/*propiedades*).

### 📁 `src/utils/`
- **Para qué es:** Funciones auxiliares genéricas y utilidades menores.
- **Qué VA aquí:** Formateo de fechas, extractores de color de imágenes, cálculos matemáticos, generadores de UUID.
- **Qué NO va aquí:** Clases enteras que manejan estados de la app o se comunican con APIs externas (eso va en `core`).

---

## 2. Naming Conventions

Para mantener uniformidad en el repositorio, sigue estas reglas estrictas de nomenclatura:

### 📄 Nombres de Archivos y Carpetas: `kebab-case`
Todos los archivos y carpetas deben estar en minúsculas y separar las palabras con guiones medios.
- ✅ **Correcto:** `progress-bar.tsx`, `loading-screen.tsx`, `mod-manager.ts`, `gamebanana-api/`
- ❌ **Incorrecto:** `ProgressBar.tsx`, `loadingScreen.ts`, `mod_manager.tsx`, `GameBananaAPI/`

### Nombres de Componentes React: `PascalCase`
Al definir la función dentro de un archivo, el nombre del componente exportado siempre empieza con mayúscula.
```tsx
// ✅ Correcto (Dentro de loading-screen.tsx)
export const LoadingScreen = () => { ... }
```

### 🔧 Nombres de Funciones, Variables e Instancias: `camelCase`
La primera letra minúscula, el resto en mayúscula.
```typescript
// ✅ Correcto
const isLoading = false;
async function fetchModMetadata() { ... }
```

---

## 3. Documentación y Comentarios (JSDoc)

Usamos el estándar **JSDoc** para documentar clases, funciones críticas y componentes compartidos. Una buena documentación permite a otros desarrolladores entender tu código simplemente pasando el ratón sobre la función en VS Code.

### ✅ Cómo SÍ documentar correctamente

Utiliza bloques `/** ... */` sobre la función. Describe qué hace, qué recibe y qué retorna.

**Ejemplo de una Función de Lógica (`core/`):**
```typescript
/**
 * @description Inicia la descarga e instalación de un mod desde GameBanana.
 * Internamente se comunica con la extensión de Node para hacer el trabajo pesado en el File System.
 * 
 * @param {number} modId - El ID numérico único del mod en GameBanana.
 * @param {boolean} [forceOverwrite=false] - Opcional. Si es true, sobrescribe el mod si ya existe en disco.
 * @returns {Promise<boolean>} Retorna true si la instalación fue exitosa, false en caso contrario.
 */
export async function installMod(modId: number, forceOverwrite = false): Promise<boolean> {
  // Código...
}
```

**Ejemplo de un Componente React (`shared/`):**
```tsx
export interface BannerProps {
  /** URL de la imagen que servirá como miniatura/fondo del banner */
  thumbnail: string;
  /** (Opcional) Texto que se muestra en una pastilla sobre el título principal */
  pillTitle?: string;
  /** Función que se ejecuta cuando el usuario hace clic en todo el componente */
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * @description Componente visual tipo Banner para mostrar información destacada (ej. mods populares).
 * Incluye un efecto de hover animado utilizando GSAP.
 */
export const Banner: React.FC<BannerProps> = ({ thumbnail, pillTitle, onClick }) => {
  // Código...
}
```

### ❌ Cómo NO documentar

Evita usar comentarios de línea única `//` para explicar qué hace una función pública entera o dar descripciones flojas que no explican los parámetros.

```typescript
// función para instalar un mod
// recibe id y sobreescribir
export async function installMod(modId: number, forceOverwrite: boolean) {
  // ...
}
```
*¿Por qué está mal?* 
- No utiliza JSDoc (`/** */`), por lo que VS Code no mostrará la ayuda visual cuando alguien llame a la función desde otro archivo.
- No explica el tipo de dato de retorno ni para qué sirve específicamente el booleano.
- Fomenta la pérdida de tiempo, ya que otro dev tendrá que leer todo el código de tu función para saber qué hace.

---

### ¿Regla de goats para los comentarios?
No comentes *CÓMO* hace algo el código (el código limpio debe leerse y explicarse solo). Documenta **QUÉ** hace, **POR QUÉ** se hizo así y **QUÉ DATOS** espera recibir.

- Con amor, B <3