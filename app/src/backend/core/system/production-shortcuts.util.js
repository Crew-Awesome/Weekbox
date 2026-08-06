import { t } from "../../../ui/js/i18n/index.js";

function isDevelopmentRun() {
  const args = window.NL_ARGS;
  const joinedArgs = Array.isArray(args) ? args.join(" ") : String(args || "");
  return joinedArgs.includes("--neu-dev-auto-reload");
}

let contextMenu;
let contextTarget;

function isEditable(element) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element?.isContentEditable
  );
}

function selectedText(element = contextTarget) {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.value.slice(
      element.selectionStart || 0,
      element.selectionEnd || 0,
    );
  }
  return window.getSelection()?.toString() || "";
}

async function clipboardWrite(value) {
  try {
    await Neutralino.clipboard.writeText(value);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }
}

async function clipboardRead() {
  try {
    return await Neutralino.clipboard.readText();
  } catch {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  }
}

function createContextMenu() {
  if (contextMenu) return contextMenu;
  contextMenu = document.createElement("div");
  contextMenu.className = "weekbox-context-menu";
  contextMenu.setAttribute("role", "menu");
  contextMenu.hidden = true;
  contextMenu.innerHTML = `
    <button type="button" role="menuitem" data-action="copy"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>${t("common.copy")}</span></button>
    <button type="button" role="menuitem" data-action="paste"><i class="fa-regular fa-clipboard" aria-hidden="true"></i><span>${t("common.paste")}</span></button>`;
  contextMenu.addEventListener("click", async (event) => {
    const action = event.target.closest("button")?.dataset.action;
    if (!action) return;
    if (action === "copy") await clipboardWrite(selectedText());
    if (action === "paste") {
      const value = await clipboardRead();
      if (value && isEditable(contextTarget)) {
        if (
          contextTarget instanceof HTMLInputElement ||
          contextTarget instanceof HTMLTextAreaElement
        ) {
          contextTarget.setRangeText(
            value,
            contextTarget.selectionStart || 0,
            contextTarget.selectionEnd || 0,
            "end",
          );
          contextTarget.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          document.execCommand("insertText", false, value);
        }
      }
    }
    hideContextMenu();
  });
  document.body.appendChild(contextMenu);
  return contextMenu;
}

function hideContextMenu() {
  if (!contextMenu) return;
  contextMenu.classList.remove("is-open");
  setTimeout(() => {
    if (contextMenu) contextMenu.hidden = true;
  }, 120);
}

function showContextMenu(event) {
  event.preventDefault();
  contextTarget = event.target;
  const menu = createContextMenu();
  menu.querySelector('[data-action="copy"] span').textContent =
    t("common.copy");
  menu.querySelector('[data-action="paste"] span').textContent =
    t("common.paste");
  const copy = menu.querySelector('[data-action="copy"]');
  const paste = menu.querySelector('[data-action="paste"]');
  copy.disabled = !selectedText();
  paste.disabled = !isEditable(contextTarget);
  menu.hidden = false;
  menu.style.left = `${Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 8)}px`;
  requestAnimationFrame(() => menu.classList.add("is-open"));
}

function disableProductionRefreshShortcuts() {
  document.addEventListener("contextmenu", showContextMenu);
  document.addEventListener("click", hideContextMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideContextMenu();
  });
  window.addEventListener("blur", hideContextMenu);
  if (isDevelopmentRun()) return;
  window.addEventListener("keydown", (event) => {
    const isRefresh =
      event.key === "F5" ||
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");
    if (isRefresh) event.preventDefault();
  });
}

export { disableProductionRefreshShortcuts };
