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
      title: "Moving WeekBox files",
      message: "Preparing files…",
      mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
      showPercent: true,
    });
  }

  update({ progress, copiedFiles, totalFiles }) {
    this.toastSystem.update(TOAST_ID, {
      message: `Moving files (${copiedFiles} of ${totalFiles})`,
      progress,
    });
  }

  complete() {
    document.getElementById("storage-move-lock")?.remove();
    this.toastSystem.setState(TOAST_ID, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    this.toastSystem.update(TOAST_ID, {
      message: "WeekBox files moved",
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
