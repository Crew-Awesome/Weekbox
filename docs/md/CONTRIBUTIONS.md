# CONTRIBUTION GUIDE

Welcome to **Weekbox**. This guide sets out the standards and best practices for contributing to the project consistently and safely.

## Table of Contents

1. [File Structure](#file-structure)
2. [Naming Conventions](#naming-conventions)
3. [Formatting Process](#formatting-process)
4. [CSS Standards](#css-standards)
5. [JavaScript Standards](#javascript-standards)
6. [Component Structure](#component-structure)
7. [Security](#security)
8. [Modularization Principles](#modularization-principles)
9. [Documentation](#documentation)

---

## FILE STRUCTURE

The project uses an organized structure that separates UI logic, backend code, and configuration:

```
app/src/
├── ui/
│   ├── js/              # JavaScript logic
│   ├── css/             # Modular CSS styles
│   ├── html/            # HTML templates
│   └── utils/
│       ├── componentes/      # Reusable Web Components
│       └── helpers/          # Utility functions
├── backend/
│   ├── api/             # API endpoints and logic
│   ├── config/          # Project configuration
│   └── native/          # Native operating-system integrations
```

### MAIN DIRECTORIES

- **`app/src/ui/js/`**: JavaScript logic, controllers, and handlers
- **`app/src/ui/styles/`**: Modular styles organized by base, component, layout, and view
- **`app/src/ui/html/`**: HTML templates
- **`app/src/ui/utils/`**: Shared UI helpers and services
- **`app/src/backend/`**: Native/backend services
- **`app/config/`**: App configuration

---

## NAMING CONVENTIONS

All files and directories must use **kebab-case** (words-separated-by-hyphens):

### CORRECT EXAMPLES

```
✓ archivo-principal.js
✓ componente-boton.js
✓ utilidad-descarga.js
✓ estilos-base.css
✓ modal-confirmacion.html
✓ gestor-almacenamiento.js
```

### INCORRECT EXAMPLES

```
✗ archivoPrincipal.js          (camelCase)
✗ ComponenteBoton.js           (PascalCase)
✗ UTILIDAD_DESCARGA.js         (SCREAMING_SNAKE_CASE)
✗ estilos_base.css             (snake_case)
```

---

## FORMATTING PROCESS

Before submitting a pull request, **all files must be formatted correctly**.

### FORMAT ALL FILES

```bash
npm run format
```

This command applies:
- Consistent indentation
- Standard spacing and line breaks
- Consistent quotation marks and punctuation

### CHECK BEFORE PUSHING

```bash
# Check which files need formatting
npm run format:check

# Format automatically
npm run format

# Commit
git add .
git commit -m "feat: descripcion-del-cambio"
git push
```

### ⚠️ IMPORTANT

**Do not push without running `npm run format` first.** Unformatted files will be rejected during review.

---

## CSS STANDARDS

We use a modular, safe approach to styling, organized hierarchically by responsibility.

### HIERARCHICAL CSS STRUCTURE

Styles are organized into topic-based directories, each representing a related group of features, for example:

```
app/src/ui/styles/
├── styles.css              # Entry point
├── variables.css
├── base/                   # Base, markdown, and shared animations
├── components/             # Buttons, dropdowns, progress, and toasts
├── layout/                 # Sidebar and layout imports
└── views/                  # Home, News, Mods, Engines, settings, and overlays
```

### CSS IMPORT FLOW

**Rule**: Each layer imports only what it needs, from the bottom up.

#### 1. `app/src/ui/styles/styles.css` (Entry Point)

```css
@import "./variables.css";
@import "./base/index-module.css";
@import "./layout/index-module.css";
@import "./components/index-module.css";
@import "./views/index-module.css";
/* View and component files are imported by their index modules. */

body {
  font-family: var(--font-primary);
  color: var(--text-main);
  background-color: var(--bg-color);
}
```

#### 2. `app/src/ui/styles/variables.css` (Variables Globales)

```css
/* ============================================
   VARIABLES GLOBALES EJEMPLO - COLORES  (distintos temas)
   ============================================ */
:root {
  --color-primario: #007bff;
  --color-primario-hover: #0056b3;
  --color-primario-light: #e7f1ff;
  
  --color-secundario: #6c757d;
  --color-peligro: #dc3545;
  --color-exito: #28a745;
  --color-advertencia: #ffc107;
  
  --color-texto-primario: #1a1a1a;
  --color-texto-secundario: #666666;
  --color-texto-invertido: #ffffff;
  
  --color-fondo: #ffffff;
  --color-fondo-secundario: #f5f5f5;
  --color-borde: #e0e0e0;
}

/* ============================================
   VARIABLES GLOBALES - ESPACIADO
   ============================================ */
:root {
  --espacio-xs: 4px;
  --espacio-sm: 8px;
  --espacio-md: 16px;
  --espacio-lg: 24px;
  --espacio-xl: 32px;
  --espacio-xxl: 48px;
}

/* ============================================
   VARIABLES GLOBALES - TIPOGRAFÍA
   ============================================ */
:root {
  --fuente-principal: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  --fuente-monoespaciada: 'Courier New', monospace;
  
  --tamaño-xs: 12px;
  --tamaño-sm: 14px;
  --tamaño-md: 16px;
  --tamaño-lg: 18px;
  --tamaño-xl: 20px;
  --tamaño-2xl: 24px;
  
  --peso-ligero: 300;
  --peso-normal: 400;
  --peso-medio: 500;
  --peso-semibold: 600;
  --peso-bold: 700;
  
  --altura-linea-compacta: 1.2;
  --altura-linea-normal: 1.5;
  --altura-linea-relajada: 1.8;
}

/* ============================================
   VARIABLES GLOBALES - BORDES
   ============================================ */
:root {
  --radio-sm: 4px;
  --radio-md: 8px;
  --radio-lg: 12px;
  --radio-redondo: 50%;
}

/* ============================================
   VARIABLES GLOBALES - SOMBRAS
   ============================================ */
:root {
  --sombra-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --sombra-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --sombra-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* ============================================
   VARIABLES GLOBALES - TRANSICIONES
   ============================================ */
:root {
  --transicion-rapida: all 0.15s ease-out;
  --transicion-normal: all 0.3s ease-out;
  --transicion-lenta: all 0.5s ease-out;
}
```

#### 3. Example view stylesheet (BEM structure)

```css
/* Menu - Import principal que agrupa submódulos */
@import url('./grid.css');
@import url('./navegacion.css');
@import url('./responsive.css');
@import url('./animaciones.css');

/* ============================================
   COMPONENTE MENÚ - ESTILOS PRINCIPALES
   ============================================ */

.menu {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--espacio-md);
  padding: var(--espacio-lg);
  background-color: var(--color-fondo);
  border-bottom: 1px solid var(--color-borde);
}

.menu__item {
  padding: var(--espacio-sm) var(--espacio-md);
  border-radius: var(--radio-md);
  cursor: pointer;
  transition: var(--transicion-normal);
}

.menu__item:hover {
  background-color: var(--color-fondo-secundario);
}

.menu__item--activo {
  background-color: var(--color-primario-light);
  color: var(--color-primario);
  font-weight: var(--peso-semibold);
}
```

#### 4. Example grid submodule

```css
/* Menu - Sistema de Grid */

.menu__grid-contenedor {
  display: grid;
  grid-template-columns: 1fr 2fr;
  grid-gap: var(--espacio-md);
  align-items: center;
}

.menu__grid-item {
  padding: var(--espacio-sm);
}

@media (max-width: 768px) {
  .menu__grid-contenedor {
    grid-template-columns: 1fr;
  }
}
```

#### 5. Example navigation submodule

```css
/* Menu - Navegación */

.menu__enlace {
  color: var(--color-texto-primario);
  text-decoration: none;
  transition: var(--transicion-normal);
}

.menu__enlace:hover {
  color: var(--color-primario);
}

.menu__enlace--activo {
  border-bottom: 2px solid var(--color-primario);
}
```

#### 6. Example responsive submodule

```css
/* Menu - Diseño Responsivo */

@media (max-width: 768px) {
  .menu {
    flex-direction: column;
    padding: var(--espacio-md);
  }

  .menu__item {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .menu {
    padding: var(--espacio-sm);
    gap: var(--espacio-sm);
  }
}
```

### SCOPED CSS AND BEM

Use **scoped CSS** together with **BEM** (Block Element Modifier) to prevent style conflicts:

```css
/* ✓ CORRECTO: BEM con prefijo del componente */
.componente-boton {
  padding: 8px 16px;
  border-radius: var(--radio-md);
}

.componente-boton__icono {
  margin-right: var(--espacio-sm);
}

.componente-boton--primario {
  background-color: var(--color-primario);
  color: white;
}

.componente-boton--primario:hover {
  background-color: var(--color-primario-hover);
}

/* ✗ INCORRECTO: Nombres genéricos sin scope */
.boton {
  padding: 8px 16px;
}

.boton.primario {
  background-color: #007bff;
}
```

### REQUIRED CSS CONVENTIONS

```css
/* ✓ Usar variables globales SIEMPRE */
color: var(--color-texto-primario);
padding: var(--espacio-md);
font-family: var(--fuente-principal);

/* ✗ NO usar colores hardcodeados */
color: #1a1a1a;

/* ✓ Usar transiciones globales */
transition: var(--transicion-normal);

/* ✗ NO usar !important a menos que sea absolutamente necesario */
color: red !important;

/* ✓ Dividir CSS complejos en archivos separados por responsabilidad */
/* ✗ NO tener archivos CSS de más de 300 líneas */

/* ✓ Usar @import url para incluir dependencias */
@import url('./submódulo.css');

/* ✗ NO usar estilos inline en HTML */
/* ✗ NO usar !important sin justificación (en caso de usarlo, especificar por que) */
```

---

## JAVASCRIPT STANDARDS

### NO INNERHTML

**Never use `innerHTML` to insert content.** It exposes the project to XSS vulnerabilities.

```javascript
/* ✗ INCORRECTO y peligroso */
element.innerHTML = `<div>${datosDelUsuario}</div>`;

/* ✓ CORRECTO: Usar textContent para texto */
element.textContent = datosDelUsuario;

/* ✓ CORRECTO: Usar templates HTML */
// Ver sección "Estructura de Componentes"
```

### DO NOT CREATE HTML FROM JAVASCRIPT

**Do not create HTML elements through string concatenation or direct DOM manipulation.**

```javascript
/* ✗ INCORRECTO */
const html = `
  <div class="modal">
    <h1>${titulo}</h1>
    <p>${contenido}</p>
  </div>
`;
element.innerHTML = html;

/* ✓ CORRECTO: Usar templates en app/src/ui/html/ */
// Ver sección "Estructura de Componentes - Templates HTML"
```

### JAVASCRIPT NAMING CONVENTIONS

```javascript
/* Constantes en UPPER_SNAKE_CASE */
const API_BASE_URL = 'https://api.example.com';
const TIMEOUT_MILISEGUNDOS = 5000;

/* Variables y funciones en camelCase */
let usuarioActual = null;
function obtenerDatosDelServidor() { }
const calcularTotal = (items) => { };

/* Clases en PascalCase */
class GestorDescarga { }
class ModalConfirmacion { }
```

---

## COMPONENT STRUCTURE

### WEB COMPONENTS

All UI components should be **Web Components** _(or mostly so)_.

### COMPONENT FILE

Each component must have this structure:

```
app/src/ui/utils/components/
├── componente-nombre/
│   ├── componente-nombre.js      # Lógica del componente
│   ├── componente-nombre.css     # Estilos scoped
│   └── componente-nombre.html    # Plantilla
```

### COMPONENT EXAMPLE: componente-boton.js

```javascript
/**
 * Componente de Botón Reutilizable
 * 
 * Componente Web Component con API pública accesible desde HTML.
 * Limpia automáticamente event listeners en disconnectedCallback para evitar memory leaks.
 * 
 * @class ComponenteBoton
 * @extends HTMLElement
 * 
 * @example
 * <!-- Uso básico -->
 * <componente-boton tipo="primario" deshabilitado="false">
 *   Haz clic aquí
 * </componente-boton>
 * 
 * <!-- Uso con data- attributes -->
 * <componente-boton data-tipo="primario" data-deshabilitado="false">
 *   Botón configurado
 * </componente-boton>
 * 
 * <!-- Acceso desde JavaScript -->
 * <script>
 *   const boton = document.querySelector('componente-boton');
 *   boton.tipo = 'secundario';
 *   boton.deshabilitado = true;
 *   boton.addEventListener('componente-boton:click', (e) => {
 *     console.log('Botón presionado:', e.detail);
 *   });
 * </script>
 * 
 * @property {string} tipo - Tipo de botón: 'primario', 'secundario', 'peligro'
 * @property {boolean} deshabilitado - Si el botón está deshabilitado
 * @property {string} icono - Nombre del icono a mostrar (opcional)
 * 
 * @fires componente-boton:click - Evento personalizado disparado al hacer clic
 */
class ComponenteBoton extends HTMLElement {
  /**
   * Atributos observados por el componente
   * @static
   * @type {string[]}
   */
  static get observedAttributes() {
    return ['tipo', 'deshabilitado', 'icono'];
  }

  /**
   * Constructor del componente
   * Inicializa el Shadow DOM
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.eventListeners = [];
  }

  /**
   * Se ejecuta cuando el elemento es insertado en el DOM
   * Carga la plantilla, aplica estilos e inicializa data- attributes
   * @private
   */
  connectedCallback() {
    this.initializeFromDataAttributes();
    this.renderTemplate();
    this.setupEventListeners();
  }

  /**
   * Se ejecuta cuando el elemento es removido del DOM
   * Limpia event listeners y referencias para evitar memory leaks
   * @private
   */
  disconnectedCallback() {
    this.destroy();
  }

  /**
   * Se ejecuta cuando un atributo observado cambia
   * @param {string} nombreAtributo - Nombre del atributo que cambió
   * @param {string} valorAnterior - Valor anterior del atributo
   * @param {string} valorNuevo - Nuevo valor del atributo
   * @private
   */
  attributeChangedCallback(nombreAtributo, valorAnterior, valorNuevo) {
    if (valorAnterior === valorNuevo) return;
    this.renderTemplate();
  }

  /**
   * Renderiza la plantilla y aplica estilos
   * @private
   */
  async renderTemplate() {
    try {
      const template = await this.loadTemplate();
      this.shadowRoot.innerHTML = '';
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      this.applyStyles();
    } catch (error) {
      console.error('Error al renderizar componente-boton:', error);
    }
  }

  /**
   * Carga la plantilla HTML del componente
   * @private
   * @returns {Promise<HTMLTemplateElement>}
   */
  async loadTemplate() {
    const response = await fetch('/app/src/ui/utils/components/componente-boton/componente-boton.html');
    const html = await response.text();
    const template = document.createElement('template');
    template.innerHTML = html;
    return template;
  }

  /**
   * Aplica los estilos scoped al componente
   * @private
   */
  async applyStyles() {
    const style = document.createElement('style');
    const css = await fetch('/app/src/ui/utils/components/componente-boton/componente-boton.css')
      .then(res => res.text());
    style.textContent = css;
    this.shadowRoot.appendChild(style);
  }

  /**
   * Configura los event listeners del componente
   * Registra listeners para limpiarlos en destroy()
   * @private
   */
  setupEventListeners() {
    const boton = this.shadowRoot.querySelector('button');
    if (boton) {
      const clickHandler = (e) => this.handleClick(e);
      boton.addEventListener('click', clickHandler);
      this.eventListeners.push({ target: boton, event: 'click', handler: clickHandler });
    }
  }

  /**
   * Inicializa propiedades desde data- attributes
   * Permite configurar el componente directamente en HTML
   * @private
   */
  initializeFromDataAttributes() {
    if (this.dataset.tipo) {
      this.tipo = this.dataset.tipo;
    }
    if (this.dataset.deshabilitado !== undefined) {
      this.deshabilitado = this.dataset.deshabilitado === 'true';
    }
    if (this.dataset.icono) {
      this.setAttribute('icono', this.dataset.icono);
    }
  }

  /**
   * Destruye el componente y limpia recursos
   * Remueve todos los event listeners para evitar memory leaks
   * @public
   */
  destroy() {
    this.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
    }
  }

  /**
   * Manejador del evento click
   * @private
   * @param {MouseEvent} evento
   */
  handleClick(evento) {
    if (this.deshabilitado) {
      evento.preventDefault();
      return;
    }
    
    this.dispatchEvent(new CustomEvent('componente-boton:click', {
      detail: { tipo: this.tipo },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Getter para el atributo deshabilitado
   * @returns {boolean}
   */
  get deshabilitado() {
    return this.hasAttribute('deshabilitado');
  }

  /**
   * Setter para el atributo deshabilitado
   * @param {boolean} valor
   */
  set deshabilitado(valor) {
    if (valor) {
      this.setAttribute('deshabilitado', '');
    } else {
      this.removeAttribute('deshabilitado');
    }
  }

  /**
   * Getter para el tipo de botón
   * @returns {string}
   */
  get tipo() {
    return this.getAttribute('tipo') || 'secundario';
  }

  /**
   * Setter para el tipo de botón
   * @param {string} valor
   */
  set tipo(valor) {
    this.setAttribute('tipo', valor);
  }

  /**
   * API PÚBLICA DEL COMPONENTE
   * 
   * Métodos públicos disponibles para interacción desde JavaScript:
   * 
   * - destroy(): Limpia recursos y event listeners
   * - tipo (getter/setter): Obtiene o establece el tipo de botón
   * - deshabilitado (getter/setter): Obtiene o establece si está deshabilitado
   * 
   * Data- attributes soportados (se sincronizan automáticamente):
   * - data-tipo: Tipo de botón
   * - data-deshabilitado: Si el botón está deshabilitado ("true" o "false")
   * - data-icono: Nombre del icono
   * 
   * Y entre otros que el componente amerite
   */
}

// Registrar el componente
customElements.define('componente-boton', ComponenteBoton);
```

### HTML TEMPLATE: componente-boton.html

```html
<template id="plantilla-componente-boton">
  <button class="componente-boton" part="boton">
    <slot></slot>
  </button>
</template>

<script>
  // Exportar para uso en módulos
  export const plantillaComponenteBoton = document.getElementById('plantilla-componente-boton');
</script>
```

### STYLES: componente-boton.css

```css
/* ✓ Importar variables globales en cada componente */
@import url('../../styles/variables.css');

/* Estilos scoped del componente boton */
:host {
  display: inline-block;
}

.componente-boton {
  padding: var(--espacio-sm) var(--espacio-md);
  border: none;
  border-radius: var(--radio-md);
  cursor: pointer;
  font-family: var(--fuente-principal);
  font-size: var(--tamaño-md);
  font-weight: var(--peso-medio);
  transition: var(--transicion-normal);
  outline: none;
}

/* Variante primaria */
:host([tipo="primario"]) .componente-boton {
  background-color: var(--color-primario);
  color: var(--color-texto-invertido);
}

:host([tipo="primario"]) .componente-boton:hover:not(:disabled) {
  background-color: var(--color-primario-hover);
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
}

/* Variante secundaria */
:host([tipo="secundario"]) .componente-boton {
  background-color: transparent;
  color: var(--color-primario);
  border: 1px solid var(--color-primario);
}

:host([tipo="secundario"]) .componente-boton:hover:not(:disabled) {
  background-color: var(--color-primario-light);
}

/* Estado deshabilitado */
:host([deshabilitado]) .componente-boton {
  opacity: 0.5;
  cursor: not-allowed;
}

:host([deshabilitado]) .componente-boton:hover {
  transform: none;
  background-color: inherit;
}
```

### PUBLIC API AND DATA ATTRIBUTES

All components must expose a clear public API and support configuration through HTML `data-` attributes.

#### RESOURCE MANAGEMENT (MEMORY LEAKS)

```javascript
/**
 * Constructor - Inicializa el array para rastrear event listeners
 */
constructor() {
  super();
  this.attachShadow({ mode: 'open' });
  this.eventListeners = [];  // Array para almacenar referencias
}

/**
 * disconnectedCallback - Limpia automáticamente cuando se remueve del DOM
 * ✓ SIEMPRE implementar para evitar memory leaks
 */
disconnectedCallback() {
  this.destroy();  // Llama al método de limpieza
}

/**
 * destroy() - Limpia event listeners y referencias a objetos
 * @public - Método público para limpieza manual si es necesario
 */
destroy() {
  this.eventListeners.forEach(({ target, event, handler }) => {
    target.removeEventListener(event, handler);
  });
  this.eventListeners = [];

  if (this.shadowRoot) {
    this.shadowRoot.innerHTML = '';
  }
}
```

#### REGISTER EVENT LISTENERS CORRECTLY

```javascript
setupEventListeners() {
  const boton = this.shadowRoot.querySelector('button');
  if (boton) {
    // Crear referencia al handler
    const clickHandler = (e) => this.handleClick(e);
    
    // Agregar listener
    boton.addEventListener('click', clickHandler);
    
    // Registrar en array para cleanup
    this.eventListeners.push({
      target: boton,
      event: 'click',
      handler: clickHandler
    });
  }
}
```

#### USING DATA ATTRIBUTES

```javascript
/**
 * initializeFromDataAttributes() - Inicializa desde data- en HTML
 * Permite configurar el componente directamente en el markup
 * @private
 */
initializeFromDataAttributes() {
  if (this.dataset.tipo) {
    this.tipo = this.dataset.tipo;
  }
  if (this.dataset.deshabilitado !== undefined) {
    this.deshabilitado = this.dataset.deshabilitado === 'true';
  }
  if (this.dataset.icono) {
    this.setAttribute('icono', this.dataset.icono);
  }
}
```

#### HTML USAGE

```html
<!-- Opción 1: Atributos estándar -->
<componente-boton tipo="primario" deshabilitado="false">
  Botón Simple
</componente-boton>

<!-- Opción 2: Data- attributes (se sincronizan automáticamente) -->
<componente-boton data-tipo="primario" data-deshabilitado="false">
  Botón Configurado
</componente-boton>

<!-- Opción 3: JavaScript con API pública -->
<script>
  const boton = document.querySelector('componente-boton');
  
  // Acceso a getters/setters públicos
  boton.tipo = 'secundario';
  boton.deshabilitado = true;
  
  // Event listeners personalizados
  boton.addEventListener('componente-boton:click', (e) => {
    console.log('Evento:', e.detail);
  });
  
  // Limpiar manualmente si es necesario
  // boton.destroy();
</script>
```

#### COMPONENT CHECKLIST

- [ ] ✅ I have `eventListeners = []` in the constructor
- [ ] ✅ I implemented `disconnectedCallback()` and it calls `destroy()`
- [ ] ✅ I implemented a public `destroy()` method
- [ ] ✅ I register every listener in `setupEventListeners()`
- [ ] ✅ I call `initializeFromDataAttributes()` from `connectedCallback()`
- [ ] ✅ I expose public getters and setters for configuration
- [ ] ✅ I dispatch custom events (`CustomEvent`)
- [ ] ✅ I documented the public API with JSDoc
- [ ] ✅ I tested for memory leaks (DevTools → Memory)

---

## SECURITY

### XSS (CROSS-SITE SCRIPTING) PREVENTION

**Never use `innerHTML` with dynamic data:**

```javascript
/* ✗ PELIGROSO */
const usuario = { nombre: '<img src=x onerror="alert(\'XSS\')">' };
elemento.innerHTML = `<h1>${usuario.nombre}</h1>`;

/* ✓ SEGURO */
const usuario = { nombre: '<img src=x onerror="alert(\'XSS\')">' };
elemento.textContent = usuario.nombre;
```

### DATA SANITIZATION

If you need to render HTML, sanitize the data:

```javascript
/**
 * Sanitiza una cadena para evitar inyecciones XSS
 * @param {string} html - HTML a sanitizar
 * @returns {string} HTML sanitizado
 */
function sanitizarHTML(html) {
  const element = document.createElement('div');
  element.textContent = html;
  return element.innerHTML;
}
```

### EXTERNAL-DATA VALIDATION

```javascript
/**
 * Valida y filtra datos de APIs externas
 * @param {Object} datos - Datos a validar
 * @returns {Object} Datos validados
 */
function validarDatosAPI(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('Datos inválidos');
  }

  return {
    nombre: String(datos.nombre || '').trim(),
    url: validarURL(datos.url),
    descripcion: String(datos.descripcion || '').trim()
  };
}

/**
 * Valida una URL
 * @param {string} url - URL a validar
 * @returns {string} URL validada
 * @throws {Error} Si la URL no es válida
 */
function validarURL(url) {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Protocolo no permitido');
    }
    return urlObj.href;
  } catch (error) {
    throw new Error(`URL inválida: ${error.message}`);
  }
}
```

---

## MODULARIZATION PRINCIPLES

We follow the **Separation of Concerns (SoC)** principle to keep code modular and maintainable.

### APPLICATION LAYERS

```
API (Datos)
    ↓
Lógica de Negocio (Servicios)
    ↓
UI (Componentes)
    ↓
Utilidades (Helpers)
```

### EXAMPLE: DOWNLOAD MANAGER

#### 1. API LAYER: `app/src/backend/api/servicio-descarga.js`

```javascript
/**
 * Servicio para manejar descargas
 * @module ServicioDescarga
 */

/**
 * Inicia una descarga desde la API
 * @param {string} urlArchivo - URL del archivo a descargar
 * @param {string} nombreArchivo - Nombre del archivo
 * @returns {Promise<Object>} Estado de la descarga
 */
export async function iniciarDescarga(urlArchivo, nombreArchivo) {
  try {
    const respuesta = await fetch(urlArchivo, { method: 'GET' });
    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }
    return {
      exito: true,
      datos: await respuesta.blob(),
      nombreArchivo
    };
  } catch (error) {
    console.error('Error en iniciarDescarga:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}
```

#### 2. LOGIC LAYER: `app/src/ui/js/gestor-descargas.js`

```javascript
/**
 * Gestor de Descargas
 * Coordina entre la API y la UI
 * @module GestorDescargas
 */

import { iniciarDescarga } from '../../backend/api/servicio-descarga.js';
import { mostrarToastDescarga } from '../utils/helpers/descarga-toast.js';

/**
 * Descarga un archivo y lo guarda localmente
 * @param {string} urlArchivo - URL del archivo
 * @param {string} nombreArchivo - Nombre del archivo
 * @returns {Promise<void>}
 */
export async function descargarArchivo(urlArchivo, nombreArchivo) {
  mostrarToastDescarga('Iniciando descarga...', 'info');

  const resultado = await iniciarDescarga(urlArchivo, nombreArchivo);

  if (resultado.exito) {
    guardarArchivoLocal(resultado.datos, resultado.nombreArchivo);
    mostrarToastDescarga('Descarga completada', 'exito');
  } else {
    mostrarToastDescarga(`Error: ${resultado.error}`, 'error');
  }
}

/**
 * Guarda un archivo localmente
 * @private
 * @param {Blob} blob - Datos del archivo
 * @param {string} nombreArchivo - Nombre del archivo
 */
function guardarArchivoLocal(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
```

#### 3. UI LAYER: `app/src/ui/utils/components/componente-descarga/componente-descarga.js`

```javascript
/**
 * Componente de Descarga
 * @class ComponenteDescarga
 * @extends HTMLElement
 */
class ComponenteDescarga extends HTMLElement {
  static get observedAttributes() {
    return ['url', 'nombre'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const boton = this.shadowRoot.querySelector('button');
    boton?.addEventListener('click', () => this.handleDescargar());
  }

  /**
   * Maneja el evento de descarga
   * @private
   */
  async handleDescargar() {
    const { descargarArchivo } = await import('../../../js/gestor-descargas.js');
    await descargarArchivo(this.url, this.nombre);
  }

  get url() {
    return this.getAttribute('url') || '';
  }

  get nombre() {
    return this.getAttribute('nombre') || 'descarga';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <button class="componente-descarga__boton">Descargar</button>
    `;
  }
}

customElements.define('componente-descarga', ComponenteDescarga);
```

#### 4. UTILITIES: `app/src/ui/utils/helpers/descarga-toast.js`

```javascript
/**
 * Utilidad para mostrar notificaciones de descarga
 * @module DescargaToast
 */

/**
 * Muestra un toast de descarga
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo: 'info', 'exito', 'error'
 * @returns {void}
 */
export function mostrarToastDescarga(mensaje, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
```

---

## DOCUMENTATION

### JSDOC COMMENTS

All JavaScript files must include complete **JSDoc** documentation. Simple `//` comments are allowed only to remove temporary logs.

### JSDOC STRUCTURE

```javascript
/**
 * Descripción breve de la función
 * 
 * Descripción más detallada si es necesaria. Explica el propósito,
 * comportamiento especial, o consideraciones importantes.
 * 
 * @param {type} nombreParametro - Descripción del parámetro
 * @param {type} [nombreParametroOpcional] - Parámetro opcional
 * @param {type} [nombreConDefecto="valor"] - Parámetro con defecto
 * 
 * @returns {type} Descripción del valor retornado
 * 
 * @throws {Error} Descripción de cuándo se lanza el error
 * 
 * @example
 * // Uso básico
 * const resultado = funcionEjemplo('entrada');
 * console.log(resultado);
 * 
 * @see {@link ../otro-archivo.js} para funciones relacionadas
 * 
 * @deprecated Usar {@link nuevaFuncion} en su lugar
 */
function funcionEjemplo(parametro) {
  // Implementación
}
```

### FULL JSDOC EXAMPLE (preferably in English)

```javascript
/**
 * Obtiene el usuario actual del almacenamiento local
 * 
 * Carga el usuario desde localStorage y valida su estructura.
 * Si el usuario es inválido o no existe, retorna null.
 * 
 * @function obtenerUsuarioActual
 * @returns {Object|null} Objeto con propiedades del usuario o null
 * @returns {string} returns.id - ID único del usuario
 * @returns {string} returns.nombre - Nombre del usuario
 * @returns {string} returns.email - Email del usuario
 * 
 * @throws {Error} Si hay error al parsear JSON corrompido
 * 
 * @example
 * const usuario = obtenerUsuarioActual();
 * if (usuario) {
 *   console.log(`Bienvenido, ${usuario.nombre}`);
 * } else {
 *   console.log('No hay usuario autenticado');
 * }
 * 
 * @see {@link ./gestor-autenticacion.js}
 */
export function obtenerUsuarioActual() {
  try {
    const datosUsuario = localStorage.getItem('usuario');
    if (!datosUsuario) return null;

    const usuario = JSON.parse(datosUsuario);
    
    if (!usuario.id || !usuario.nombre) {
      return null;
    }

    return usuario;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
}
```

### DOCUMENTING CLASSES

```javascript
/**
 * Gestor de Estado de la Aplicación
 * 
 * Mantiene el estado central de la aplicación y notifica a los
 * suscriptores cuando hay cambios.
 * 
 * @class GestorEstado
 * 
 * @example
 * const gestor = new GestorEstado({ usuario: null });
 * 
 * gestor.subscribe('usuario', (nuevoUsuario) => {
 *   console.log('Usuario actualizado:', nuevoUsuario);
 * });
 * 
 * gestor.actualizar('usuario', { nombre: 'Juan' });
 */
export class GestorEstado {
  /**
   * Constructor del gestor de estado
   * @param {Object} estadoInicial - Estado inicial de la aplicación
   */
  constructor(estadoInicial = {}) {
    this.estado = estadoInicial;
    this.suscriptores = new Map();
  }

  /**
   * Suscribe una función a cambios en una clave del estado
   * @param {string} clave - Clave del estado a observar
   * @param {Function} callback - Función a ejecutar cuando cambie
   * @returns {Function} Función para desuscribirse
   */
  subscribe(clave, callback) {
    if (!this.suscriptores.has(clave)) {
      this.suscriptores.set(clave, []);
    }
    
    this.suscriptores.get(clave).push(callback);

    return () => {
      const callbacks = this.suscriptores.get(clave);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  /**
   * Actualiza una clave del estado y notifica suscriptores
   * @param {string} clave - Clave a actualizar
   * @param {*} valor - Nuevo valor
   * @throws {Error} Si la clave no existe en el estado
   */
  actualizar(clave, valor) {
    if (!(clave in this.estado)) {
      throw new Error(`Clave "${clave}" no existe en el estado`);
    }

    this.estado[clave] = valor;
    this.notificar(clave);
  }

  /**
   * Notifica a todos los suscriptores de una clave
   * @private
   * @param {string} clave - Clave que cambió
   */
  notificar(clave) {
    const callbacks = this.suscriptores.get(clave) || [];
    callbacks.forEach(callback => {
      try {
        callback(this.estado[clave]);
      } catch (error) {
        console.error('Error en suscriptor de estado:', error);
      }
    });
  }
}
```

### DO NOT USE `//` COMMENTS TO EXPLAIN CODE

```javascript
/* ✗ INCORRECTO */
// Obtener el usuario del estado
const usuario = estado.usuario;
// Si existe usuario
if (usuario) {
  // Mostrar su nombre
  console.log(usuario.nombre);
}

/* ✓ CORRECTO: El código debe ser auto-explicativo */
const usuario = obtenerUsuarioDelEstado();
if (usuario) {
  mostrarNombreDeUsuario(usuario.nombre);
}

/* ✓ CORRECTO: Si necesitas comentarios, usa JSDoc */
/**
 * Obtiene el usuario actual del estado global
 * @returns {Object|null}
 */
function obtenerUsuarioDelEstado() {
  return estado.usuario;
}
```

### `//` COMMENTS ONLY FOR TEMPORARY LOGS

```javascript
// TODO: Implementar validación de email
function registrarUsuario(email) {
  // console.log('Debug: email recibido', email);
  return guardarEnBaseDatos(email);
}
```

---

## CONTRIBUTION CHECKLIST

Before opening a pull request, verify the following:

### GENERAL
- [ ] I followed the defined directory structure
- [ ] All files use kebab-case
- [ ] I ran `npm run format` on my changes
- [ ] I documented every function and class with JSDoc
- [ ] I have no unnecessary `//` comments (only temporary debug-log removal comments)

### JAVASCRIPT
- [ ] My code does not contain `innerHTML`
- [ ] I validated external data before using it
- [ ] I applied SoC in my code
- [ ] Functions are small and have a single responsibility
- [ ] I used camelCase for variables and functions
- [ ] I used UPPER_SNAKE_CASE for constants
- [ ] I kept the code modular and scalable throughout

### CSS
- [ ] My CSS is split by responsibility
- [ ] I used variables from `app/src/ui/styles/variables.css` in all my styles
- [ ] My complex CSS is split into separate files using `@import`
- [ ] CSS styles use BEM and are scoped
- [ ] I have no unjustified `!important` declarations
- [ ] I have no inline HTML styles

### WEB COMPONENTS (IF APPLICABLE)
- [ ] I used Web Components for new UI components
- [ ] I implemented `destroy()` to clean up event listeners
- [ ] I implemented `disconnectedCallback()` and it calls `destroy()`
- [ ] I register all event listeners in an array for cleanup
- [ ] I implemented `initializeFromDataAttributes()`
- [ ] I have public getters and setters for the API
- [ ] I dispatch custom events (`CustomEvent`)
- [ ] The structure is `componente-nombre/` with `.js`, `.css`, and `.html`
- [ ] I documented the public API in JSDoc with examples
- [ ] I tested for memory leaks (DevTools Memory)

---

## CONTACT

If you have questions about these conventions, open an issue or contact the project maintainers.

Thank you for contributing! 🎉
