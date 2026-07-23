import { appUpdater } from "../../../backend/core/appUpdater.js";

export const appUpdateModal = {
  close() {
    const modal = document.getElementById("app-update-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 220);
  },

  show(update) {
    if (document.getElementById("app-update-modal")) return;

    const modal = document.createElement("section");
    modal.id = "app-update-modal";
    modal.className = "app-update-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "app-update-title");
    modal.innerHTML = `
      <div class="app-update-content">
        <div class="app-update-icon"><i class="fa-solid fa-arrow-up-right-dots" aria-hidden="true"></i></div>
        <div class="app-update-main">
          <p class="app-update-label">New version available</p>
          <h2 id="app-update-title">Update WeekBox</h2>
          <p class="app-update-copy">WeekBox <strong data-update-version></strong> is ready. The app will close, apply the update, and reopen automatically.</p>
          <p class="app-update-progress" aria-live="polite"></p>
          <div class="app-update-actions">
            <button class="app-update-manual" type="button"><i class="fa-brands fa-github" aria-hidden="true"></i> Download manually</button>
            <button class="app-update-later" type="button">Later</button>
            <button class="app-update-install" type="button"><i class="fa-solid fa-download" aria-hidden="true"></i> Install and close</button>
          </div>
        </div>
      </div>`;

    modal.querySelector("[data-update-version]").textContent =
      update.latestVersion;
    const manualUrl =
      update.releaseUrl ||
      "https://github.com/Crew-Awesome/Weekbox/releases/latest";
    const close = () => this.close();
    modal.querySelector(".app-update-later").addEventListener("click", close);
    modal.querySelector(".app-update-manual").addEventListener("click", () => {
      Neutralino.os.open(manualUrl).catch(() => {});
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    modal
      .querySelector(".app-update-install")
      .addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const progress = modal.querySelector(".app-update-progress");
        button.disabled = true;
        modal.querySelector(".app-update-later").disabled = true;
        try {
          await appUpdater.install(
            update,
            (message) => {
              progress.textContent = message;
            },
            () => {
              this.close();
              document.body.classList.remove("window-unfocused");
            },
          );
        } catch (error) {
          progress.textContent = `${error?.message || "Could not install the update."} Download it manually instead.`;
          button.disabled = false;
          modal.querySelector(".app-update-later").disabled = false;
          modal.querySelector(".app-update-manual").disabled = false;
        }
      });

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    modal.querySelector(".app-update-install").focus();
  },
};
