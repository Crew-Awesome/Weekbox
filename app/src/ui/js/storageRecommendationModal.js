import { t } from "./i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";

export const storageRecommendationModal = {
  ensure() {
    let modal = document.getElementById("storage-recommendation-modal");
    if (modal) return modal;

    modal = document.createElement("section");
    modal.id = "storage-recommendation-modal";
    modal.className = "error-overlay storage-recommendation-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "storage-recommendation-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-hard-drive"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="storage-recommendation-title">${t("storage.moveRecommendationTitle")}</h2></div>
            <button type="button" class="error-close" aria-label="${t("storage.remindLater")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary"></p>
          <p class="storage-recommendation-path"></p>
          <footer class="error-actions">
            <button type="button" class="error-action storage-dismiss">${t("storage.dontRemind")}</button>
            <button type="button" class="error-action storage-later">${t("storage.notNow")}</button>
            <button type="button" class="error-action error-settings storage-move"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i><span>${t("storage.moveNow")}</span></button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  },

  show({ currentPath, defaultPath }) {
    const modal = this.ensure();
    modal.querySelector(".error-summary").textContent = t(
      "storage.recommendationSummary",
      { path: currentPath },
    );
    modal.querySelector(".storage-recommendation-path").textContent = t(
      "storage.recommendedPath",
      { path: defaultPath },
    );
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));

    return new Promise((resolve) => {
      let settled = false;
      const close = (choice) => {
        if (settled) return;
        settled = true;
        deactivateCheckoutDialog(modal);
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
          resolve(choice);
        }, 220);
      };
      modal.querySelector(".error-close").onclick = () => close("later");
      modal.querySelector(".storage-later").onclick = () => close("later");
      modal.querySelector(".storage-dismiss").onclick = () => close("dismiss");
      modal.querySelector(".storage-move").onclick = () => close("move");
      modal.onclick = (event) => {
        if (event.target === modal) close("later");
      };
      requestAnimationFrame(() => {
        if (settled) return;
        activateCheckoutDialog(
          modal,
          modal.querySelector(".error-content"),
          modal.querySelector(".storage-later"),
          () => close("later"),
        );
      });
    });
  },
};
