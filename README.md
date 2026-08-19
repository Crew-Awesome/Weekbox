# Weekbox README EN WIP

Weekbox es un Gestor de Mods diseñado para ser rápido, ligero y multiplataforma. Construido utilizando Neutralinojs, React, Zustand y Tailwind CSS.

## Documentación

El proyecto cuenta con una arquitectura avanzada diseñada para escalar y mantener una buena experiencia de desarrollo. Te invitamos a leer la documentación para entender cómo está construido antes de comenzar a contribuir:

- [Scripts y Flujo de Desarrollo](./docs/scripts_y_desarrollo.md): Aprende a ejecutar la aplicación, cómo funcionan los entornos web y de escritorio, y qué comando usar según lo que necesites.
- [Arquitectura Dual: Web y Desktop](./docs/arquitectura_dual.md): Explicación del patrón de Adaptador utilizado en el "Core" para hacer que la aplicación sea agnóstica al entorno, junto con la Extensión de Node.js.
- [Arquitectura del Frontend](./docs/arquitectura_frontend.md): Detalles sobre cómo el Frontend usa Path Aliasing y el Patrón Fachada (Archivos Barril) para mantener el código limpio y libre de importaciones interminables.
- [Guía de Contribución](./docs/guia_de_contribucion.md): Reglas de cómo nombrar variables, componentes y buenas prácticas del proyecto.
- [Compilar Weekbox](./docs/compilar-weekbox.md): Instrucciones para empaquetar la aplicación para producción.
- [Manejo de Deeplinks](./docs/deeplink.md): Especificación técnica de cómo funcionan los URIs personalizados (`weekbox://`).

## Primeros pasos rápidos

Si es la primera vez que descargas el proyecto, asegúrate de instalar todas las dependencias ejecutando:

```bash
npm run install:all
```

Luego, si deseas desarrollar usando **Hot Reloading** conectado a las APIs de escritorio:

```bash
npm run dev:pc
```

Consulta [Scripts y Entornos de Desarrollo](./docs/scripts_y_desarrollo.md) para más detalles.
