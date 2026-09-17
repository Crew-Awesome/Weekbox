var openDropdowns = /* @__PURE__ */ new Set();
function setupDropdown(trigger, container, options = {}) {
  const {
    openClass = "open",
    menuElement = null,

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
  const handleTriggerKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown" && !container.classList.contains(openClass)) {
      e.preventDefault();
      open();
      menuElement?.querySelector("button, [role='option'], [tabindex]")?.focus();
    }
  };
  const handleMenuKeydown = (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
    trigger.focus();
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
  trigger.addEventListener("keydown", handleTriggerKeydown);
  menuElement?.addEventListener("keydown", handleMenuKeydown);
  document.addEventListener("click", handleOutsideClick);
  return {
    close,
    destroy: () => {
      close();
      trigger.removeEventListener("click", handleTriggerClick);
      trigger.removeEventListener("keydown", handleTriggerKeydown);
      menuElement?.removeEventListener("keydown", handleMenuKeydown);
      document.removeEventListener("click", handleOutsideClick);
    },
  };
}

export { setupDropdown };
