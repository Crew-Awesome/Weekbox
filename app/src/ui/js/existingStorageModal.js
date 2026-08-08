import { t } from "./i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";

export const existingStorageModal = {
  show({ weekboxPath }) {
    const modal = document.createElement("section");
    modal.className = "error-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "existing-storage-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-hard-drive"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="existing-storage-title">${t("storage.chooseExistingTitle")}</h2></div>
            <button type="button" class="error-close" aria-label="${t("common.cancel")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary">${t("storage.chooseExistingSummary")}</p>
          <p class="storage-recommendation-path"></p>
          <footer class="error-actions">
            <button type="button" class="error-action existing-storage-cancel">${t("common.cancel")}</button>
            <button type="button" class="error-action existing-storage-replace"><i class="fa-solid fa-right-left" aria-hidden="true"></i><span>${t("storage.replaceCurrent")}</span></button>
            <button type="button" class="error-action error-settings existing-storage-use"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>${t("storage.useExisting")}</span></button>
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
        }, 220);
      };
      modal.querySelector(".error-close").onclick = () => close("cancel");
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
          modal.querySelector(".error-content"),
          modal.querySelector(".existing-storage-use"),
          () => close("cancel"),
        );
      });
    });
  },
};
