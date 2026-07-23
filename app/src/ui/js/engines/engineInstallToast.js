import { toastDownloadMod } from "../home/modal/toastDownloadMod.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.js";

function getToastId(engineId, version) {
  return `engine-install:${engineId}:${version}`;
}

export const engineInstallToast = {
  show(install) {
    if (!install) return null;
    const { engineId, version, name } = install;
    const toastId = getToastId(engineId, version);
    if (!toastDownloadMod.toasts.has(toastId)) {
      toastDownloadMod.show(toastId, `Installing ${name}`, null, {
        iconHtml: `<img src="assets/icons/${ENGINE_DETAILS[engineId]?.icon || "exe.png"}" alt="" />`,
      });
    }
    return toastId;
  },

  update(install, progressInfo) {
    const toastId = this.show(install);
    if (!toastId) return;
    const progress = Math.min(
      100,
      Math.max(0, Number(progressInfo?.progress) || 0),
    );
    const status = String(progressInfo?.status || "Working...");
    toastDownloadMod.update(toastId, progress, status);
  },

  complete(install) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.success(toastId);
  },

  error(install, message) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.error(toastId, message);
  },

  hide(install) {
    if (!install) return;
    const { engineId, version } = install;
    toastDownloadMod.hide(getToastId(engineId, version));
  },
};
