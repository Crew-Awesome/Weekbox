import { toastSystem } from "../toasts/toastSystem.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { FS } from "../../../backend/services/filesystem.js";
import { t } from "../i18n/index.js";
import { notifyDesktop } from "../desktopNotifications.js";

function getIconSource(icon, engineId = null) {
  if (engineId) return FS.getEngineIconSource(engineId);
  const source = String(icon || "exe.png");
  return /^(?:data|blob|https?):/i.test(source)
    ? source
    : `assets/icons/${source}`;
}

function getToastId(engineId) {
  return `engine-update-toast-${engineId}`;
}

export const engineUpdateToast = {
  show(engineId, name) {
    toastSystem.show(getToastId(engineId), {
      title: name,
      message: t("engineUpdates.preparing"),
      mediaHtml: `<img src="${getIconSource(ENGINE_DETAILS[engineId]?.icon, engineId)}" alt="" />`,
      showPercent: true,
    });
  },

  update(engineId, { progress, status }) {
    toastSystem.update(getToastId(engineId), {
      message: status,
      progress,
    });
  },

  complete(engineId, name = ENGINE_DETAILS[engineId]?.name || engineId) {
    const id = getToastId(engineId);
    toastSystem.setState(id, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>',
    });
    toastSystem.update(id, {
      message: t("engineUpdates.updated"),
      progress: 100,
    });
    notifyDesktop(
      t("notifications.engineUpdatedTitle"),
      t("notifications.engineUpdatedMessage", { name }),
    );
    setTimeout(() => this.hide(engineId), 4200);
  },

  info(engineId, name, message) {
    this.show(engineId, name);
    const id = getToastId(engineId);
    toastSystem.setState(id, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>',
    });
    toastSystem.update(id, { message, progress: 100 });
    setTimeout(() => this.hide(engineId), 2600);
  },

  offer(engineId, name, icon, onSelect) {
    const id = getToastId(engineId);
    toastSystem.show(id, {
      title: t("engineUpdates.availableTitle", { name }),
      message: t("engineUpdates.clickToReview"),
      mediaHtml: `<img src="${getIconSource(icon, engineId)}" alt="" />`,
      badgeHtml: '<i class="fa-solid fa-exclamation" aria-hidden="true"></i>',
      showProgress: false,
      duration: 10000,
      onSelect: () => {
        this.hide(engineId);
        onSelect();
      },
    });
    toastSystem.setState(id, "offer");
    notifyDesktop(
      t("notifications.engineUpdateAvailableTitle"),
      t("notifications.engineUpdateAvailableMessage", { name }),
    );
  },

  error(engineId, name = ENGINE_DETAILS[engineId]?.name || engineId) {
    const id = getToastId(engineId);
    toastSystem.setState(id, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>',
    });
    toastSystem.update(id, { message: t("engineUpdates.failedKept") });
    notifyDesktop(
      t("notifications.engineUpdateFailedTitle"),
      t("notifications.engineUpdateFailedMessage", { name }),
      "ERROR",
    );
    setTimeout(() => this.hide(engineId), 5200);
  },

  missingEngine(engineId, name, icon) {
    const id = getToastId(`missing-engine-${engineId || "unassigned"}`);
    toastSystem.show(id, {
      title: t("engineUpdates.engineMissing"),
      message: engineId
        ? t("engineUpdates.installToLaunch", { name })
        : t("engineUpdates.assignInModManager"),
      mediaHtml: `<img src="${getIconSource(icon, engineId)}" alt="" />`,
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
      showProgress: false,
    });
    toastSystem.setState(id, "error");
    setTimeout(
      () => this.hide(`missing-engine-${engineId || "unassigned"}`),
      4600,
    );
  },

  hide(engineId) {
    toastSystem.hide(getToastId(engineId));
  },
};
