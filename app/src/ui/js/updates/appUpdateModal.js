import { appUpdater } from "../../../backend/core/updates/app-updater.service.js";
import { t } from "../i18n/index.js";

const appUpdateModal = {
  ensureModal() {
    let overlay = document.getElementById("app-update-modal");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "app-update-modal";
    overlay.className = "dependency-review-overlay app-update-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="dependency-review-modal app-update-dialog" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
        <div class="dependency-review-heading">
          <i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>
          <div>
            <h2 id="app-update-title">${t("updates.availableTitle")}</h2>
            <p id="app-update-version">${t("updates.availableDescription")}</p>
          </div>
        </div>
        <div id="app-update-notes" class="app-update-notes"></div>
        <div class="dependency-review-actions">
          <button type="button" class="btn secondary app-update-later">${t("updates.later")}</button>
          <button type="button" class="btn primary app-update-now">${t("updates.now")}</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    return overlay;
  },

  async show(updateInfo) {
    const overlay = this.ensureModal();
    const versionLabel = overlay.querySelector("#app-update-version");
    const notesContainer = overlay.querySelector("#app-update-notes");
    const updateBtn = overlay.querySelector(".app-update-now");
    const laterBtn = overlay.querySelector(".app-update-later");

    if (versionLabel && updateInfo?.latestVersion) {
      versionLabel.textContent = t("updates.versionAvailable", {
        version: updateInfo.latestVersion,
      });
    }
    if (notesContainer && updateInfo?.releaseNotes) {
      notesContainer.innerHTML = updateInfo.releaseNotes;
    }

    return new Promise((resolve) => {
      const finish = (confirmed) => {
        overlay.classList.remove("show");
        setTimeout(() => (overlay.hidden = true), 180);
        resolve(confirmed);
      };

      laterBtn.onclick = () => finish(false);
      updateBtn.onclick = async () => {
        updateBtn.disabled = true;
        updateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("updates.updating")}`;
        try {
          await appUpdater.install(updateInfo);
          finish(true);
        } catch (error) {
          console.error("Failed to install app update:", error);
          updateBtn.disabled = false;
          updateBtn.textContent = t("updates.retry");
        }
      };

      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
    });
  },
};

export { appUpdateModal };
