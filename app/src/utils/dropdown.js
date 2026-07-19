/**
 * Configura el comportamiento estándar de un menú desplegable.
 * @param {HTMLElement} trigger - El botón que acciona el dropdown.
 * @param {HTMLElement} container - El contenedor que recibirá la clase de estado abierto.
 * @param {Object} options - Configuración adicional (clase css, elemento a ocultar, callbacks).
 * @returns {Object} Un objeto con los métodos { close, destroy }.
 */
const openDropdowns = new Set();

export function setupDropdown(trigger, container, options = {}) {
  const {
    openClass = "open",
    menuElement = null, // Si se provee, controlará la propiedad "hidden"
    onToggle = null,
  } = options;

  if (!trigger || !container) return { close: () => {}, destroy: () => {} };

  const close = () => {
    openDropdowns.delete(close);
    container.classList.remove(openClass);
    if (menuElement) menuElement.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (onToggle) onToggle(false);
  };

  const open = () => {
    [...openDropdowns].forEach((otherDropdown) => {
      if (otherDropdown !== close) otherDropdown();
    });
    openDropdowns.add(close);
    container.classList.add(openClass);
    if (menuElement) menuElement.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    if (onToggle) onToggle(true);
  };

  const toggle = () => {
    const isOpen = !container.classList.contains(openClass);
    if (isOpen) open();
    else close();
  };

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    toggle();
  };

  const handleOutsideClick = (e) => {
    if (
      !container.contains(e.target) &&
      container.classList.contains(openClass)
    ) {
      close();
    }
  };

  trigger.addEventListener("click", handleTriggerClick);
  document.addEventListener("click", handleOutsideClick);

  return {
    close,
    destroy: () => {
      close();
      trigger.removeEventListener("click", handleTriggerClick);
      document.removeEventListener("click", handleOutsideClick);
    },
  };
}
