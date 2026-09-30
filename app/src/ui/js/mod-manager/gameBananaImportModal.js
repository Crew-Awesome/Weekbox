import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { escapeHtml } from "./modSettingsTemplates.js";

export function openGameBananaImport({ onImported } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "mod-settings-overlay local-mod-gamebanana-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "gamebanana-import-title");
  overlay.innerHTML = `
    <form class="mod-settings-modal local-mod-gamebanana-modal">
      <header class="mod-settings-header">
        <h2 id="gamebanana-import-title">${t("import.gameBananaTitle")}</h2>
        <button type="button" class="mod-settings-close" aria-label="${t("common.close")} ${t("import.gameBananaTitle")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </header>
      <div class="mod-settings-body local-mod-gamebanana-body">
        <label for="local-gamebanana-id">${t("import.gameBananaIdOrLink")}</label>
        <input id="local-gamebanana-id" required placeholder="${escapeHtml(t("import.gameBananaPlaceholder"))}">
        <p class="mod-settings-status local-mod-gamebanana-status" role="status"></p>
      </div>
      <footer class="mod-settings-footer">
        <button type="button" class="mod-settings-cancel local-mod-gamebanana-cancel">${t("common.cancel")}</button>
        <button type="submit" class="mod-settings-save"><i class="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i> ${t("import.importDetails")}</button>
      </footer>
    </form>`;
  document.body.appendChild(overlay);

  const close = () => {
    deactivateCheckoutDialog(overlay);
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 260);
  };
  const status = overlay.querySelector(".local-mod-gamebanana-status");
  overlay.querySelector(".mod-settings-close").addEventListener("click", close);
  overlay
    .querySelector(".local-mod-gamebanana-cancel")
    .addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    const value = event.currentTarget.querySelector("input").value.trim();
    const parsed = gameBananaApi.getGameBananaSubmission(value);
    const source = parsed || { type: "mod", id: Number(value) };
    if (!Number.isInteger(Number(source.id)) || Number(source.id) <= 0) {
      status.textContent = t("import.invalidGameBananaInput");
      return;
    }
    submit.disabled = true;
    status.textContent = t("import.loadingGameBanana");
    try {
      const details =
        source.type === "tool"
          ? await gameBananaApi.getToolDetails(source.id, {
              requireDownload: false,
            })
          : await gameBananaApi.getModDetails(source.id, {
              includeRequirements: false,
            });
      if (!details?.title) throw new Error(t("import.gameBananaNotFound"));
      await onImported?.({
        details,
        source: { type: source.type, id: String(source.id) },
      });
      close();
    } catch {
      status.textContent = t("import.gameBananaImportFailed");
      submit.disabled = false;
    }
  });
  activateCheckoutDialog(
    overlay,
    overlay,
    overlay.querySelector("input"),
    close,
  );
  requestAnimationFrame(() => overlay.classList.add("show"));
}
