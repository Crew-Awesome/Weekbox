import { FS } from "../../../backend/services/filesystem.js";
import { t } from "../i18n/index.js";
import { engineUpdateToast } from "../engines/engineUpdateToast.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";

const FOLDER_ROLE_OPTIONS = [
  ["mod", "engineManager.customMods"],
  ["addon", "engineManager.customAddons"],
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getIconMimeType(path) {
  const extension = String(path).split(".").at(-1)?.toLowerCase();
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
    }[extension] || "image/png"
  );
}

function readAsDataUrl(bytes, mimeType) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(new Blob([bytes], { type: mimeType }));
  });
}

export const customEngineModal = {
  overlay: null,
  sourcePath: "",
  metadata: null,
  existingEngineId: null,
  mode: "import",
  iconValue: "",
  allowLibrarySource: false,
  onImported: null,
  onSaved: null,

  async open({
    sourcePath = "",
    engineId = null,
    mode = "import",
    allowLibrarySource = false,
    onImported,
    onSaved,
  } = {}) {
    this.close({ restoreFocus: false });
    this.sourcePath = sourcePath;
    this.metadata = null;
    this.existingEngineId = engineId;
    this.mode = mode;
    this.iconValue = "";
    this.allowLibrarySource = allowLibrarySource;
    this.onImported = onImported;
    this.onSaved = onSaved;
    this.overlay = document.createElement("div");
    this.overlay.className = "engine-custom-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "custom-engine-title");
    document.body.appendChild(this.overlay);
    if (mode === "settings") this.renderSettings();
    else this.renderFolderStep();
    activateCheckoutDialog(
      this.overlay,
      this.overlay,
      this.overlay.querySelector(
        ".engine-custom-folder-button, .engine-custom-family-name, .engine-custom-cancel",
      ),
      () => this.close(),
    );
    requestAnimationFrame(() => this.overlay?.classList.add("show"));
    if (sourcePath) await this.inspectSource();
  },

  close({ restoreFocus = true } = {}) {
    const overlay = this.overlay;
    this.overlay = null;
    this.sourcePath = "";
    this.metadata = null;
    this.existingEngineId = null;
    this.mode = "import";
    this.iconValue = "";
    this.allowLibrarySource = false;
    this.onImported = null;
    this.onSaved = null;
    if (!overlay) return;
    deactivateCheckoutDialog(overlay, restoreFocus);
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 260);
  },

  setStatus(message) {
    const status = this.overlay?.querySelector(".engine-custom-status");
    if (status) status.textContent = message;
  },

  renderFolderStep() {
    if (!this.overlay) return;
    const selectedName = this.sourcePath
      ? this.sourcePath.split(/[\\/]/).filter(Boolean).at(-1)
      : t("engineManager.chooseEngineFolder");
    this.overlay.innerHTML = `
      <form class="engine-custom-dialog engine-custom-dialog--folder">
        <header class="engine-custom-header">
          <div>
            <h2 id="custom-engine-title">${t("engineManager.importCustomEngine")}</h2>
          </div>
        </header>
        <div class="engine-custom-body">
          <button type="button" class="engine-custom-folder-button">
            <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
            <span><strong>${escapeHtml(selectedName)}</strong>${this.sourcePath ? `<small>${escapeHtml(this.sourcePath)}</small>` : ""}</span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
          <p class="engine-custom-status" role="status"></p>
        </div>
        <footer class="engine-custom-actions">
          <button type="button" class="engine-custom-cancel">${t("common.cancel")}</button>
          <button type="submit" class="engine-custom-next" ${this.sourcePath ? "" : "disabled"}>${t("common.next")} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
        </footer>
      </form>`;
    this.overlay
      .querySelector(".engine-custom-cancel")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".engine-custom-folder-button")
      .addEventListener("click", () => this.chooseFolder());
    this.overlay.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      void this.inspectSource();
    });
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.close();
    });
  },

  async chooseFolder() {
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        t("engineManager.chooseEngineFolder"),
      );
      if (!selectedPath || !this.overlay) return;
      this.sourcePath = selectedPath;
      this.renderFolderStep();
      await this.inspectSource();
    } catch (error) {
      this.setStatus(error.message || t("engineManager.customImportFailed"));
    }
  },

  async inspectSource() {
    if (!this.sourcePath || !this.overlay) return;
    try {
      this.metadata = await FS.inspectCustomEngine(this.sourcePath);
      this.renderDetailsStep();
    } catch (error) {
      this.setStatus(error.message || t("engineManager.customImportFailed"));
    }
  },

  renderSettings() {
    if (!this.overlay || !this.existingEngineId) return;
    const engine = FS.getEngineDetails(this.existingEngineId);
    if (!engine) return;
    this.iconValue = engine.icon?.startsWith("data:") ? engine.icon : "";
    const iconSource = FS.getEngineIconSource(this.existingEngineId);
    this.overlay.innerHTML = `
      <form class="engine-custom-dialog engine-custom-dialog--settings">
        <header class="engine-custom-header">
          <h2 id="custom-engine-title">${t("engineManager.editEngineFamily")}</h2>
        </header>
        <div class="engine-custom-body">
          <div class="engine-custom-family-preview">
            <button
              type="button"
              class="engine-custom-family-preview-button"
              aria-label="${t("engineManager.chooseIcon")}"
              title="${t("engineManager.chooseIcon")}"
            >
              <img class="engine-custom-family-preview-icon" src="${escapeHtml(iconSource)}" alt="">
            </button>
            <label class="engine-custom-family-name-control">
              <input class="engine-custom-family-name" maxlength="80" value="${escapeHtml(engine.name)}" aria-label="${t("engineManager.customEngineName")}" required>
            </label>
          </div>
          <p class="engine-custom-status" role="status"></p>
        </div>
        <footer class="engine-custom-actions">
          <button type="button" class="engine-custom-cancel">${t("common.cancel")}</button>
          <button type="button" class="engine-custom-reset">${t("common.reset")}</button>
          <button type="submit" class="engine-custom-submit">${t("common.save")}</button>
        </footer>
      </form>`;
    const form = this.overlay.querySelector("form");
    this.overlay
      .querySelector(".engine-custom-cancel")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".engine-custom-family-preview-button")
      .addEventListener("click", () => void this.chooseIcon());
    this.overlay
      .querySelector(".engine-custom-reset")
      .addEventListener("click", () => {
        this.iconValue = "";
        this.updateIconPreview();
      });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.saveSettings(form);
    });
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.close();
    });
  },

  async chooseIcon() {
    try {
      const [path] = await Neutralino.os.showOpenDialog(
        t("engineManager.chooseIcon"),
        {
          multiSelections: false,
          filters: [
            {
              name: "Images",
              extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif"],
            },
          ],
        },
      );
      if (!path || !this.overlay) return;
      const bytes = await FS.api.read(path, true);
      if (bytes.byteLength > 2 * 1024 * 1024)
        throw new Error(t("engineManager.engineIconTooLarge"));
      this.iconValue = await readAsDataUrl(bytes, getIconMimeType(path));
      this.updateIconPreview();
    } catch (error) {
      this.setStatus(error.message || t("engineManager.invalidEngineIcon"));
    }
  },

  updateIconPreview() {
    const source = this.iconValue || "assets/icons/exe.png";
    this.overlay
      ?.querySelectorAll(".engine-custom-family-preview-icon")
      .forEach((image) => {
        image.src = source;
      });
  },

  async saveSettings(form) {
    const submit = form.querySelector(".engine-custom-submit");
    const name = form.querySelector(".engine-custom-family-name")?.value.trim();
    if (!name) return;
    submit.disabled = true;
    this.setStatus(t("engineManager.savingEngineFamily"));
    try {
      await FS.updateCustomEngine(this.existingEngineId, {
        name,
        icon: this.iconValue,
      });
      await this.onSaved?.();
      this.close();
    } catch (error) {
      this.setStatus(error.message || t("engineManager.customImportFailed"));
      submit.disabled = false;
    }
  },

  renderDetailsStep() {
    if (!this.overlay || !this.metadata) return;
    const currentEngine = this.existingEngineId
      ? FS.getEngineDetails(this.existingEngineId)
      : null;
    const defaultName = currentEngine?.name || this.metadata.name;
    const folders = this.metadata.contentFolders || [];
    this.overlay.innerHTML = `
      <form class="engine-custom-dialog engine-custom-dialog--details">
        <header class="engine-custom-header">
          <div>
            <h2 id="custom-engine-title">${this.existingEngineId ? t("engineManager.addCustomVersion") : t("engineManager.importCustomEngine")}</h2>
          </div>
        </header>
        <div class="engine-custom-body">
          <div class="engine-custom-fields">
            ${
              this.existingEngineId
                ? ""
                : `<label><span>${t("engineManager.customEngineFamily")}</span><select class="engine-custom-family"><option value="">${t("engineManager.customEngineFamilyCustom")}</option>${Object.entries(
                    FS.getAllEngineDetails(),
                  )
                    .filter(([id]) => id !== "executable")
                    .map(
                      ([id, details]) =>
                        `<option value="${id}">${escapeHtml(details.name)}</option>`,
                    )
                    .join("")}</select></label>`
            }
            <label class="engine-custom-name-field" ${this.existingEngineId ? "hidden" : ""}><span>${t("engineManager.customEngineName")}</span><input class="engine-custom-name" maxlength="80" value="${escapeHtml(defaultName)}" required></label>
            <label><span>${t("engineManager.customEngineVersion")}</span><input class="engine-custom-version" maxlength="80" value="${escapeHtml(this.metadata.version)}" required></label>
            <label><span>${t("engineManager.customExecutable")}</span><select class="engine-custom-executable">${(this.metadata.executables || [this.metadata.executable]).map((path) => `<option value="${escapeHtml(path)}" ${path === this.metadata.executable ? "selected" : ""}>${escapeHtml(path)}</option>`).join("")}</select></label>
          </div>
          <div class="engine-custom-content-heading"><span>${t("engineManager.customContentFolders")}</span></div>
          <div class="engine-custom-folders">
            ${folders.length ? folders.map((folder) => `<div class="engine-custom-folder-row"><label class="engine-custom-folder-toggle"><input type="checkbox" data-folder-path="${escapeHtml(folder.path)}" ${folder.enabled ? "checked" : ""}><span class="engine-custom-folder-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span><span class="engine-custom-folder-copy"><strong>${escapeHtml(folder.path)}</strong></span></label><select class="engine-custom-folder-role" data-folder-role aria-label="${escapeHtml(t("engineManager.customFolderRole"))}">${FOLDER_ROLE_OPTIONS.map(([value, label]) => `<option value="${value}" ${value === folder.type || (folder.type !== "addon" && value === "mod") ? "selected" : ""}>${t(label)}</option>`).join("")}</select></div>`).join("") : `<p class="engine-custom-empty">${t("engineManager.noContentFolders")}</p>`}
          </div>
          <p class="engine-custom-status" role="status"></p>
        </div>
        <footer class="engine-custom-actions">
          <button type="button" class="engine-custom-back"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${t("common.back")}</button>
          <button type="button" class="engine-custom-cancel">${t("common.cancel")}</button>
          <button type="submit" class="engine-custom-submit"><i class="fa-solid fa-plus" aria-hidden="true"></i> ${t("engineManager.addEngine")}</button>
        </footer>
      </form>`;
    const form = this.overlay.querySelector("form");
    this.overlay
      .querySelector(".engine-custom-cancel")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".engine-custom-back")
      .addEventListener("click", () => this.renderFolderStep());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.import(form);
    });
    const family = form.querySelector(".engine-custom-family");
    const nameInput = form.querySelector(".engine-custom-name");
    const nameField = form.querySelector(".engine-custom-name-field");
    const syncFamilyFields = () => {
      if (!family || !nameInput) return;
      const selected = family.value;
      const wasHidden = nameField?.hidden;
      nameField.hidden = Boolean(selected);
      nameInput.disabled = Boolean(selected);
      nameInput.required = !selected;
      if (selected) {
        nameInput.value =
          FS.getEngineDetails(selected)?.name || nameInput.value;
      } else if (wasHidden) {
        nameInput.value = this.metadata.name;
      }
    };
    family?.addEventListener("change", syncFamilyFields);
    syncFamilyFields();
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.close();
    });
    requestAnimationFrame(() =>
      this.overlay?.querySelector(".engine-custom-version")?.focus(),
    );
  },

  async import(form) {
    const submit = form.querySelector(".engine-custom-submit");
    const selectedFamily = form.querySelector(".engine-custom-family")?.value;
    const name =
      form.querySelector(".engine-custom-name")?.value.trim() ||
      FS.getEngineDetails(
        this.existingEngineId || selectedFamily,
      )?.name?.trim();
    const version = form.querySelector(".engine-custom-version")?.value.trim();
    const executable = form.querySelector(".engine-custom-executable")?.value;
    if (!name || !version || !executable) return;
    submit.disabled = true;
    this.setStatus(t("engineManager.importingCustomEngine"));
    try {
      const contentFolders = [
        ...form.querySelectorAll("input[data-folder-path]"),
      ].map((input) => ({
        path: input.dataset.folderPath,
        type:
          input
            .closest(".engine-custom-folder-row")
            ?.querySelector("[data-folder-role]")?.value || "mod",
        enabled: input.checked,
      }));
      const importedEngine = await FS.importCustomEngine({
        sourcePath: this.sourcePath,
        engineId:
          this.existingEngineId ||
          form.querySelector(".engine-custom-family")?.value ||
          null,
        name,
        version,
        executable,
        contentFolders,
        allowLibrarySource: this.allowLibrarySource,
      });
      const imported = await FS.importCustomEngineMods(
        importedEngine.id,
        importedEngine.version,
      );
      engineUpdateToast.info(
        importedEngine.id,
        FS.getEngineDetails(importedEngine.id)?.name || name,
        t("engineManager.importedCustomMods", { count: imported.length }),
      );
      document.dispatchEvent(new CustomEvent("mods-updated"));
      await this.onImported?.();
      this.close();
    } catch (error) {
      this.setStatus(error.message || t("engineManager.customImportFailed"));
      submit.disabled = false;
    }
  },
};
