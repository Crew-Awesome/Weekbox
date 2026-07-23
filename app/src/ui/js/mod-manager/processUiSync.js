const ownerListeners = new WeakMap();

export function replaceProcessExitListener(
  owner,
  listener,
  eventTarget = document,
) {
  if (!owner) return () => {};
  const previous = ownerListeners.get(owner);
  if (previous) {
    previous.eventTarget.removeEventListener(
      "weekbox-process-exit",
      previous.listener,
    );
    previous.eventTarget.removeEventListener(
      "weekbox-process-change",
      previous.listener,
    );
  }
  eventTarget.addEventListener("weekbox-process-exit", listener);
  eventTarget.addEventListener("weekbox-process-change", listener);
  ownerListeners.set(owner, { eventTarget, listener });
  return () => {
    const current = ownerListeners.get(owner);
    if (current?.listener !== listener) return;
    eventTarget.removeEventListener("weekbox-process-exit", listener);
    eventTarget.removeEventListener("weekbox-process-change", listener);
    ownerListeners.delete(owner);
  };
}

export function syncLaunchButton(button, state, templates) {
  const isRunning = state === "running";
  const canSwitchMod = state === "switch";
  button.classList.toggle("is-running", isRunning);
  button.classList.toggle("is-switchable", canSwitchMod);
  button.setAttribute(
    "aria-label",
    `${isRunning ? "Close" : canSwitchMod ? "Switch Mod" : button.dataset.launchLabel} ${button.dataset.modName}`,
  );
  button.innerHTML = isRunning
    ? templates.launchButtonRunning()
    : canSwitchMod
      ? templates.launchButtonSwitch()
      : templates.launchButtonDefault(button.dataset.launchLabel);
}
