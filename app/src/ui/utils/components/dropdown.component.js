var openDropdowns = /* @__PURE__ */ new Set();
function setupDropdown(trigger, container, options = {}) {
  const {
    openClass = "open",
    menuElement = null,
    portalHost = null,

    onToggle = null,
  } = options;
  if (!trigger || !container) return { close: () => {}, destroy: () => {} };
  const originalMenuParent = menuElement?.parentNode || null;
  const originalMenuNextSibling = menuElement?.nextSibling || null;
  let portalOpen = false;

  const positionMenu = () => {
    if (!portalOpen || !menuElement) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const width = Math.min(
      Math.max(rect.width, 190),
      Math.max(120, window.innerWidth - viewportPadding * 2),
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const below = Math.max(0, window.innerHeight - rect.bottom - viewportPadding - 8);
    const above = Math.max(0, rect.top - viewportPadding - 8);
    const openAbove = below < Math.min(menuElement.scrollHeight, 180) && above > below;
    const available = openAbove ? above : below;
    const maxHeight = Math.max(80, Math.min(260, available || 260));
    menuElement.style.position = "fixed";
    menuElement.style.left = `${left}px`;
    menuElement.style.top = openAbove
      ? `${Math.max(viewportPadding, rect.top - Math.min(menuElement.scrollHeight, maxHeight) - 8)}px`
      : `${Math.min(window.innerHeight - viewportPadding, rect.bottom + 8)}px`;
    menuElement.style.bottom = "auto";
    menuElement.style.width = `${width}px`;
    menuElement.style.maxHeight = `${maxHeight}px`;
  };
  const clearPortal = () => {
    if (!portalOpen || !menuElement) return;
    window.removeEventListener("resize", positionMenu);
    document.removeEventListener("scroll", positionMenu, true);
    menuElement.classList.remove("dropdown-portal-menu");
    menuElement.removeAttribute("style");
    if (originalMenuParent) {
      originalMenuParent.insertBefore(
        menuElement,
        originalMenuNextSibling?.parentNode === originalMenuParent
          ? originalMenuNextSibling
          : null,
      );
    }
    portalOpen = false;
  };
  const close = () => {
    openDropdowns.delete(close);
    container.classList.remove(openClass);
    if (menuElement) menuElement.hidden = true;
    clearPortal();
    trigger.setAttribute("aria-expanded", "false");
    if (onToggle) onToggle(false);
  };
  const open = () => {
    [...openDropdowns].forEach((otherDropdown) => {
      if (otherDropdown !== close) otherDropdown();
    });
    openDropdowns.add(close);
    container.classList.add(openClass);
    if (menuElement) {
      menuElement.hidden = false;
      if (portalHost && originalMenuParent && menuElement.parentNode !== portalHost) {
        portalHost.appendChild(menuElement);
        menuElement.classList.add("dropdown-portal-menu");
        portalOpen = true;
        positionMenu();
        window.addEventListener("resize", positionMenu);
        document.addEventListener("scroll", positionMenu, true);
      }
    }
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
    if (["ArrowDown", "ArrowUp"].includes(e.key) && !container.classList.contains(openClass)) {
      e.preventDefault();
      open();
      const items = menuElement?.querySelectorAll("[role='option'], button:not(:disabled), [tabindex]:not([tabindex='-1'])");
      (e.key === "ArrowUp" ? items?.[items.length - 1] : items?.[0])?.focus();
    }
  };
  const handleMenuKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      trigger.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = [...(menuElement?.querySelectorAll("[role='option'], button:not(:disabled), [tabindex]:not([tabindex='-1'])") || [])]
      .filter((item) => !item.hidden && item.getAttribute("aria-hidden") !== "true");
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);
    const nextIndex = e.key === "Home"
      ? 0
      : e.key === "End"
        ? items.length - 1
        : (currentIndex + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    e.preventDefault();
    items[nextIndex]?.focus();
  };
  const handleOutsideClick = (e) => {
    if (
      !container.contains(e.target) &&
      !menuElement?.contains(e.target) &&
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
