var selectedEngine = null;
function setSelectedEngine(engine) {
  selectedEngine = engine;
}

function getSelectedEngine() {
  return selectedEngine;
}

export { selectedEngine, setSelectedEngine, getSelectedEngine };
