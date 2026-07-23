export const firstRunStorageModal = {
  show(defaultPath) {
    const modal = document.createElement("section");
    modal.className = "diagnostic-consent-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "first-run-storage-title");
    modal.innerHTML = `
      <div class="diagnostic-consent-panel">
        <div class="diagnostic-consent-icon" aria-hidden="true"><i class="fa-solid fa-folder-tree"></i></div>
        <div class="diagnostic-consent-main">
          <h2 id="first-run-storage-title">Where should WeekBox save its files?</h2>
          <p>WeekBox keeps your mods, engines, and settings together in one library folder.</p>
          <p class="first-run-storage-path"></p>
          <div class="first-run-storage-actions">
            <button type="button" class="diagnostic-consent-confirm first-run-storage-default">Use default location</button>
            <button type="button" class="error-action first-run-storage-new">Choose a different location</button>
            <button type="button" class="error-action first-run-storage-existing">Find an existing WeekBox library</button>
          </div>
        </div>
      </div>`;
    modal.querySelector(".first-run-storage-path").textContent = defaultPath;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    return new Promise((resolve) => {
      const finish = (choice) => {
        modal.remove();
        resolve(choice);
      };
      modal.querySelector(".first-run-storage-default").onclick = () =>
        finish("default");
      modal.querySelector(".first-run-storage-new").onclick = () =>
        finish("new");
      modal.querySelector(".first-run-storage-existing").onclick = () =>
        finish("existing");
      modal.querySelector(".first-run-storage-default").focus();
    });
  },
};
