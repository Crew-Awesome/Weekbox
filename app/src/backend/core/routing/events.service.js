function emitViewChange(view) {
  appEvents.dispatchEvent(new CustomEvent("view:loaded", { detail: view }));
}
var appEvents;

appEvents = new EventTarget();

export { emitViewChange, appEvents };
