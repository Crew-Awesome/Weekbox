import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { FS } from "../../../backend/services/filesystem.js";
import { getEngineLabel, t } from "../i18n/index.js";

function folderName(path) {
  return (
    String(path || "")
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || t("import.localMod")
  );
}

export const localModImportModal = {
  overlay: null,
  sourcePath: "",
  installedEngines: [],
  pendingCoverDataUrl: null,
  pendingCoverUrl: null,

  async open({ onImported } = {}) {
    this.close();
    this.sourcePath = "";
    this.pendingCoverDataUrl = null;
    this.pendingCoverUrl = null;
    this.installedEngines = await FS.getInstalledEngines();
    this.onImported = onImported;
    this.overlay = document.createElement("div");
    this.overlay.className = "local-mod-import-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    document.body.appendChild(this.overlay);
    this.renderFolderStep();
    requestAnimationFrame(() => this.overlay?.classList.add("show"));
  },

  close() {
    if (!this.overlay) return;
    const overlay = this.overlay;
    this.overlay = null;
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 180);
  },

  async chooseFolder() {
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        t("import.chooseModFolder"),
      );
      if (!selectedPath || !this.overlay) return;
      this.sourcePath = selectedPath;
      this.renderFolderStep();
    } catch (error) {
      this.setStatus(t("import.folderPickerFailed"));
    }
  },

  setStatus(message) {
    const status = this.overlay?.querySelector(".local-mod-import-status");
    if (status) status.textContent = message;
  },

  renderFolderStep() {
    if (!this.overlay) return;
    this.overlay.innerHTML = `
      <section class="local-mod-import-modal local-mod-import-modal--folder" aria-labelledby="local-mod-import-title">
        <header class="local-mod-import-header">
          <div><h2 id="local-mod-import-title">${t("import.title")}</h2><p>${t("import.stepOne")}</p></div>
          <button class="local-mod-import-close" type="button" aria-label="${t("common.close")}"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="local-mod-import-body">
          <button class="local-mod-import-folder" type="button" title="${t("import.chooseModFolder")}"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span><strong>${this.sourcePath ? folderName(this.sourcePath) : t("import.chooseFolder")}</strong><span>${this.sourcePath || t("import.chooseFolderDescription")}</span></span></button>
          <p class="local-mod-import-status" role="status"></p>
        </div>
        <footer class="local-mod-import-footer"><button class="local-mod-import-cancel" type="button">${t("common.cancel")}</button><button class="local-mod-import-next" type="button" ${this.sourcePath ? "" : "disabled"}>${t("common.next")} <i class="fa-solid fa-arrow-right"></i></button></footer>
      </section>`;
    this.overlay.querySelector(".local-mod-import-header p")?.remove();
    this.overlay
      .querySelector(".local-mod-import-close")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".local-mod-import-cancel")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".local-mod-import-folder")
      .addEventListener("click", () => this.chooseFolder());
    this.overlay
      .querySelector(".local-mod-import-next")
      .addEventListener("click", () => this.renderDetailsStep());
    this.overlay.onclick = (event) => {
      if (event.target === this.overlay) this.close();
    };
  },

  renderDetailsStep() {
    if (!this.overlay) return;
    const engineOptions = Object.entries(ENGINE_DETAILS)
      .filter(([id]) => id !== "executable")
      .map(
        ([id, engine]) =>
          `<option value="${id}">${getEngineLabel(id, engine.name)}</option>`,
      )
      .join("");
    this.overlay.innerHTML = `
      <section class="local-mod-import-modal local-mod-import-modal--details" aria-labelledby="local-mod-import-title">
        <header class="local-mod-import-header">
          <div><h2 id="local-mod-import-title">${t("import.title")}</h2><p>${t("import.stepTwo")}</p></div>
          <button class="local-mod-import-close" type="button" aria-label="${t("common.close")}"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <form class="local-mod-import-form">
          <div class="local-mod-import-body">
            <div class="local-mod-import-details-top">
              <label class="local-mod-import-cover-picker"><input class="local-mod-import-cover-file" type="file" accept="image/*" hidden><img class="local-mod-import-cover" src="assets/icons/launcher-icon.png" alt="${t("common.modCover")}"><span><i class="fa-solid fa-image"></i> ${t("import.changeImage")}</span></label>
              <input class="local-mod-import-name" aria-label="${t("import.modName")}" required maxlength="120">
            </div>
            <div class="local-mod-import-fields"><label>${t("common.engine")}<select class="local-mod-import-engine"><option value="">${t("import.unassigned")}</option>${engineOptions}</select></label><label>${t("common.version")}<select class="local-mod-import-version"><option value="">${t("import.anyVersion")}</option></select></label></div>
            <p class="local-mod-import-status" role="status"></p>
          </div>
          <footer class="local-mod-import-footer"><button class="local-mod-import-back" type="button"><i class="fa-solid fa-arrow-left"></i> ${t("common.back")}</button><button class="local-mod-import-gamebanana" type="button"><i class="fa-solid fa-cloud-arrow-down"></i> ${t("import.importGameBanana")}</button><button class="local-mod-import-submit" type="submit"><i class="fa-solid fa-plus"></i> ${t("import.addMod")}</button></footer>
        </form>
      </section>`;
    this.overlay.querySelector(".local-mod-import-header p")?.remove();
    const nameInput = this.overlay.querySelector(".local-mod-import-name");
    const engineSelect = this.overlay.querySelector(".local-mod-import-engine");
    const versionSelect = this.overlay.querySelector(
      ".local-mod-import-version",
    );
    const coverImage = this.overlay.querySelector(".local-mod-import-cover");
    nameInput.value = folderName(this.sourcePath);
    const updateVersions = () => {
      const versions = this.installedEngines
        .filter((engine) => engine.id === engineSelect.value)
        .map((engine) => engine.version);
      versionSelect.innerHTML = [
        `<option value="">${t("import.anyVersion")}</option>`,
        ...versions.map(
          (version) => `<option value="${version}">${version}</option>`,
        ),
      ].join("");
      versionSelect.disabled = !engineSelect.value;
    };
    updateVersions();
    engineSelect.addEventListener("change", updateVersions);
    this.overlay
      .querySelector(".local-mod-import-cover-file")
      .addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          this.pendingCoverDataUrl = String(reader.result || "");
          this.pendingCoverUrl = null;
          coverImage.src = this.pendingCoverDataUrl;
        });
        reader.readAsDataURL(file);
      });
    this.overlay
      .querySelector(".local-mod-import-close")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".local-mod-import-back")
      .addEventListener("click", () => this.renderFolderStep());
    this.overlay
      .querySelector(".local-mod-import-gamebanana")
      .addEventListener("click", () =>
        this.openGameBananaImport({
          nameInput,
          engineSelect,
          versionSelect,
          coverImage,
          updateVersions,
        }),
      );
    this.overlay
      .querySelector(".local-mod-import-form")
      .addEventListener("submit", (event) =>
        this.import(event, { nameInput, engineSelect, versionSelect }),
      );
    this.overlay.onclick = (event) => {
      if (event.target === this.overlay) this.close();
    };
  },

  openGameBananaImport({
    nameInput,
    engineSelect,
    versionSelect,
    coverImage,
    updateVersions,
  }) {
    const overlay = document.createElement("div");
    overlay.className = "local-mod-gamebanana-overlay";
    overlay.innerHTML = `
      <section class="local-mod-gamebanana-modal" role="dialog" aria-modal="true" aria-labelledby="gamebanana-import-title">
        <header><h2 id="gamebanana-import-title">${t("import.gameBananaTitle")}</h2><button type="button" aria-label="${t("common.close")}"><i class="fa-solid fa-xmark"></i></button></header>
        <form><div class="local-mod-gamebanana-body"><input aria-label="${t("import.gameBananaIdOrLink")}" required autofocus placeholder="${t("import.gameBananaPlaceholder")}"><p class="local-mod-gamebanana-status" role="status"></p></div><footer><button class="local-mod-gamebanana-cancel" type="button">${t("common.cancel")}</button><button type="submit">${t("import.importDetails")}</button></footer></form>
      </section>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    const close = () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 180);
    };
    const status = overlay.querySelector(".local-mod-gamebanana-status");
    overlay.querySelector("header button").addEventListener("click", close);
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
      const modId = parsed?.type === "mod" ? parsed.id : Number(value);
      if (!Number.isInteger(modId) || modId <= 0) {
        status.textContent = t("import.invalidGameBananaInput");
        return;
      }
      submit.disabled = true;
      status.textContent = t("import.loadingGameBanana");
      try {
        const details = await gameBananaApi.getModDetails(modId, {
          includeRequirements: false,
        });
        if (!details?.title) throw new Error(t("import.gameBananaNotFound"));
        nameInput.value = details.title;
        engineSelect.value = details.engineId || "";
        updateVersions();
        versionSelect.value = "";
        this.pendingCoverDataUrl = null;
        this.pendingCoverUrl = details.images?.[0] || null;
        coverImage.src =
          this.pendingCoverUrl || "assets/icons/launcher-icon.png";
        close();
      } catch (error) {
        status.textContent = t("import.gameBananaImportFailed");
        submit.disabled = false;
      }
    });
  },

  async import(event, { nameInput, engineSelect, versionSelect }) {
    event.preventDefault();
    const submit = this.overlay?.querySelector(".local-mod-import-submit");
    if (!submit) return;
    submit.disabled = true;
    this.setStatus(t("import.copyingFiles"));
    try {
      await FS.importLocalMod({
        sourcePath: this.sourcePath,
        name: nameInput.value.trim(),
        engineId: engineSelect.value,
        engineVersion: versionSelect.value,
        coverDataUrl: this.pendingCoverDataUrl,
        coverUrl: this.pendingCoverUrl?.startsWith("http")
          ? this.pendingCoverUrl
          : null,
      });
      await this.onImported?.();
      this.close();
    } catch (error) {
      this.setStatus(t("import.folderImportFailed"));
      submit.disabled = false;
    }
  },
};
