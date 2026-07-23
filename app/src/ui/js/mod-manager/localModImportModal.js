import { ENGINE_DETAILS } from "../../../backend/config/engines.js";
import { gameBananaApi } from "../../../backend/api/gamebanana.js";
import { FS } from "../../../utils/filesystem.js";

function folderName(path) {
  return (
    String(path || "")
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || "Local mod"
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
        "Choose the mod folder",
      );
      if (!selectedPath || !this.overlay) return;
      this.sourcePath = selectedPath;
      this.renderFolderStep();
    } catch (error) {
      this.setStatus("Could not open the folder picker.");
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
          <div><h2 id="local-mod-import-title">Import local mod</h2><p>Step 1 of 2 · Choose the mod folder</p></div>
          <button class="local-mod-import-close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="local-mod-import-body">
          <button class="local-mod-import-folder" type="button" title="Choose mod folder"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span><strong>${this.sourcePath ? folderName(this.sourcePath) : "Choose a folder"}</strong><span>${this.sourcePath || "Click to select the folder containing the mod files."}</span></span></button>
          <p class="local-mod-import-status" role="status"></p>
        </div>
        <footer class="local-mod-import-footer"><button class="local-mod-import-cancel" type="button">Cancel</button><button class="local-mod-import-next" type="button" ${this.sourcePath ? "" : "disabled"}>Next <i class="fa-solid fa-arrow-right"></i></button></footer>
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
      .map(([id, engine]) => `<option value="${id}">${engine.name}</option>`)
      .join("");
    this.overlay.innerHTML = `
      <section class="local-mod-import-modal local-mod-import-modal--details" aria-labelledby="local-mod-import-title">
        <header class="local-mod-import-header">
          <div><h2 id="local-mod-import-title">Import local mod</h2><p>Step 2 of 2 · Add its details</p></div>
          <button class="local-mod-import-close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <form class="local-mod-import-form">
          <div class="local-mod-import-body">
            <div class="local-mod-import-details-top">
              <label class="local-mod-import-cover-picker"><input class="local-mod-import-cover-file" type="file" accept="image/*" hidden><img class="local-mod-import-cover" src="assets/icons/launcher-icon.png" alt="Mod cover"><span><i class="fa-solid fa-image"></i> Change image</span></label>
              <input class="local-mod-import-name" aria-label="Mod name" required maxlength="120">
            </div>
            <div class="local-mod-import-fields"><label>Engine<select class="local-mod-import-engine"><option value="">Unassigned</option>${engineOptions}</select></label><label>Version<select class="local-mod-import-version"><option value="">Any version</option></select></label></div>
            <p class="local-mod-import-status" role="status"></p>
          </div>
          <footer class="local-mod-import-footer"><button class="local-mod-import-back" type="button"><i class="fa-solid fa-arrow-left"></i> Back</button><button class="local-mod-import-gamebanana" type="button"><i class="fa-solid fa-cloud-arrow-down"></i> Import from GameBanana</button><button class="local-mod-import-submit" type="submit"><i class="fa-solid fa-plus"></i> Add mod</button></footer>
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
        '<option value="">Any version</option>',
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
        <header><h2 id="gamebanana-import-title">Import from GameBanana</h2><button type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></header>
        <form><div class="local-mod-gamebanana-body"><input aria-label="GameBanana mod ID or link" required autofocus placeholder="608074 or gamebanana.com/mods/608074"><p class="local-mod-gamebanana-status" role="status"></p></div><footer><button class="local-mod-gamebanana-cancel" type="button">Cancel</button><button type="submit">Import details</button></footer></form>
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
        status.textContent = "Enter a GameBanana mod ID or mod link.";
        return;
      }
      submit.disabled = true;
      status.textContent = "Loading GameBanana details…";
      try {
        const details = await gameBananaApi.getModDetails(modId, {
          includeRequirements: false,
        });
        if (!details?.title)
          throw new Error("That GameBanana mod was not found.");
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
        status.textContent =
          error.message || "Could not import GameBanana details.";
        submit.disabled = false;
      }
    });
  },

  async import(event, { nameInput, engineSelect, versionSelect }) {
    event.preventDefault();
    const submit = this.overlay?.querySelector(".local-mod-import-submit");
    if (!submit) return;
    submit.disabled = true;
    this.setStatus("Copying mod files…");
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
      this.setStatus(error.message || "Could not import that folder.");
      submit.disabled = false;
    }
  },
};
