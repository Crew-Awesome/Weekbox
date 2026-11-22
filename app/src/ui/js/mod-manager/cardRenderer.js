import { FS } from "../../../backend/services/filesystem/index.js";
import { toastSystem } from "../toasts/toastSystem.js";
import { modCatalogService } from "../../../backend/services/mod-catalog.service.js";
import { getEngineLaunchBehavior } from "../../../backend/config/engines.config.js";
import { applyDominantColor } from "../../utils/media/extract-color.util.js";
import { engineUpdateModal } from "../engines/engineUpdateModal.js";
import { modManagerTemplates } from "./templates.js";
import { createHourglass } from "../hourglass.js";
import { loadModCardImage, releaseModCardImage } from "./modImageLoader.js";
import { modSettingsModal } from "./modSettingsModal.js";
import {
  replaceProcessExitListener,
  syncLaunchButton,
} from "./processUiSync.js";
import { getEngineLabel, i18n, t } from "../i18n/index.js";
import { getPreferredEngineVersion } from "../../../backend/config/engine-preferences.js";
import {
  createVirtualGridMetrics,
  getVirtualGridRange,
} from "./virtualGrid.util.mjs";

const MAX_MEASURED_GRID_ROWS = 512;

function formatVersionLabel(version) {
  if (!version) return "v 0.0.1";
  const clean = String(version).trim();
  if (/^v\s+/i.test(clean)) return clean;
  if (/^v/i.test(clean)) return `v ${clean.slice(1).trim()}`;
  return `v ${clean}`;
}

function getColumnCount(grid) {
  if (grid.classList.contains("list-view")) return 1;
  const columns = getComputedStyle(grid).gridTemplateColumns;
  return Math.max(1, columns.split(" ").filter(Boolean).length);
}

function createSpacer(className) {
  const spacer = document.createElement("div");
  spacer.className = className;
  spacer.setAttribute("aria-hidden", "true");
  return spacer;
}

function syncGridChildren(grid, nodes) {
  const retained = new Set(nodes);
  for (let index = grid.children.length - 1; index >= 0; index -= 1) {
    const child = grid.children[index];
    if (!retained.has(child)) {
      if (child.matches?.(".mod-manager-card")) releaseModCardImage(child);
      child.remove();
    }
  }
  if (typeof grid.moveBefore !== "function") {
    grid.replaceChildren(...nodes);
    return;
  }
  let reference = grid.firstElementChild;
  for (const node of nodes) {
    if (node === reference) {
      reference = reference.nextElementSibling;
    } else if (node.parentElement === grid) {
      grid.moveBefore(node, reference);
    } else {
      grid.insertBefore(node, reference);
    }
  }
}

function getCardEngineContext(mod, standaloneModIds, enginesById) {
  const isExecutable =
    standaloneModIds.has(String(mod.id)) || mod.engineId === "executable";
  const hasEngine = Boolean(
    !isExecutable &&
    mod.engineId &&
    mod.engineId !== "executable" &&
    FS.getEngineDetails(mod.engineId),
  );
  const engine = hasEngine
    ? (() => {
        const versions = enginesById.get(mod.engineId) || [];
        const versionNumbers = versions.map((item) => item.version);
        const version =
          mod.engineVersion ||
          getPreferredEngineVersion(mod.engineId, versionNumbers);
        return versions.find((item) => item.version === version);
      })()
    : null;
  let engineBadgeHtml = modManagerTemplates.unassignedBadge();
  if (!isExecutable && (mod.engineLocked || hasEngine)) {
    const engineId = mod.engineLocked ? "psychonline" : mod.engineId;
    const engineInfo = FS.getEngineDetails(engineId);
    engineBadgeHtml = modManagerTemplates.engineBadge(
      formatVersionLabel(mod.engineVersion || engine?.version),
      engineInfo.icon,
    );
  } else if (isExecutable) {
    engineBadgeHtml = modManagerTemplates.executableBadge();
  }
  return { isExecutable, hasEngine, engine, engineBadgeHtml };
}

