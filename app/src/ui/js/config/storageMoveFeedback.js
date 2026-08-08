import { t } from "../i18n/index.js";

const TOAST_ID = "weekbox-storage-move";

export class StorageMoveFeedback {
  constructor(toastSystem) {
    this.toastSystem = toastSystem;
  }

  show() {
    if (!document.getElementById("storage-move-lock")) {
      const lock = document.createElement("div");
      lock.id = "storage-move-lock";
      lock.className = "storage-move-lock";
      lock.setAttribute("aria-hidden", "true");
      document.body.appendChild(lock);
    }
    this.toastSystem.show(TOAST_ID, {
      title: t("storage.movingFiles"),
      message: t("storage.preparingFiles"),
      mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
      showPercent: true,
      indeterminate: true,
    });
  }

  update({ progress, copiedFiles, totalFiles, phase }) {
    const preparing = phase === "preparing";
    this.toastSystem.update(TOAST_ID, {
      message: preparing
        ? t("storage.preparingFiles")
        : t("storage.movingFilesProgress", {
            copied: copiedFiles,
            total: totalFiles,
          }),
      progress,
    });
  }

  complete() {
    document.getElementById("storage-move-lock")?.remove();
    this.toastSystem.setState(TOAST_ID, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    this.toastSystem.update(TOAST_ID, {
      message: t("storage.filesMoved"),
      progress: 100,
    });
    setTimeout(() => this.toastSystem.hide(TOAST_ID), 3600);
  }

  fail(message) {
    document.getElementById("storage-move-lock")?.remove();
    this.toastSystem.setState(TOAST_ID, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    });
    this.toastSystem.update(TOAST_ID, { message, progress: 100 });
  }
}
