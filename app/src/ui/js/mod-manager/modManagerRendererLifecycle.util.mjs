export function prepareModManagerRenderer(modal, preserveOtherView) {
  if (modal.activeView === "dependencies") {
    modal.dependenciesRenderer?.destroy();
    modal.dependenciesRenderer = null;
    if (preserveOtherView) {
      modal.gridRenderer?.setActive(false);
    } else {
      modal.gridRenderer?.destroy();
      modal.gridRenderer = null;
    }
    return;
  }

  modal.gridRenderer?.destroy();
  modal.gridRenderer = null;
  if (preserveOtherView) {
    modal.dependenciesRenderer?.setActive(false);
  } else {
    modal.dependenciesRenderer?.destroy();
    modal.dependenciesRenderer = null;
  }
}

export function disposeStaleRenderer(renderer, root = renderer?.root) {
  renderer?.destroy();
  root?.remove();
}
