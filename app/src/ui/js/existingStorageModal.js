import { t } from "./i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";

export const existingStorageModal = {
  show({ weekboxPath }) {
    const modal = document.createElement("section");
    modal.className = "storage-migration-choice-overlay error-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "existing-storage-title");
    modal.innerHTML = `
      <div class="storage-migration-choice-content storage-migration-panel" role="document">
        <div class="storage-migration-choice-main">
          <header class="storage-migration-header">
            <h2 id="existing-storage-title">${t("storage.chooseExistingTitle")}</h2>
            <button type="button" class="storage-migration-close" aria-label="${t("common.cancel")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="storage-migration-summary">${t("storage.chooseExistingSummary")}</p>
          <p class="storage-recommendation-path"></p>
          <p class="existing-storage-warning">${t("storage.replaceExistingWarning")}</p>
          <footer class="storage-migration-actions">
            <button type="button" class="storage-migration-button storage-migration-button-secondary existing-storage-cancel">${t("common.cancel")}</button>
            <button type="button" class="storage-migration-button storage-migration-button-primary existing-storage-use"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>${t("storage.useExisting")}</span></button>
            <button type="button" class="storage-migration-button storage-migration-button-danger existing-storage-replace"><i class="fa-solid fa-trash" aria-hidden="true"></i><span>${t("storage.replaceExisting")}</span></button>
          </footer>
        </div>
      </div>`;

    modal.querySelector(".storage-recommendation-path").textContent =
      weekboxPath;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    return new Promise((resolve) => {
      let settled = false;
      const close = (choice) => {
        if (settled) return;
        settled = true;
        deactivateCheckoutDialog(modal);
        modal.classList.remove("show");
        setTimeout(() => {
          modal.remove();
          resolve(choice);
        }, 260);
      };
      modal.querySelector(".storage-migration-close").onclick = () =>
        close("cancel");
      modal.querySelector(".existing-storage-cancel").onclick = () =>
        close("cancel");
      modal.querySelector(".existing-storage-use").onclick = () => close("use");
      modal.querySelector(".existing-storage-replace").onclick = () =>
        close("replace");
      modal.onclick = (event) => {
        if (event.target === modal) close("cancel");
      };
      requestAnimationFrame(() => {
        if (settled) return;
        activateCheckoutDialog(
          modal,
          modal.querySelector(".storage-migration-choice-content"),
          modal.querySelector(".existing-storage-use"),
          () => close("cancel"),
        );
      });
    });
  },
};