function createModManagerCard(mod, standaloneModIds, enginesById) {
  const context = getCardEngineContext(mod, standaloneModIds, enginesById);
  const { isExecutable, hasEngine, engine, engineBadgeHtml } = context;
  const isUnassigned = !isExecutable && !hasEngine;
  const eyeIcon = mod.hidden ? "fa-eye-slash" : "fa-eye";
  const card = document.createElement("div");
  card.className = "mod-manager-card";
  card.dataset.modId = String(mod.id);
  card.dataset.modSearch = [
    mod.name,
    ...(Array.isArray(mod.tags) ? mod.tags.map((tag) => `#${tag}`) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  card.classList.toggle("is-hidden", Boolean(mod.hidden));
  card.classList.toggle(
    "is-non-playable",
    mod.kind === "dependency" || mod.kind === "addon",
  );
  card.classList.toggle("is-unassigned", isUnassigned);
  if (mod.hidden) card.style.opacity = "0.5";

  const launchAsStandalone = isExecutable;
  const launchLabel =
    launchAsStandalone ||
    getEngineLaunchBehavior(mod.engineId)?.scope === "exclusive-mod"
      ? t("modManager.launchMod")
      : t("modManager.launchEngine");
  card.innerHTML = modManagerTemplates.cardContent(
    launchAsStandalone ? "standalone" : "engine",
    mod.id,
    engine?.id || (launchAsStandalone ? "" : mod.engineId || ""),
    engine?.version || (launchAsStandalone ? "" : mod.engineVersion || ""),
    launchLabel,
    mod.name,
    mod.hidden,
    isUnassigned,
    eyeIcon,
    engineBadgeHtml,
  );
  card.classList.add("is-cover-loading");
  loadModCardImage({
    mod,
    card,
    fetchDetails: (modId, options) =>
      modCatalogService.getDetailsForSource(
        {
          provider: mod.providerSource,
          id: mod.providerId,
          type: mod.providerType,
        },
        options,
        modId,
      ),
    applyDominantColor,
  });
  return {
    card,
    engine,
    isExecutable,
    launchAsStandalone,
    launchBtn: card.querySelector(".mod-manager-launch-btn"),
    deleteBtn: card.querySelector(".mod-manager-delete-btn"),
    settingsBtn: card.querySelector(".mod-manager-settings-btn"),
    visBtn: card.querySelector(".mod-manager-vis-btn"),
  };
}

function bindModManagerCardActions({
  context,
  mod,
  getAllMods,
  installedEngines,
  gridContainer,
  onModDeleted,
  onSettingsSaved,
  refreshLaunchButtons,
  refreshChangeButtons,
}) {
  const {
    card,
    engine,
    isExecutable,
    launchAsStandalone,
    launchBtn,
    deleteBtn,
    settingsBtn,
    visBtn,
  } = context;
  launchBtn.addEventListener("click", async () => {
    launchBtn.disabled = true;
    try {
      if (
        FS.getModLaunchState(mod, engine, launchAsStandalone) === "unavailable"
      ) {
        const engineInfo = FS.getEngineDetails(mod.engineId);
        void engineUpdateModal.missing({
          engineId: mod.engineId,
          name: getEngineLabel(
            mod.engineId,
            engineInfo?.name || t("engineUpdates.assignedEngine"),
          ),
          icon: engineInfo?.icon,
        });
        return;
      }
      await FS.toggleModLaunch(mod, engine, launchAsStandalone, () => {
        refreshLaunchButtons();
        refreshChangeButtons();
      });
    } catch (error) {
      console.error(error);
    } finally {
      launchBtn.disabled = false;
      refreshLaunchButtons();
      refreshChangeButtons();
    }
  });

  deleteBtn.addEventListener("click", async () => {
    if (FS.isModLockedForChanges(mod, getAllMods())) return;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = modManagerTemplates.deleteSpinner();
    try {
      await FS.removeInstalledMod(mod.id);
      onModDeleted(mod.id);
      card.style.transform = "scale(0.8) translateY(10px)";
      card.style.opacity = "0";
      setTimeout(() => {
        if (!card.isConnected || !gridContainer.isConnected) return;
        card.remove();
        if (gridContainer.children.length === 0 && gridContainer.parentNode) {
          gridContainer.outerHTML = modManagerTemplates.emptyState(
            t("modManager.noModsInstalled"),
          );
        }
      }, 300);
      document.dispatchEvent(
        new CustomEvent("mods-updated", {
          detail: { source: "mod-manager", action: "deleted", modId: mod.id },
        }),
      );
    } catch (error) {
      console.error(
        `[WeekBox] Could not delete mod ${mod.id} (${mod.name})`,
        error,
      );
      const toastId = `mod-delete-error-${String(mod.id).replace(
        /[^a-z0-9_-]/gi,
        "_",
      )}`;
      toastSystem.show(toastId, {
        title: t("modManager.errorRemovingMod"),
        message: error?.message || t("modManager.errorRemovingMod"),
        badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
        showProgress: false,
        duration: 10000,
      });
      toastSystem.setState(toastId, "error", {
        badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
      });
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = modManagerTemplates.deleteIcon();
    }
  });

  settingsBtn.addEventListener("click", async () => {
    if (settingsBtn.disabled) return;
    settingsBtn.disabled = true;
    settingsBtn.replaceChildren(createHourglass(18));
    try {
      await modSettingsModal.open({
        mod,
        isExecutable,
        installedEngines,
        onSaved: onSettingsSaved,
        readOnly: false,
        fileLocked: FS.isModLockedForChanges(mod, getAllMods()),
      });
    } finally {
      settingsBtn.disabled = false;
      settingsBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
    }
  });

  visBtn.addEventListener("click", async () => {
    if (FS.isModLockedForChanges(mod, getAllMods())) return;
    visBtn.disabled = true;
    const isNowHidden = !mod.hidden;
    mod.hidden = isNowHidden;
    card.classList.toggle("is-hidden", isNowHidden);
    launchBtn.disabled = isNowHidden;
    card.style.opacity = isNowHidden ? "0.5" : "1";
    visBtn.querySelector("i").className = isNowHidden
      ? "fa-solid fa-eye-slash"
      : "fa-solid fa-eye";
    try {
      await FS.setModHidden(mod.id, isNowHidden);
      document.dispatchEvent(
        new CustomEvent("mods-updated", {
          detail: { source: "mod-manager", action: "hidden", modId: mod.id },
        }),
      );
    } catch {
      mod.hidden = !isNowHidden;
      card.classList.toggle("is-hidden", mod.hidden);
      launchBtn.disabled = mod.hidden;
      card.style.opacity = mod.hidden ? "0.5" : "1";
      visBtn.querySelector("i").className = mod.hidden
        ? "fa-solid fa-eye-slash"
        : "fa-solid fa-eye";
    } finally {
      visBtn.disabled = false;
    }
  });
}

export const cardRenderer = {
  async renderCards(
    gridContainer,
    modsToRender,
    allMods,
    standaloneMods,
    installedEngines,
    onModDeleted,
    onSettingsSaved,
  ) {
    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    let modsById = new Map(allMods.map((mod) => [String(mod.id), mod]));
    const enginesById = new Map();
    for (const engine of installedEngines) {
      if (!enginesById.has(engine.id)) enginesById.set(engine.id, []);
      enginesById.get(engine.id).push(engine);
    }
    let currentAllMods = allMods;

    const refreshLaunchButtons = () => {
      gridContainer
        .querySelectorAll(".mod-manager-launch-btn")
        .forEach((button) => {
          const isStandalone = button.dataset.launchKind === "standalone";
          const engine = isStandalone
            ? null
            : {
                id: button.dataset.engineId,
                version: button.dataset.engineVersion,
              };
          const state = FS.getModLaunchState(
            { id: button.dataset.modId },
            engine,
            isStandalone,
          );
          syncLaunchButton(button, state, modManagerTemplates);
        });
    };

    const refreshChangeButtons = () => {
      gridContainer.querySelectorAll(".mod-manager-card").forEach((card) => {
        const mod = modsById.get(card.dataset.modId);

        if (!mod) return;
        const locked = FS.isModLockedForChanges(mod, currentAllMods);
        const message = t("modManager.closeEngineBeforeChange");
        const deleteBtn = card.querySelector(".mod-manager-delete-btn");
        const settingsBtn = card.querySelector(".mod-manager-settings-btn");
        const visibilityBtn = card.querySelector(".mod-manager-vis-btn");
        if (!deleteBtn || !settingsBtn || !visibilityBtn) return;
        deleteBtn.disabled = locked;
        deleteBtn.title = locked ? message : t("modManager.delete");
        deleteBtn.setAttribute(
          "aria-label",
          locked ? message : t("modManager.delete"),
        );
        settingsBtn.disabled = false;
        settingsBtn.title = locked
          ? t("modManager.settingsReadOnly")
          : t("modManager.settings");
        settingsBtn.setAttribute("aria-label", settingsBtn.title);
        visibilityBtn.disabled = locked;
        visibilityBtn.title = locked
          ? message
          : t("modManager.toggleVisibility");
        visibilityBtn.setAttribute("aria-label", visibilityBtn.title);
      });
    };

    let removeProcessExitListener = () => {};
    const onProcessExit = () => {
      if (!gridContainer.isConnected) {
        removeProcessExitListener();
        return;
      }
      refreshLaunchButtons();
      refreshChangeButtons();
    };
    removeProcessExitListener = replaceProcessExitListener(
      gridContainer.parentElement,
      onProcessExit,
    );
    const scrollRoot = gridContainer.closest(".mod-manager-body");
    gridContainer.setAttribute("role", "list");
    const topSpacer = createSpacer("mod-manager-virtual-spacer");
    const bottomSpacer = createSpacer("mod-manager-virtual-spacer");
    const measuredRows = new Map();
    let items = [...modsToRender];
    let active = true;
    let destroyed = false;
    let scheduledFrame = 0;
    let itemsRevision = 0;
    let renderedKey = "";
    const invalidatedIds = new Set();
    let columnCount = getColumnCount(gridContainer);
    const rowKey = (rowIndex) =>
      items
        .slice(rowIndex * columnCount, (rowIndex + 1) * columnCount)
        .map((mod) => String(mod.id))
        .join("|");
    let rowIndexByKey = new Map();
    const createMetrics = () => {
      const rowCount = Math.ceil(items.length / columnCount);
      rowIndexByKey = new Map();
      const heights = Array.from({ length: rowCount }, (_, row) => {
        const key = rowKey(row);
        rowIndexByKey.set(key, row);
        return measuredRows.get(key) || 340;
      });
      return createVirtualGridMetrics(heights);
    };
    let virtualMetrics = createMetrics();

    const rowHeight = (rowIndex) => measuredRows.get(rowKey(rowIndex)) || 340;
    const offsetForRow = (endRow) => virtualMetrics.prefix(endRow);
    const syncCardPosition = (card, index) => {
      card.dataset.virtualIndex = String(index);
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-posinset", String(index + 1));
      card.setAttribute("aria-setsize", String(items.length));
    };

    const makeCard = (mod, index) => {
      const context = createModManagerCard(mod, standaloneModIds, enginesById);
      bindModManagerCardActions({
        context,
        mod,
        getAllMods: () => currentAllMods,
        installedEngines,
        gridContainer,
        onModDeleted,
        onSettingsSaved,
        refreshLaunchButtons,
        refreshChangeButtons,
      });
      if (index < 8)
        context.card.style.setProperty("--card-index", String(index));
      else context.card.classList.add("mod-manager-card--no-enter");
      syncCardPosition(context.card, index);
      return context.card;
    };

    const measureVisibleRows = (firstRow) => {
      const cards = [
        ...gridContainer.querySelectorAll(
          ".mod-manager-card:not(.mod-manager-installing-card)",
        ),
      ];
      let changed = false;
      for (let offset = 0; offset < cards.length; offset += columnCount) {
        const rowIndex = firstRow + Math.floor(offset / columnCount);
        const key = rowKey(rowIndex);
        const height = Math.max(
          ...cards
            .slice(offset, offset + columnCount)
            .map((card) => card.getBoundingClientRect().height),
        );
        const gap =
          Number.parseFloat(getComputedStyle(gridContainer).rowGap) || 0;
        const measured = height + gap;
        if (height && Math.abs((measuredRows.get(key) || 340) - measured) > 1) {
          measuredRows.delete(key);
          measuredRows.set(key, measured);
          virtualMetrics.setHeight(rowIndex, measured);
          while (measuredRows.size > MAX_MEASURED_GRID_ROWS) {
            const oldestKey = measuredRows.keys().next().value;
            measuredRows.delete(oldestKey);
            const oldestRow = rowIndexByKey.get(oldestKey);
            if (oldestRow !== undefined)
              virtualMetrics.setHeight(oldestRow, 340);
          }
          changed = true;
        }
      }
      return changed;
    };

    const renderWindow = () => {
      if (destroyed || !active || !gridContainer.isConnected || !scrollRoot)
        return;
      const nextColumnCount = getColumnCount(gridContainer);
      if (nextColumnCount !== columnCount) {
        columnCount = nextColumnCount;
        measuredRows.clear();
        virtualMetrics = createMetrics();
      }
      const range = getVirtualGridRange({
        itemCount: items.length,
        columns: columnCount,
        scrollTop: scrollRoot.scrollTop,
        viewportHeight: scrollRoot.clientHeight,
        rowHeight,
        metrics: virtualMetrics,
      });
      const { firstRow, firstIndex, lastIndex } = range;
      const key = `${itemsRevision}:${columnCount}:${firstIndex}:${lastIndex}`;
      if (renderedKey === key) {
        if (measureVisibleRows(firstRow)) {
          const gap =
            Number.parseFloat(getComputedStyle(gridContainer).rowGap) || 0;
          topSpacer.style.height = `${Math.max(0, range.topHeight - gap)}px`;
          bottomSpacer.style.height = `${Math.max(0, range.bottomHeight - gap)}px`;
        }
        return;
      }
      renderedKey = key;
      const pendingCards = [
        ...gridContainer.querySelectorAll(".mod-manager-installing-card"),
      ];
      const reusableCards = new Map(
        [
          ...gridContainer.querySelectorAll(
            ".mod-manager-card:not(.mod-manager-installing-card)",
          ),
        ].map((card) => [card.dataset.modId, card]),
      );
      const gap =
        Number.parseFloat(getComputedStyle(gridContainer).rowGap) || 0;
      topSpacer.style.height = `${Math.max(0, range.topHeight - gap)}px`;
      bottomSpacer.style.height = `${Math.max(0, range.bottomHeight - gap)}px`;
      const windowCards = [];
      for (let index = firstIndex; index < lastIndex; index += 1) {
        const mod = items[index];
        const modId = String(mod.id);
        const card = reusableCards.get(modId);
        if (card && !invalidatedIds.has(modId)) {
          syncCardPosition(card, index);
          windowCards.push(card);
        } else {
          windowCards.push(makeCard(mod, index));
        }
      }
      syncGridChildren(gridContainer, [
        topSpacer,
        ...windowCards,
        bottomSpacer,
        ...pendingCards,
      ]);
      invalidatedIds.clear();
      i18n.apply(gridContainer);
      refreshLaunchButtons();
      refreshChangeButtons();
      if (measureVisibleRows(firstRow)) {
        const measuredRange = getVirtualGridRange({
          itemCount: items.length,
          columns: columnCount,
          scrollTop: scrollRoot.scrollTop,
          viewportHeight: scrollRoot.clientHeight,
          rowHeight,
          metrics: virtualMetrics,
        });
        topSpacer.style.height = `${Math.max(0, measuredRange.topHeight - gap)}px`;
        bottomSpacer.style.height = `${Math.max(0, measuredRange.bottomHeight - gap)}px`;
        if (
          measuredRange.firstIndex !== firstIndex ||
          measuredRange.lastIndex !== lastIndex
        ) {
          scheduleRender();
        }
      }
    };

    const scheduleRender = () => {
      if (scheduledFrame || destroyed) return;
      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = 0;
        renderWindow();
      });
    };
    const onScroll = () => scheduleRender();
    const onGridKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const card = event.target.closest(
        ".mod-manager-card:not(.mod-manager-installing-card)",
      );
      if (!card) return;
      const focusable = [
        ...card.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusable.length) return;
      const isBoundary = event.shiftKey
        ? event.target === focusable[0] &&
          Number(card.dataset.virtualIndex) === firstRenderedIndex()
        : event.target === focusable.at(-1) &&
          Number(card.dataset.virtualIndex) === lastRenderedIndex();
      if (!isBoundary) return;
      const currentIndex = Number(card.dataset.virtualIndex);
      const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
      if (nextIndex < 0 || nextIndex >= items.length) return;
      event.preventDefault();
      const targetRow = Math.floor(nextIndex / columnCount);
      scrollRoot.scrollTop = offsetForRow(targetRow);
      renderWindow();
      requestAnimationFrame(() => {
        const targetCard = [
          ...gridContainer.querySelectorAll(
            ".mod-manager-card:not(.mod-manager-installing-card)",
          ),
        ].find(
          (candidate) => Number(candidate.dataset.virtualIndex) === nextIndex,
        );
        const targetFocusable = targetCard?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const destination = event.shiftKey
          ? targetFocusable?.[targetFocusable.length - 1]
          : targetFocusable?.[0];
        destination?.focus();
      });
    };
    const firstRenderedIndex = () =>
      Number(
        gridContainer.querySelector(
          ".mod-manager-card:not(.mod-manager-installing-card)",
        )?.dataset.virtualIndex ?? -1,
      );
    const lastRenderedIndex = () => {
      const cards = gridContainer.querySelectorAll(
        ".mod-manager-card:not(.mod-manager-installing-card)",
      );
      return Number(cards[cards.length - 1]?.dataset.virtualIndex ?? -1);
    };
    scrollRoot?.addEventListener("scroll", onScroll, { passive: true });
    gridContainer.addEventListener("keydown", onGridKeyDown);
    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(scheduleRender)
        : null;
    resizeObserver?.observe(scrollRoot);
    resizeObserver?.observe(gridContainer);

    const renderer = {
      setItems(nextItems) {
        if (
          items.length === nextItems.length &&
          items.every((mod, index) => mod === nextItems[index])
        ) {
          return;
        }
        const previousById = new Map(items.map((mod) => [String(mod.id), mod]));
        for (const mod of nextItems) {
          const id = String(mod.id);
          if (previousById.has(id) && previousById.get(id) !== mod) {
            invalidatedIds.add(id);
          }
        }
        items = [...nextItems];
        itemsRevision += 1;
        virtualMetrics = createMetrics();
        renderedKey = "";
        scheduleRender();
      },
      setAllMods(nextAllMods) {
        currentAllMods = nextAllMods;
        modsById = new Map(nextAllMods.map((mod) => [String(mod.id), mod]));
        refreshChangeButtons();
      },
      refreshLayout() {
        measuredRows.clear();
        virtualMetrics = createMetrics();
        renderedKey = "";
        scheduleRender();
      },
      setActive(nextActive) {
        active = nextActive;
        if (active) scheduleRender();
      },
      destroy() {
        destroyed = true;
        if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
        scrollRoot?.removeEventListener("scroll", onScroll);
        gridContainer.removeEventListener("keydown", onGridKeyDown);
        resizeObserver?.disconnect();
        removeProcessExitListener();
      },
    };

    renderWindow();
    return renderer;
  },
};
