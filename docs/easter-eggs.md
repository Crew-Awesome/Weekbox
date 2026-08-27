# Easter Eggs en la Barra de Búsqueda

Este documento describe la convención y el flujo correcto sobre cómo y dónde se deben implementar los "Easter Eggs" (huevos de pascua) interactivos en la barra de búsqueda de mods de Weekbox.

## 1. El Enfoque Correcto (UI Level)

El lugar correcto para interceptar y ejecutar un Easter Egg originado por texto **NO es** en el motor de búsqueda central (`core/services/gamebanana/algorithms/search.ts`), sino en la capa visual de la interfaz de usuario antes de que se dispare la mutación del estado.

Específicamente, el componente ideal para esto es `HomeSearchbar` (`frontend/src/features/home/components/home-searchbar.tsx`) o el manejador de envío principal de la vista de inicio.

### ¿Por qué en la UI y no en el Motor (WASE)?
1. **Evita llamadas de red innecesarias:** Si el usuario escribe `"do a barrel roll"`, no queremos que el motor intente buscar un mod llamado así y sature la API.
2. **Acceso al DOM:** Los Easter Eggs usualmente requieren manipular la pantalla (ej. girar la pantalla, reproducir un sonido, mostrar un modal secreto). El motor de búsqueda es un servicio abstracto (headless) y no tiene acceso al DOM o al estado visual de React.
3. **Separación de Responsabilidades:** El motor de búsqueda debe limitarse a procesar matemáticas y metadatos. La UI se encarga del entretenimiento.

---

## 2. Implementación de Ejemplo

Para colocar un Easter Egg, se debe interceptar la función `handleSearch` dentro del componente que envuelve la barra de búsqueda (por ejemplo, `HomeSearchbar`).

```tsx
// Ubicación: frontend/src/features/home/components/home-searchbar.tsx

const handleSearch = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  // 1. Intercepción del Easter Egg
  if (normalizedQuery === "do a barrel roll") {
    // Ejecutar lógica visual (ej. rotar la pantalla usando GSAP o clases CSS)
    document.body.classList.add("barrel-roll-animation");
    
    setTimeout(() => {
      document.body.classList.remove("barrel-roll-animation");
    }, 2000);
    
    // IMPORTANTE: Retornar temprano para no ejecutar una búsqueda real
    return;
  }

  if (normalizedQuery === "konami") {
    // Otro Easter Egg...
    triggerSecretModal();
    return;
  }

  // 2. Flujo Normal de Búsqueda
  onSearchSubmit(query);
  setShowFilters(false);
};
```

## 3. Buenas Prácticas

1. **Retorno Temprano (`return;`):** Siempre haz un retorno temprano después de ejecutar el Easter Egg para evitar que `onSearchSubmit(query)` sea invocado.
2. **Normalización:** Convierte el `query` a minúsculas y quítale los espacios (`.trim().toLowerCase()`) antes de evaluarlo, para que el Easter Egg funcione sin importar si el usuario escribió con mayúsculas.
3. **Animaciones:** Si vas a usar animaciones, asegúrate de limpiarlas (remover clases o resetear estados) después de que terminen, para no dejar la aplicación en un estado inutilizable.
4. **No persistir el estado:** Los textos de Easter Eggs no deberían guardarse idealmente en el historial de búsquedas o en la caché del motor.
