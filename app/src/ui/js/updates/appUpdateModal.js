import { appUpdater } from "../../../backend/core/updates/app-updater.service.js";
import { t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";

const appUpdateModal = {
  ensureModal() {
    let overlay = document.getElementById("app-update-modal");
    if (overlay) return overlay;
    overlay = document.createElement("section");
    overlay.id = "app-update-modal";
    overlay.className = "error-overlay app-update-error-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "app-update-title");
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="error-content app-update-error-content" role="document">
        <div class="error-rail app-update-error-rail" aria-hidden="true"><i class="fa-solid fa-arrow-up-from-bracket"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="app-update-title">${t("updates.availableTitle")}</h2></div>
          </header>
          <p id="app-update-version" class="error-summary">${t("updates.availableDescription")}</p>
          <div id="app-update-notes" class="error-details app-update-notes" hidden></div>
          <footer class="error-actions">
            <button type="button" class="error-action app-update-now"><i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i><span>${t("updates.now")}</span></button>
          </footer>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  },

  async show(updateInfo) {
    const overlay = this.ensureModal();
    const versionLabel = overlay.querySelector("#app-update-version");
    const notesContainer = overlay.querySelector("#app-update-notes");
    const updateBtn = overlay.querySelector(".app-update-now");

    if (versionLabel && updateInfo?.latestVersion) {
      versionLabel.textContent = t("updates.versionAvailable", {
        version: updateInfo.latestVersion,
      });
    }
    if (notesContainer) {
      notesContainer.textContent = updateInfo?.releaseNotes || "";
      notesContainer.hidden = !notesContainer.textContent;
    }
    updateBtn.disabled = false;
    updateBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i><span>${t("updates.now")}</span>`;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (confirmed) => {
        if (settled) return;
        settled = true;
        deactivateCheckoutDialog(overlay);
        overlay.classList.remove("show");
        setTimeout(() => (overlay.hidden = true), 180);
        resolve(confirmed);
      };

      updateBtn.onclick = async () => {
        updateBtn.disabled = true;
        updateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>${t("updates.updating")}</span>`;
        try {
          await appUpdater.install(updateInfo);
          finish(true);
        } catch (error) {
          console.error("Failed to install app update:", error);
          updateBtn.disabled = false;
          updateBtn.innerHTML = `<i class="fa-solid fa-rotate-right" aria-hidden="true"></i><span>${t("updates.retry")}</span>`;
        }
      };

      overlay.hidden = false;
      requestAnimationFrame(() => {
        if (settled) return;
        try {
          overlay.classList.add("show");
          activateCheckoutDialog(
            overlay,
            overlay.querySelector(".app-update-error-content"),
            updateBtn,
          );
        } catch (error) {
          console.warn("Could not activate the WeekBox update prompt", error);
          finish(false);
        }
      });
    });
  },
};

export { appUpdateModal };
