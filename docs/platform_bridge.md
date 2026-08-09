# Platform Bridge (Adaptadores)

## ¿Qué es el Platform Bridge?

El **Platform Bridge** (o Capa de Adaptadores) es un patrón de diseño utilizado en Weekbox para permitir que el mismo código del Frontend (React/Vite) se ejecute sin problemas en múltiples plataformas (Desktop, Mobile y Web) de forma agnóstica.

El objetivo principal es abstraer la comunicación con las APIs nativas. En lugar de que los componentes de React se preocupen por saber si están corriendo dentro de Neutralinojs o dentro de un WebView de React Native, simplemente llaman a la API unificada del adaptador.

## ¿Cómo funciona por dentro?

El sistema se compone de los siguientes elementos clave (ubicados en `frontend/src/core/platform/`):

1. **`types.ts`**: Define la interfaz común `IPlatformBridge`. Todos los adaptadores deben cumplir estrictamente con este contrato.
2. **Los Adaptadores**:
   - `desktop.adapter.ts`: Se comunica con Neutralinojs y nuestra extensión local de Node.js.
   - `mobile.adapter.ts`: Utiliza `window.ReactNativeWebView.postMessage` para enviar datos al código nativo de la app móvil.
   - `web.adapter.ts`: Un entorno simulado para probar la app directamente en el navegador sin las capacidades nativas.
3. **`index.ts` (El Singleton)**: Expone la constante `platform`. Este archivo detecta el entorno en tiempo de ejecución (por ejemplo, si existe `window.Neutralino` carga el Desktop, si existe `window.ReactNativeWebView` carga el Mobile) y exporta el adaptador correcto instanciado.

## Cómo utilizar los adaptadores en el proyecto

Gracias a esta arquitectura, usar características nativas desde cualquier componente es muy sencillo.

### 1. Importar el Singleton
En cualquier archivo `.tsx` o `.ts` de tu frontend, importa la variable `platform`:

```typescript
import { platform } from '../../core/platform'; // O la ruta relativa correspondiente
```

### 2. Inicializar la plataforma (solo una vez)
Asegúrate de que la plataforma se inicialice al arrancar la app. Actualmente esto se hace en `App.tsx`:

```typescript
useEffect(() => {
  platform.initialize();
}, []);
```

### 3. Escuchar Eventos Nativos
Para recibir datos desde el backend (por ejemplo, respuestas de la extensión de Node o eventos de la app móvil), utiliza el método `onEvent`. Este método retorna una función para desuscribirse y limpiar el listener, ideal para usar dentro de `useEffect`:

```typescript
useEffect(() => {
  const unsubscribe = platform.onEvent('myDataEvent', (data) => {
    console.log('Datos recibidos del backend nativo:', data);
  });

  // Limpiar suscripción al desmontar el componente
  return () => unsubscribe();
}, []);
```

## Agregar nuevas funciones al Adaptador (Paso a Paso)

A medida que el proyecto crezca, necesitaremos nuevas funciones nativas (ej. leer una base de datos, pedir permisos de notificaciones, etc.). Estos son los pasos para expandir el adaptador:

1. **Actualiza la Interfaz**:
   Abre `frontend\src\core\platform\types.ts` y añade la firma de la nueva función en `IPlatformBridge`:
   ```typescript
   export interface IPlatformBridge {
     // ...
     readFile(path: string): void;
   }
   ```

2. **Implementa en todos los adaptadores**:
   TypeScript te obligará (marcando un error) a implementar este nuevo método en los tres archivos: `desktop.adapter.ts`, `mobile.adapter.ts` y `web.adapter.ts`.
   
   - *Desktop*: Usa `window.NODE?.run(...)` o las funciones directas de Neutralino, lo ideal para esto seria mantener el proyectto con NodeJS.
   - *Mobile*: Envía la acción hacia React Native mediante su protocolo de comunicación.
   - *Web*: Simula la respuesta con `setTimeout` o imprime un `console.log` para que la UI no se rompa en desarrollo.

3. **Úsalo en la UI**:
   Ahora cualquier componente puede llamar a `platform.readFile('archivo.txt')` (por ejemplo) sin importarle en qué dispositivo está corriendo. El Singleton se encargará de rutear esa llamada al adaptador activo.
