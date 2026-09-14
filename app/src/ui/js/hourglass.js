export function createHourglass(size = 24) {
  const loader = document.createElement("l-hourglass");
  loader.className = "weekbox-hourglass";
  loader.setAttribute("size", String(size));
  loader.setAttribute("color", "currentColor");
  loader.setAttribute("speed", "1.75");
  loader.setAttribute("bg-opacity", "0.12");
  loader.setAttribute("aria-hidden", "true");
  return loader;
}

export function createLoadingState(text = "", size = 28, className = "") {
  const state = document.createElement("div");
  state.className = `weekbox-loading ${className}`.trim();
  state.setAttribute("role", "status");
  state.setAttribute("aria-live", "polite");
  state.appendChild(createHourglass(size));
  if (text)
    state.appendChild(
      Object.assign(document.createElement("span"), { textContent: text }),
    );
  return state;
}

export function setButtonLoading(button, text = "") {
  if (!button) return;
  button.replaceChildren(createHourglass(18));
  if (text)
    button.appendChild(
      Object.assign(document.createElement("span"), { textContent: text }),
    );
}
