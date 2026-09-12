import { toastDownloadMod } from "../home/modal/toastDownloadMod.js";
import { FS } from "../../../backend/services/filesystem.js";
import { t } from "../i18n/index.js";
import { notifyDesktop } from "../desktopNotifications.js";

function getToastId(engineId, version) {
  return `engine-install:${engineId}:${version}`;
}

export const engineInstallToast = {
  show(install, onCancel) {
    if (!install) return null;
    const { engineId, version, name } = install;
    const toastId = getToastId(engineId, version);
    if (!toastDownloadMod.toasts.has(toastId)) {
      toastDownloadMod.show(toastId, `${name} · ${version}`, onCancel, {
        iconHtml: `<img src="${FS.getEngineIconSource(engineId)}" alt="" />`,
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
    const status = String(progressInfo?.status || t("engines.working"));
    toastDownloadMod.update(toastId, progress, status);
  },

  complete(install) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.success(toastId);
    notifyDesktop(
      t("notifications.engineInstalledTitle"),
      t("notifications.engineInstalledMessage", install),
    );
  },

  cancel(install) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.cancelAnim(toastId);
  },

  error(install, message) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.error(toastId, message);
    notifyDesktop(
      t("notifications.engineInstallFailedTitle"),
      t("notifications.engineInstallFailedMessage", install),
      "ERROR",
    );
  },

  hide(install) {
    if (!install) return;
    const { engineId, version } = install;
    toastDownloadMod.hide(getToastId(engineId, version));
  },
};
