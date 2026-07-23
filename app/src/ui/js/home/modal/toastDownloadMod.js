import { toastSystem } from "../../toasts/toastSystem.js";

export const toastDownloadMod = {
  toasts: toastSystem.toasts,

  show(downloadId, name, onCancel, { iconHtml } = {}) {
    toastSystem.show(downloadId, {
      title: name,
      message: "Connecting",
      mediaHtml:
        iconHtml ||
        '<i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>',
      showPercent: true,
      onCancel,
    });
  },

  update(downloadId, percent, status) {
    toastSystem.update(downloadId, {
      message: status,
      progress: percent,
    });
  },

  success(downloadId) {
    toastSystem.setState(downloadId, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>',
    });
    toastSystem.update(downloadId, { message: "Installed", progress: 100 });
    setTimeout(() => this.hide(downloadId), 4000);
  },

  cancelAnim(downloadId) {
    toastSystem.setState(downloadId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>',
      showProgress: true,
    });
    toastSystem.update(downloadId, { message: "Cancelling…", progress: 100 });
  },

  error(downloadId, message) {
    toastSystem.setState(downloadId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>',
      showProgress: true,
    });
    toastSystem.update(downloadId, {
      message: `Error: ${message}`,
      progress: 100,
    });
    setTimeout(() => this.hide(downloadId), 5000);
  },

  hide(downloadId) {
    toastSystem.hide(downloadId);
  },

  remove(downloadId) {
    toastSystem.remove(downloadId);
  },
};
