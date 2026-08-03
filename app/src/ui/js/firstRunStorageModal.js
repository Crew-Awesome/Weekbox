import { t } from "./i18n/index.js";

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
          <h2 id="first-run-storage-title">${t("storage.firstRunTitle")}</h2>
          <p>${t("storage.firstRunSummary")}</p>
          <p class="first-run-storage-path"></p>
          <div class="first-run-storage-actions">
            <button type="button" class="diagnostic-consent-confirm first-run-storage-default">${t("storage.useDefaultLocation")}</button>
            <button type="button" class="error-action first-run-storage-new">${t("storage.chooseDifferentLocation")}</button>
            <button type="button" class="error-action first-run-storage-existing">${t("storage.findExistingLibrary")}</button>
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
