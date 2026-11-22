import { FS } from "../../../backend/services/filesystem/index.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { engineUpdateService } from "../engines/engineUpdateService.js";
import { engineUpdateToast } from "../engines/engineUpdateToast.js";
import { applyDominantColor } from "../../utils/media/extract-color.util.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { sidebar } from "../sidebar.js";
import { getEngineLabel, getEngineLabelKey, i18n, t } from "../i18n/index.js";
import { errorHandler } from "../errors/errorHandler.js";
import { engineReleaseService } from "../../../backend/services/engine-release.service.js";
import { extractVersionFallback } from "../engines/utils.js";
import { customEngineModal } from "./customEngineModal.js";
import { renderDownloadPicker } from "./download-picker.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import {
  getEngineOrder,
  getEngineVersionOrder,
  getPreferredEngineVersion,
  setEngineOrder,
  setEngineVersionOrder,
  setPreferredEngineVersion,
  getEngineVersionName,
} from "../../../backend/config/engine-preferences.js";
import { createLoadingState, setButtonLoading } from "../hourglass.js";
import { setupAnimatedSortable } from "./animated-sortable.js";
import {
  configureEngineVersionActions,
  openRenameInstalledVersion,
} from "./version-actions.js";

const MODAL_OPEN_GUARD_MS = 350;

