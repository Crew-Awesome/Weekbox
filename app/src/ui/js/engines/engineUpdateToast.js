import { toastSystem } from "../toasts/toastSystem.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { t } from "../i18n/index.js";

function getToastId(engineId) {
  return `engine-update-toast-${engineId}`;
}

export const engineUpdateToast = {
  show(engineId, name) {
    toastSystem.show(getToastId(engineId), {
      title: name,
      message: t("engineUpdates.preparing"),
      mediaHtml: `<img src="assets/icons/${ENGINE_DETAILS[engineId]?.icon || "exe.png"}" alt="" />`,
      showPercent: true,
    });
  },

  update(engineId, { progress, status }) {
    toastSystem.update(getToastId(engineId), {
      message: status,
      progress,
    });
  },

  complete(engineId) {
    const id = getToastId(engineId);
    toastSystem.setState(id, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>',
    });
    toastSystem.update(id, {
      message: t("engineUpdates.updated"),
      progress: 100,
    });
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
    toastSystem.show(getToastId(engineId), {
      title: t("engineUpdates.availableTitle", { name }),
      message: t("engineUpdates.clickToReview"),
      mediaHtml: `<img src="assets/icons/${icon}" alt="" />`,
      badgeHtml: '<i class="fa-solid fa-exclamation" aria-hidden="true"></i>',
      showProgress: false,
      onSelect: () => {
        this.hide(engineId);
        onSelect();
      },
    });
    toastSystem.setState(getToastId(engineId), "offer");
  },

  error(engineId) {
    const id = getToastId(engineId);
    toastSystem.setState(id, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>',
    });
    toastSystem.update(id, { message: t("engineUpdates.failedKept") });
    setTimeout(() => this.hide(engineId), 5200);
  },

  missingEngine(engineId, name, icon) {
    const id = getToastId(`missing-engine-${engineId || "unassigned"}`);
    toastSystem.show(id, {
      title: t("engineUpdates.engineMissing"),
      message: engineId
        ? t("engineUpdates.installToLaunch", { name })
        : t("engineUpdates.assignInModManager"),
      mediaHtml: `<img src="assets/icons/${icon || "exe.png"}" alt="" />`,
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
