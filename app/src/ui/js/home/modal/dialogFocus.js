const checkoutDialogStates = new WeakMap();

function getCheckoutDialogFocusables(dialog) {
  return [
    ...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hidden && element.getClientRects().length > 0);
}

function activateCheckoutDialog(overlay, dialog, initialFocus, onEscape) {
  if (!overlay?.isConnected || !dialog?.isConnected || overlay.hidden) return;
  deactivateCheckoutDialog(overlay, false);
  const wasInert = overlay.inert;
  overlay.inert = false;
  const background = [...document.body.children]
    .filter((element) => element !== overlay)
    .map((element) => [element, element.inert]);
  background.forEach(([element]) => (element.inert = true));
  const onKeydown = (event) => {
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = getCheckoutDialogFocusables(dialog);
    if (!focusables.length) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const onFocusIn = (event) => {
    if (!dialog.contains(event.target) && !overlay.contains(event.target)) {
      (initialFocus || getCheckoutDialogFocusables(dialog)[0])?.focus();
    }
  };
  const onWindowFocus = () => {
    if (!dialog.contains(document.activeElement)) {
      (initialFocus || getCheckoutDialogFocusables(dialog)[0])?.focus();
    }
  };
  checkoutDialogStates.set(overlay, {
    background,
    onKeydown,
    onFocusIn,
    onWindowFocus,
    previousFocus: document.activeElement,
    wasInert,
  });
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("focusin", onFocusIn);
  window.addEventListener("focus", onWindowFocus);
  (initialFocus || getCheckoutDialogFocusables(dialog)[0])?.focus();
}

function deactivateCheckoutDialog(overlay, restoreFocus = true) {
  const state = checkoutDialogStates.get(overlay);
  if (!state) return;
  document.removeEventListener("keydown", state.onKeydown);
  document.removeEventListener("focusin", state.onFocusIn);
  window.removeEventListener("focus", state.onWindowFocus);
  state.background.forEach(([element, wasInert]) => (element.inert = wasInert));
  overlay.inert = state.wasInert;
  checkoutDialogStates.delete(overlay);
  if (restoreFocus && state.previousFocus?.isConnected)
    state.previousFocus.focus();
}

export {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
  getCheckoutDialogFocusables,
};