function normalizeEngineVersions(releases) {
  return releases
    .map((release) => {
      const sampleLink =
        release.win64 ||
        release.win32 ||
        release.win ||
        release.lin ||
        release.mac ||
        release.mac64 ||
        release.macarm ||
        "";
      return {
        ...release,
        version: release.version || extractVersionFallback(sampleLink),
      };
    })
    .filter((release) => release.version && release.version !== "Unknown")
    .sort((a, b) => {
      if (a.isNightly) return -1;
      if (b.isNightly) return 1;
      return String(b.version).localeCompare(String(a.version), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function getInstalledVersionLabel(engineId, version) {
  const name = getEngineVersionName(engineId, version, version);
  return name === version ? version : `${name} (${version})`;
}

function getEngineDetails(engineId) {
  return (
    FS.getEngineDetails(engineId) ||
    ENGINE_DETAILS[engineId] || {
      name: engineId,
      icon: "exe.png",
    }
  );
}

function setButtonIcon(button, iconClass) {
  const icon = button.querySelector("i") || document.createElement("i");
  icon.className = iconClass;
  if (!icon.parentNode) button.appendChild(icon);
}

function beginEngineManagerTransition(container) {
  container.classList.remove("engine-manager-body--switched");
  container.classList.add("engine-manager-body--switching");
}

function finishEngineManagerTransition(container) {
  container.classList.remove("engine-manager-body--switching");
  void container.offsetWidth;
  container.classList.add("engine-manager-body--switched");
  requestAnimationFrame(() =>
    container.classList.remove("engine-manager-body--switched"),
  );
}

export const engineManagerModal = {
  currentIndex: 0,
  resizeObserver: null,
  sortableCleanups: [],
  pickerRequestId: 0,
  loadRequestId: 0,
  isPickerOpen: false,
  openingGuardUntil: 0,
  async init() {
    if (!document.getElementById("engine-manager-modal")) {
      const tpl = document.getElementById("tpl-engine-manager");
      if (!tpl) return;
      document.body.appendChild(tpl.content.cloneNode(true));
      i18n.apply(document.getElementById("engine-manager-modal"));
      document
        .getElementById("engine-manager-close-btn")
        ?.addEventListener("click", () => this.close());
      document
        .getElementById("engine-manager-modal")
        ?.addEventListener("click", (e) => {
          if (
            e.target.id === "engine-manager-modal" &&
            performance.now() >= this.openingGuardUntil
          ) {
            this.close();
          }
        });
      networkStatus.addEventListener("change", () => {
        if (
          document
            .getElementById("engine-manager-modal")
            ?.classList.contains("show")
        ) {
          void this.loadInstalledEngines();
        }
      });
      document.addEventListener("weekbox-process-exit", () => {
        if (
          document
            .getElementById("engine-manager-modal")
            ?.classList.contains("show")
        ) {
          void this.loadInstalledEngines();
        }
      });
    }
  },
  async open(engineId = null) {
    await this.init();
    if (!FS.isInitialized) await FS.init();
    const modal = document.getElementById("engine-manager-modal");
    if (!modal) return;
    sidebar.setActive(sidebar.engineManagerBtn);
    this.openingGuardUntil = performance.now() + MODAL_OPEN_GUARD_MS;
    modal.style.display = "flex";
    activateCheckoutDialog(
      modal,
      modal.querySelector(".mod-manager-content"),
      modal.querySelector("#engine-manager-close-btn"),
      () => this.close(),
    );
    requestAnimationFrame(() => modal.classList.add("show"));
    await this.loadInstalledEngines();
    if (engineId) await this.showInstallMethodChooser(engineId, "installed");
  },
  close() {
    this.loadRequestId += 1;
    this.isPickerOpen = false;
    this.pickerRequestId += 1;
    this.clearSortableInteractions();
    const modal = document.getElementById("engine-manager-modal");
    if (!modal) return;
    sidebar.syncActive();
    deactivateCheckoutDialog(modal);
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }, 260);
  },
  clearSortableInteractions() {
    for (const cleanup of this.sortableCleanups.splice(0)) cleanup();
  },
  async loadInstalledEngines() {
    if (this.isPickerOpen) return;
    const requestId = ++this.loadRequestId;
    try {
      const engines = await FS.getInstalledEngines();
      if (requestId !== this.loadRequestId || this.isPickerOpen) return;
      const modal = document.getElementById("engine-manager-modal");
      if (!modal || modal.style.display === "none") return;
      this.render(engines);
    } catch (error) {
      if (requestId !== this.loadRequestId || this.isPickerOpen) return;
      console.error("Could not load installed engines:", error);
      errorHandler.show({
        error,
        action: "Loading installed engines",
        item: FS.enginesPath,
        storagePath: FS.weekboxPath,
      });
    }
  },
  async returnToInstalledEngines() {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;
    this.isPickerOpen = false;
    this.pickerRequestId += 1;
    beginEngineManagerTransition(container);
    await new Promise((resolve) => setTimeout(resolve, 120));
    await this.loadInstalledEngines();
    finishEngineManagerTransition(container);
  },
  async showInstallMethodChooser(engineId, returnTo = "chooser") {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container || !engineId) return;
    if (FS.isCustomEngine(engineId) && !ENGINE_DETAILS[engineId]) {
      this.isPickerOpen = false;
      this.loadRequestId += 1;
      this.pickerRequestId += 1;
      await customEngineModal.open({
        engineId,
        onImported: () => this.loadInstalledEngines(),
      });
      return;
    }
    this.isPickerOpen = true;
    this.loadRequestId += 1;
    const requestId = ++this.pickerRequestId;
    beginEngineManagerTransition(container);
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (requestId !== this.pickerRequestId) return;
    const panel = this.renderInstallMethodChooser(engineId, returnTo);
    if (!panel) return;
    finishEngineManagerTransition(container);
  },
  renderInstallMethodChooser(engineId, returnTo = "chooser") {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return null;
    const details = getEngineDetails(engineId);
    const panel = document.createElement("section");
    panel.className = "engine-download-picker engine-download-picker--method";
    const header = document.createElement("header");
    header.className = "engine-download-picker__header";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "engine-download-picker__back";
    back.title = t("common.back");
    back.setAttribute("aria-label", t("common.back"));
    back.innerHTML =
      '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
    back.addEventListener(
      "click",
      () =>
        void (returnTo === "installed"
          ? this.returnToInstalledEngines()
          : this.showDownloadPicker()),
    );
    const heading = document.createElement("div");
    heading.className = "engine-download-picker__identity";
    const icon = document.createElement("img");
    icon.src = FS.getEngineIconSource(engineId);
    icon.alt = "";
    const title = document.createElement("h3");
    title.textContent = getEngineLabel(engineId, details.name);
    heading.append(icon, title);
    header.append(back, heading);

    const grid = document.createElement("div");
    grid.className = "engine-download-picker__engine-grid";
    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.className = "engine-download-picker__engine";
    importButton.innerHTML = `<i class="engine-download-picker__method-icon fa-solid fa-folder-plus" aria-hidden="true"></i><span>${t("engineManager.addCustomVersion")}</span>`;
    importButton.addEventListener("click", () => {
      this.isPickerOpen = false;
      this.pickerRequestId += 1;
      void customEngineModal.open({
        engineId,
        onImported: () => this.loadInstalledEngines(),
      });
    });
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "engine-download-picker__engine";
    downloadButton.innerHTML = `<i class="engine-download-picker__method-icon fa-solid fa-cloud-arrow-down" aria-hidden="true"></i><span>${t("common.download")}</span>`;
    downloadButton.addEventListener(
      "click",
      () => void this.showDownloadPicker(engineId, returnTo),
    );
    grid.append(downloadButton, importButton);
    panel.append(header, grid);
    container.replaceChildren(panel);
    return panel;
  },
  async renderEngineChooser() {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;
    let installedCustomEngineIds;
    try {
      installedCustomEngineIds = new Set(
        (await FS.getInstalledEngines())
          .filter((engine) => engine.custom)
          .map((engine) => engine.id),
      );
    } catch (error) {
      if (!this.isPickerOpen || !container.isConnected) return;
      console.error("Could not prepare installed engine list:", error);
      errorHandler.show({
        error,
        action: "Preparing engine list",
        item: FS.enginesPath,
        storagePath: FS.weekboxPath,
      });
      return;
    }
    if (!this.isPickerOpen || !container.isConnected) return;
    const panel = document.createElement("section");
    panel.className = "engine-download-picker engine-download-picker--chooser";
    const header = document.createElement("header");
    header.className = "engine-download-picker__header";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "engine-download-picker__back";
    back.title = t("common.back");
    back.setAttribute("aria-label", t("common.back"));
    back.innerHTML =
      '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
    back.addEventListener("click", () => void this.returnToInstalledEngines());
    const title = document.createElement("h3");
    title.textContent = t("engines.select");
    header.append(back, title);
    const grid = document.createElement("div");
    grid.className = "engine-download-picker__engine-grid";
    Object.entries(FS.getAllEngineDetails())
      .filter(
        ([engineId, details]) =>
          engineId !== "executable" &&
          (!details.custom || installedCustomEngineIds.has(engineId)),
      )
      .forEach(([engineId, details]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "engine-download-picker__engine";
        button.dataset.engineId = engineId;
        const icon = document.createElement("img");
        icon.src = FS.getEngineIconSource(engineId);
        icon.alt = "";
        const name = document.createElement("span");
        name.textContent = getEngineLabel(engineId, details.name);
        button.append(icon, name);
        button.addEventListener(
          "click",
          () => void this.showInstallMethodChooser(engineId, "chooser"),
        );
        grid.appendChild(button);
      });
    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.className =
      "engine-download-picker__engine engine-download-picker__engine--import";
    importButton.innerHTML = `<i class="fa-solid fa-folder-plus" aria-hidden="true"></i><span>${t("engineManager.importCustomEngine")}</span>`;
    importButton.addEventListener("click", () => {
      this.isPickerOpen = false;
      this.pickerRequestId += 1;
      void customEngineModal.open({
        onImported: () => this.loadInstalledEngines(),
      });
    });
    grid.appendChild(importButton);
    panel.append(header, grid);
    container.replaceChildren(panel);
  },
  renderDownloadPicker(engineId, versions, returnTo = "chooser") {
    return renderDownloadPicker(this, engineId, versions, returnTo);
  },
  async showDownloadPicker(engineId, returnTo = "chooser") {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;
    if (engineId && FS.isCustomEngine(engineId) && !ENGINE_DETAILS[engineId]) {
      this.isPickerOpen = false;
      this.pickerRequestId += 1;
      await customEngineModal.open({
        engineId,
        onImported: () => this.loadInstalledEngines(),
      });
      return;
    }
    this.isPickerOpen = true;
    this.loadRequestId += 1;
    const requestId = ++this.pickerRequestId;
    beginEngineManagerTransition(container);
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (requestId !== this.pickerRequestId) return;
    if (!engineId) {
      await this.renderEngineChooser();
    } else {
      const panel = this.renderDownloadPicker(engineId, [], returnTo);
      const loadingList = panel?.querySelector(
        ".engine-download-picker__versions",
      );
      if (loadingList)
        loadingList.replaceChildren(
          createLoadingState(t("common.loading"), 24, "engine-list-loading"),
        );
    }
    finishEngineManagerTransition(container);
    if (!engineId) return;
    try {
      const versions = normalizeEngineVersions(
        await engineReleaseService.getVersions(engineId),
      );
      if (requestId !== this.pickerRequestId) return;
      const panel = this.renderDownloadPicker(engineId, versions, returnTo);
      if (!versions.length && panel) {
        panel.querySelector(".engine-download-picker__versions").textContent =
          t("network.noCompatibleReleases");
      }
    } catch (error) {
      if (requestId !== this.pickerRequestId) return;
      const details = getEngineDetails(engineId);
      const panel = this.renderDownloadPicker(engineId, [], returnTo);
      panel.querySelector(".engine-download-picker__versions").textContent = t(
        "network.loadVersionFailed",
        {
          name: getEngineLabel(engineId, details.name),
        },
      );
      console.warn("Could not load engine versions", error);
    }
  },
  render(engines) {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;

    this.clearSortableInteractions();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    container.replaceChildren();
    if (engines.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "engine-manager-empty-state";
      const emptyTpl = document.getElementById("tpl-engine-manager-empty");
      if (emptyTpl) {
        emptyState.appendChild(emptyTpl.content.cloneNode(true));
      } else {
        const empty = document.createElement("div");
        empty.className = "empty-mods-state";
        empty.dataset.i18n = "engineManager.noEngines";
        empty.textContent = t("engineManager.noEngines");
        emptyState.appendChild(empty);
      }
      const index = document.createElement("div");
      index.className = "em-carousel-index engine-manager-empty-index";
      const addEngineButton = document.createElement("button");
      addEngineButton.type = "button";
      addEngineButton.className = "em-index-add";
      addEngineButton.title = t("engines.select");
      addEngineButton.setAttribute("aria-label", t("engines.select"));
      addEngineButton.innerHTML =
        '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
      addEngineButton.addEventListener(
        "click",
        () => void this.showDownloadPicker(),
      );
      index.appendChild(addEngineButton);
      emptyState.appendChild(index);
      container.appendChild(emptyState);
      i18n.apply(emptyState);
      return;
    }

    const groupedEngines = {};
    engines.forEach((engine) => {
      if (!groupedEngines[engine.id]) {
        groupedEngines[engine.id] = [];
      }
      groupedEngines[engine.id].push(engine.version);
    });

    const engineOrder = getEngineOrder(Object.keys(groupedEngines));
    const sortedEngineEntries = Object.entries(groupedEngines).sort((a, b) => {
      return engineOrder.indexOf(a[0]) - engineOrder.indexOf(b[0]);
    });

    if (this.currentIndex >= sortedEngineEntries.length) {
      this.currentIndex = Math.max(0, sortedEngineEntries.length - 1);
    }

    const carouselTpl = document.getElementById("tpl-engine-manager-carousel");
    let viewport, track, btnPrev, btnNext, indexContainer;
    if (carouselTpl) {
      const fragment = carouselTpl.content.cloneNode(true);
      viewport = fragment.querySelector(".em-carousel-viewport");
      track = fragment.querySelector(".em-carousel-track");
      btnPrev = fragment.querySelector(".em-nav-btn.left");
      btnNext = fragment.querySelector(".em-nav-btn.right");
      indexContainer = fragment.querySelector(".em-carousel-index");
      container.appendChild(fragment);
    } else {
      viewport = document.createElement("div");
      viewport.className = "em-carousel-viewport";
      track = document.createElement("div");
      track.className = "em-carousel-track";
      btnPrev = document.createElement("button");
      btnPrev.className = "em-nav-btn left";
      btnPrev.type = "button";
      btnPrev.setAttribute("aria-label", t("common.previous"));
      const iconPrev = document.createElement("i");
      iconPrev.className = "fa-solid fa-chevron-left";
      btnPrev.appendChild(iconPrev);
      btnNext = document.createElement("button");
      btnNext.className = "em-nav-btn right";
      btnNext.type = "button";
      btnNext.setAttribute("aria-label", t("common.next"));
      const iconNext = document.createElement("i");
      iconNext.className = "fa-solid fa-chevron-right";
      btnNext.appendChild(iconNext);
      indexContainer = document.createElement("div");
      indexContainer.className = "em-carousel-index";
      viewport.append(track, btnPrev, btnNext);
      container.append(viewport, indexContainer);
    }

    const syncEngineOrder = () => {
      const orderedIds = [
        ...indexContainer.querySelectorAll(".em-index-icon"),
      ].map((icon) => icon.dataset.engineId);
      orderedIds.forEach((engineId) => {
        const card = [...track.children].find(
          (candidate) => candidate.dataset.engineId === engineId,
        );
        if (card) track.appendChild(card);
      });
      setEngineOrder(orderedIds);
      const activeCard = track.querySelector(".engine-column.active");
      this.currentIndex = activeCard
        ? [...track.children].indexOf(activeCard)
        : 0;
      updateCarousel();
    };

    const reorderEngines = (draggedIcon, targetIcon, before) => {
      if (!draggedIcon || !targetIcon || draggedIcon === targetIcon) return;
      if (before) indexContainer.insertBefore(draggedIcon, targetIcon);
      else indexContainer.insertBefore(draggedIcon, targetIcon.nextSibling);
      syncEngineOrder();
    };

    sortedEngineEntries.forEach(([engineId, versions]) => {
      const details = getEngineDetails(engineId);
      const displayName = getEngineLabel(engineId, details.name);
      const card = document.createElement("div");
      card.className = "engine-column";
      card.dataset.engineId = engineId;
      card.addEventListener("click", () => {
        const index = [...track.children].indexOf(card);
        if (this.currentIndex !== index) {
          this.currentIndex = index;
          updateCarousel();
        }
      });

      const headerTpl = document.getElementById("tpl-engine-column-header");
      let header;
      if (headerTpl) {
        header = headerTpl.content.firstElementChild.cloneNode(true);
        const img = header.querySelector(".engine-col-icon");
        img.src = FS.getEngineIconSource(engineId);
        img.alt = displayName;
        const nameSpan = header.querySelector(".engine-col-name");
        nameSpan.textContent = displayName;
      } else {
        header = document.createElement("div");
        header.className = "engine-column-header";
        const img = document.createElement("img");
        img.src = FS.getEngineIconSource(engineId);
        img.alt = displayName;
        img.className = "engine-col-icon";
        img.crossOrigin = "anonymous";
        img.onerror = () => {
          img.src = "assets/icons/exe.png";
        };
        const nameSpan = document.createElement("span");
        nameSpan.className = "engine-col-name";
        nameSpan.textContent = displayName;
        header.append(img, nameSpan);
      }

      const engineNameElement = header.querySelector(".engine-col-name");
      const engineLabelKey = getEngineLabelKey(engineId);
      if (engineNameElement && engineLabelKey) {
        engineNameElement.dataset.i18n = engineLabelKey;
      }
      card.appendChild(header);

      if (FS.isCustomEngine(engineId) && !ENGINE_DETAILS[engineId]) {
        const familyActions = document.createElement("div");
        familyActions.className = "engine-custom-family-actions";
        const editFamily = document.createElement("button");
        editFamily.type = "button";
        editFamily.className = "engine-custom-family-action";
        editFamily.title = t("engineManager.editEngineFamily");
        editFamily.setAttribute("aria-label", editFamily.title);
        editFamily.innerHTML =
          '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
        editFamily.addEventListener("click", (event) => {
          event.stopPropagation();
          void customEngineModal.open({
            mode: "settings",
            engineId,
            onSaved: () => this.loadInstalledEngines(),
          });
        });
        const deleteFamily = document.createElement("button");
        deleteFamily.type = "button";
        deleteFamily.className =
          "engine-custom-family-action engine-custom-family-action--delete";
        deleteFamily.title = t("engineManager.deleteEngineFamily");
        deleteFamily.setAttribute("aria-label", deleteFamily.title);
        deleteFamily.innerHTML =
          '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
        deleteFamily.addEventListener("click", async (event) => {
          event.stopPropagation();
          const choice = await Neutralino.os.showMessageBox(
            t("engineManager.deleteEngineFamily"),
            t("engineManager.deleteEngineFamilyMessage", { name: displayName }),
            "YES_NO",
            "WARNING",
          );
          if (choice !== "YES") return;
          deleteFamily.disabled = true;
          try {
            await FS.removeCustomEngine(engineId);
            await this.loadInstalledEngines();
          } catch (error) {
            deleteFamily.disabled = false;
            errorHandler.show({
              error,
              action: t("engineManager.deleteEngineFamily"),
              item: displayName,
              storagePath: FS.weekboxPath,
            });
          }
        });
        familyActions.append(editFamily, deleteFamily);
        header.appendChild(familyActions);
      }

      const imgEl = header.querySelector(".engine-col-icon");
      applyDominantColor(imgEl, card, {
        cssVar: "--engine-color",
        alpha: 0.25,
        fallback: "rgba(255, 255, 255, 0.1)",
      });

      const orderedVersions = getEngineVersionOrder(engineId, versions);
      const versionsList = document.createElement("div");
      versionsList.setAttribute("role", "list");
      versionsList.className = "engine-versions-list";
      const preferredVersion = getPreferredEngineVersion(
        engineId,
        orderedVersions,
      );
      const canonicalName = getEngineLabel(engineId, details.name);
      const saveVersionOrder = () =>
        setEngineVersionOrder(
          engineId,
          [...versionsList.querySelectorAll(".version-item")].map(
            (item) => item.dataset.version,
          ),
        );
      const setPreferredVersion = (version) => {
        setPreferredEngineVersion(engineId, version);
        versionsList
          .querySelectorAll(".version-item")
          .forEach((versionItem) => {
            const selected = versionItem.dataset.version === version;
            versionItem.classList.toggle("is-preferred", selected);
            const button = versionItem.querySelector(".engine-preferred-btn");
            if (!button) return;
            button.classList.toggle("is-preferred", selected);
            button.title = t(
              selected
                ? "engineManager.preferredVersion"
                : "engineManager.setPreferredVersion",
            );
            button.setAttribute("aria-label", button.title);
          });
      };
      orderedVersions.forEach((version) => {
        const updateDisabled = !networkStatus.online;
        const running = FS.isEngineRunning(engineId, version);
        const hasUpdate =
          (engineId === "codename" && version === "Nightly") ||
          (engineId === "psychonline" && version === "Latest");

        const itemTpl = document.getElementById("tpl-engine-version-item");
        let item;
        if (itemTpl) {
          item = itemTpl.content.firstElementChild.cloneNode(true);
          item.dataset.version = version;
          item.draggable = false;
          const versionText = item.querySelector(".version-text");
          versionText.textContent = getInstalledVersionLabel(engineId, version);
          versionText.title = `${canonicalName} · ${version}`;
          const updateBtn = item.querySelector(".engine-update-btn");
          if (!hasUpdate && updateBtn) {
            updateBtn.remove();
          } else if (updateBtn) {
            updateBtn.title = updateDisabled
              ? t("engineManager.connectToCheckUpdates")
              : t("settings.checkForUpdates");
            updateBtn.setAttribute(
              "aria-label",
              t("engineManager.checkEngineUpdates", { name: displayName }),
            );
            updateBtn.disabled = updateDisabled;
          }
          const dirBtn = item.querySelector(".engine-dir-btn");
          dirBtn.title = t("engineManager.openDirectory");
          dirBtn.setAttribute("aria-label", t("engineManager.openDirectory"));
          const deleteBtn = item.querySelector(".engine-delete-btn");
          deleteBtn.title = running
            ? t("engineManager.closeBeforeUninstall")
            : t("engineManager.uninstallVersion");
          deleteBtn.setAttribute(
            "aria-label",
            running
              ? t("engineManager.closeBeforeUninstall")
              : t("engineManager.uninstallVersion"),
          );
          deleteBtn.disabled = running;
          const renameBtn = item.querySelector(".engine-rename-btn");
          renameBtn.title = t("engineManager.renameVersion");
          renameBtn.setAttribute("aria-label", renameBtn.title);
        } else {
          item = document.createElement("div");
          item.className = "version-item";
          item.dataset.version = version;
          item.draggable = false;
          const versionText = document.createElement("span");
          versionText.className = "version-text";
          versionText.textContent = getInstalledVersionLabel(engineId, version);
          versionText.title = `${canonicalName} · ${version}`;
          const actions = document.createElement("div");
          actions.className = "version-actions";

          const launchBtn = document.createElement("button");
          launchBtn.className = "engine-action-btn engine-launch-btn";
          launchBtn.type = "button";
          launchBtn.innerHTML =
            '<i class="fa-solid fa-play" aria-hidden="true"></i>';

          if (hasUpdate) {
            const updateBtn = document.createElement("button");
            updateBtn.className = "engine-action-btn engine-update-btn";
            updateBtn.type = "button";
            updateBtn.title = updateDisabled
              ? t("engineManager.connectToCheckUpdates")
              : t("settings.checkForUpdates");
            updateBtn.setAttribute(
              "aria-label",
              t("engineManager.checkEngineUpdates", { name: displayName }),
            );
            updateBtn.disabled = updateDisabled;
            const updateIcon = document.createElement("i");
            updateIcon.className = "fa-solid fa-rotate";
            updateBtn.appendChild(updateIcon);
            actions.appendChild(updateBtn);
          }

          const dirBtn = document.createElement("button");
          dirBtn.className = "engine-action-btn engine-dir-btn";
          dirBtn.type = "button";
          dirBtn.title = t("engineManager.openDirectory");
          dirBtn.setAttribute("aria-label", t("engineManager.openDirectory"));
          const dirIcon = document.createElement("i");
          dirIcon.className = "fa-solid fa-folder-open";
          dirBtn.appendChild(dirIcon);

          const deleteBtn = document.createElement("button");
          deleteBtn.className = "engine-action-btn engine-delete-btn";
          deleteBtn.type = "button";
          deleteBtn.title = running
            ? t("engineManager.closeBeforeUninstall")
            : t("engineManager.uninstallVersion");
          deleteBtn.setAttribute(
            "aria-label",
            running
              ? t("engineManager.closeBeforeUninstall")
              : t("engineManager.uninstallVersion"),
          );
          deleteBtn.disabled = running;
          const deleteIcon = document.createElement("i");
          deleteIcon.className = "fa-solid fa-trash";
          deleteBtn.appendChild(deleteIcon);

          const renameBtn = document.createElement("button");
          renameBtn.className = "engine-action-btn engine-rename-btn";
          renameBtn.type = "button";
          renameBtn.title = t("engineManager.renameVersion");
          renameBtn.setAttribute("aria-label", renameBtn.title);
          const renameIcon = document.createElement("i");
          renameIcon.className = "fa-solid fa-pen";
          renameBtn.appendChild(renameIcon);

          const preferredBtn = document.createElement("button");
          preferredBtn.className = "engine-action-btn engine-preferred-btn";
          preferredBtn.type = "button";
          const preferredIcon = document.createElement("i");
          preferredIcon.className = "fa-solid fa-star";
          preferredIcon.setAttribute("aria-hidden", "true");
          preferredBtn.appendChild(preferredIcon);
          actions.append(launchBtn, dirBtn, renameBtn, deleteBtn, preferredBtn);
          item.append(versionText, actions);
        }

        configureEngineVersionActions({
          item,
          engineId,
          version,
          displayName,
          onProcessFinished: () => this.loadInstalledEngines(),
        });

        item.classList.toggle("is-preferred", preferredVersion === version);
        const preferredBtn = item.querySelector(".engine-preferred-btn");
        if (preferredBtn) {
          const selected = preferredVersion === version;
          preferredBtn.classList.toggle("is-preferred", selected);
          preferredBtn.title = t(
            selected
              ? "engineManager.preferredVersion"
              : "engineManager.setPreferredVersion",
          );
          preferredBtn.setAttribute("aria-label", preferredBtn.title);
          preferredBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            setPreferredVersion(version);
          });
        }

        const updateBtn = item.querySelector(".engine-update-btn");
        updateBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          updateBtn.disabled = true;
          setButtonLoading(updateBtn);
          const result = await engineUpdateService.checkEngineUpdate(
            engineId,
            version,
          );
          if (result.status === "current") {
            engineUpdateToast.info(
              engineId,
              displayName,
              t("engineManager.alreadyUpToDate"),
            );
          } else if (result.status === "skipped") {
            engineUpdateToast.info(
              engineId,
              displayName,
              t("engineManager.updateSkipped"),
            );
          } else if (result.status === "pinned") {
            engineUpdateToast.info(
              engineId,
              displayName,
              t("engineManager.versionPinned"),
            );
          } else if (result.status === "unavailable") {
            engineUpdateToast.info(
              engineId,
              displayName,
              t("engineManager.couldNotCheckUpdates"),
            );
          } else if (result.status === "running") {
            engineUpdateToast.info(
              engineId,
              displayName,
              t("engineManager.closeBeforeUpdating"),
            );
          } else if (result.status === "offline") {
            engineUpdateToast.info(
              engineId,
              displayName,
              t("engineManager.connectToCheckUpdates"),
            );
          }
          updateBtn.disabled = false;
          setButtonIcon(updateBtn, "fa-solid fa-rotate");
        });

        item
          .querySelector(".engine-dir-btn")
          ?.addEventListener("click", async (e) => {
            e.stopPropagation();
            const targetPath = FS.getEnginePath(engineId, version);
            try {
              await Neutralino.os.open(targetPath);
            } catch {}
          });

        item
          .querySelector(".engine-rename-btn")
          .addEventListener("click", (e) => {
            e.stopPropagation();
            openRenameInstalledVersion(engineId, version, () =>
              this.loadInstalledEngines(),
            );
          });

        const deleteBtn = item.querySelector(".engine-delete-btn");
        deleteBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (FS.isEngineRunning(engineId, version)) return;
          deleteBtn.disabled = true;
          setButtonLoading(deleteBtn);
          const targetPath = FS.getEnginePath(engineId, version);
          try {
            if (await FS.api.exists(targetPath)) {
              await FS.api.remove(targetPath);
              if (await FS.api.exists(targetPath)) {
                throw new Error(
                  "The engine folder could not be removed. Close the engine and try again.",
                );
              }
            }
            await this.loadInstalledEngines();
          } catch (error) {
            deleteBtn.disabled = false;
            setButtonIcon(deleteBtn, "fa-solid fa-trash");
            errorHandler.show({
              error,
              action: "Uninstall engine",
              item: displayName,
              version,
              storagePath: FS.weekboxPath,
            });
          }
        });
        versionsList.appendChild(item);
        this.sortableCleanups.push(
          setupAnimatedSortable(versionsList, item, {
            selector: ".version-item",
            onDrop: saveVersionOrder,
          }),
        );
      });
      const addVersionButton = document.createElement("button");
      addVersionButton.type = "button";
      addVersionButton.disabled = true;
      addVersionButton.className = "engine-version-add";
      addVersionButton.title = t("engines.select");
      addVersionButton.setAttribute("aria-label", t("engines.select"));
      addVersionButton.innerHTML =
        '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
      addVersionButton.addEventListener("click", (event) => {
        event.stopPropagation();
        void this.showInstallMethodChooser(engineId, "installed");
      });
      versionsList.appendChild(addVersionButton);
      card.appendChild(versionsList);
      track.appendChild(card);

      const indexIcon = document.createElement("button");
      indexIcon.type = "button";
      indexIcon.className = "em-index-icon";
      indexIcon.dataset.engineId = engineId;
      indexIcon.draggable = false;
      const indexImage = document.createElement("img");
      indexImage.src = FS.getEngineIconSource(engineId);
      indexImage.alt = "";
      indexImage.draggable = false;
      indexImage.onerror = () => (indexImage.src = "assets/icons/exe.png");
      indexIcon.appendChild(indexImage);
      indexIcon.title = displayName;
      indexIcon.setAttribute("aria-label", displayName);
      indexIcon.addEventListener("click", () => {
        this.currentIndex = [
          ...indexContainer.querySelectorAll(".em-index-icon"),
        ].indexOf(indexIcon);
        updateCarousel();
      });
      indexIcon.addEventListener("keydown", (event) => {
        const icons = [...indexContainer.querySelectorAll(".em-index-icon")];
        const iconIndex = icons.indexOf(indexIcon);
        const direction = ["ArrowLeft", "ArrowUp"].includes(event.key)
          ? -1
          : ["ArrowRight", "ArrowDown"].includes(event.key)
            ? 1
            : 0;
        const target = direction ? icons[iconIndex + direction] : null;
        if (!target) return;
        event.preventDefault();
        reorderEngines(indexIcon, target, direction < 0);
        indexIcon.focus();
      });
      indexContainer.appendChild(indexIcon);
      this.sortableCleanups.push(
        setupAnimatedSortable(indexContainer, indexIcon, {
          selector: ".em-index-icon",
          axis: "x",
          onDrop: syncEngineOrder,
        }),
      );
    });
    const addEngineButton = document.createElement("button");
    addEngineButton.type = "button";
    addEngineButton.className = "em-index-add";
    addEngineButton.title = t("engines.select");
    addEngineButton.setAttribute("aria-label", t("engines.select"));
    addEngineButton.innerHTML =
      '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
    addEngineButton.addEventListener(
      "click",
      () => void this.showDownloadPicker(),
    );
    indexContainer.appendChild(addEngineButton);

    const updateCarousel = () => {
      const vw = viewport.clientWidth;
      if (vw === 0) return;
      const cardWidth = 300;
      const gap = 30;
      const offset =
        vw / 2 - cardWidth / 2 - this.currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(${offset}px)`;
      Array.from(track.children).forEach((col, idx) => {
        const active = idx === this.currentIndex;
        col.classList.toggle("active", active);
        col
          .querySelector(".engine-version-add")
          ?.toggleAttribute("disabled", !active);
      });
      Array.from(indexContainer.querySelectorAll(".em-index-icon")).forEach(
        (icon, idx) => {
          icon.classList.toggle("active", idx === this.currentIndex);
        },
      );
      btnPrev.style.display = this.currentIndex === 0 ? "none" : "flex";
      btnNext.style.display =
        this.currentIndex === sortedEngineEntries.length - 1 ? "none" : "flex";
    };
    btnPrev.addEventListener("click", () => {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        updateCarousel();
      }
    });
    btnNext.addEventListener("click", () => {
      if (this.currentIndex < sortedEngineEntries.length - 1) {
        this.currentIndex++;
        updateCarousel();
      }
    });
    this.resizeObserver = new ResizeObserver(() => updateCarousel());
    this.resizeObserver.observe(viewport);
    requestAnimationFrame(updateCarousel);
  },
};
