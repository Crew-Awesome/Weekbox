const TOAST_STATES = ["complete", "error", "offer", "missing-engine"];
import { t } from "../i18n/index.js";

function isStartupActive() {
  if (typeof document === "undefined") return false;
  const el = document.getElementById("startup-loading-screen");
  return Boolean(el && !el.classList.contains("startup-loading--complete"));
}

export const toastSystem = {
  toasts: new Map(),
  pendingToasts: new Map(),
  timers: new Map(),

  ensureContainer() {
    let container = document.getElementById("toast-system-container");
    if (container) return container;
    container = document.createElement("div");
    container.id = "toast-system-container";
    container.className = "toast-system-container";
    document.body.appendChild(container);
    return container;
  },

  show(
    id,
    {
      title,
      message,
      mediaHtml,
      badgeHtml = '<i class="fa-solid fa-download"></i>',
      showProgress = true,
      showPercent = false,
      duration,
      onSelect,
      onCancel,
    } = {},
  ) {
    if (isStartupActive()) {
      this.pendingToasts.set(id, {
        options: {
          title,
          message,
          mediaHtml,
          badgeHtml,
          showProgress,
          showPercent,
          duration,
          onSelect,
          onCancel,
        },
        state: null,
        stateMeta: null,
      });
      return {
        id,
        isPending: true,
      };
    }

    return this._mountToast(id, {
      title,
      message,
      mediaHtml,
      badgeHtml,
      showProgress,
      showPercent,
      duration,
      onSelect,
      onCancel,
    });
  },

  _mountToast(
    id,
    {
      title,
      message,
      mediaHtml,
      badgeHtml = '<i class="fa-solid fa-download"></i>',
      showProgress = true,
      showPercent = false,
      duration,
      onSelect,
      onCancel,
    } = {},
  ) {
    this.remove(id);
    this.clearTimer(id);

    const toast = document.createElement("aside");
    toast.id = id;
    toast.className = "engine-update-toast toast-system-item";
    toast.classList.toggle("has-progress", showProgress);
    toast.setAttribute("role", onSelect ? "button" : "status");
    if (onSelect) toast.tabIndex = 0;
    toast.innerHTML = `
      <div class="engine-update-toast-icon"><span class="toast-system-media">${mediaHtml || ""}</span><span class="toast-system-status-badge">${badgeHtml || ""}</span></div>
      <div class="engine-update-toast-body">
        <div class="toast-system-heading">
          <strong>${title || ""}</strong>${showPercent ? '<em class="toast-system-percent">0%</em>' : ""}
          ${onCancel ? `<span class="toast-system-controls"><button type="button" class="toast-system-control toast-system-cancel" aria-label="${t("toast.cancelDownload")}" title="${t("toast.cancelDownload")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><button type="button" class="toast-system-control toast-system-collapse" aria-label="${t("toast.showOnlyProgress")}" title="${t("toast.showOnlyProgress")}"><i class="fa-solid fa-compress" aria-hidden="true"></i></button></span>` : ""}
        </div>
        <span>${message || ""}</span>
        <div class="engine-update-toast-track" ${showProgress ? "" : "hidden"}><i></i></div>
      </div>
    `;
    const entry = {
      toast,
      title: toast.querySelector("strong"),
      message: toast.querySelector(".engine-update-toast-body > span"),
      icon: toast.querySelector(".engine-update-toast-icon"),
      badge: toast.querySelector(".toast-system-status-badge"),
      track: toast.querySelector(".engine-update-toast-track"),
      progress: toast.querySelector(".engine-update-toast-track i"),
      percent: toast.querySelector(".toast-system-percent"),
    };
    this.toasts.set(id, entry);
    this.ensureContainer().appendChild(toast);

    toast
      .querySelector(".toast-system-cancel")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.clearTimer(id);
        onCancel?.(id);
      });
    toast
      .querySelector(".toast-system-collapse")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        const compact = toast.classList.toggle("compact");
        if (compact) {
          toast.setAttribute("aria-label", t("toast.showFullDownload"));
          toast.tabIndex = 0;
        } else {
          toast.removeAttribute("aria-label");
          toast.removeAttribute("tabindex");
        }
      });
    toast.addEventListener("click", () => {
      if (!toast.classList.contains("compact")) return;
      toast.classList.remove("compact");
      toast.removeAttribute("aria-label");
      toast.removeAttribute("tabindex");
    });
    toast.addEventListener("keydown", (event) => {
      if (
        toast.classList.contains("compact") &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        toast.click();
      }
    });
    if (onSelect) {
      const select = () => {
        this.clearTimer(id);
        onSelect();
      };
      toast.addEventListener("click", select, { once: true });
      toast.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
    }

    if (typeof duration === "number" && duration > 0) {
      this.setTimer(id, () => this.hide(id), duration);
    }

    requestAnimationFrame(() => toast.classList.add("show"));
    return entry;
  },

  update(id, { message, progress } = {}) {
    if (this.pendingToasts.has(id)) {
      const pending = this.pendingToasts.get(id);
      if (message !== undefined) pending.options.message = message;
      if (progress !== undefined) pending.options.progress = progress;
      return;
    }
    const entry = this.toasts.get(id);
    if (!entry) return;
    if (message !== undefined && entry.message) entry.message.textContent = message;
    if (progress !== undefined && entry.progress) {
      const value = Math.max(0, Math.min(100, progress));
      entry.progress.style.width = `${value}%`;
      if (entry.percent) entry.percent.textContent = `${Math.floor(value)}%`;
    }
  },

  setState(id, state, { badgeHtml, showProgress } = {}) {
    if (this.pendingToasts.has(id)) {
      const pending = this.pendingToasts.get(id);
      pending.state = state;
      pending.stateMeta = { badgeHtml, showProgress };
      return;
    }
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.classList.remove(...TOAST_STATES);
    if (state) entry.toast.classList.add(state);
    if (badgeHtml && entry.badge) entry.badge.innerHTML = badgeHtml;
    if (showProgress !== undefined && entry.track) entry.track.hidden = !showProgress;
  },

  hide(id) {
    this.clearTimer(id);
    if (this.pendingToasts.has(id)) {
      this.pendingToasts.delete(id);
      return;
    }
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.classList.remove("show");
    setTimeout(() => this.remove(id), 220);
  },

  remove(id) {
    this.clearTimer(id);
    this.pendingToasts.delete(id);
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.remove();
    this.toasts.delete(id);
    if (this.toasts.size === 0) {
      document.getElementById("toast-system-container")?.remove();
    }
  },

  setTimer(id, fn, ms) {
    this.clearTimer(id);
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        fn();
      }, ms),
    );
  },

  clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  },

  flushPending() {
    if (this.pendingToasts.size === 0) return;
    const entries = Array.from(this.pendingToasts.entries());
    this.pendingToasts.clear();
    for (const [id, item] of entries) {
      this._mountToast(id, item.options);
      if (item.state) {
        this.setState(id, item.state, item.stateMeta);
      }
    }
  },
};

if (typeof document !== "undefined") {
  document.addEventListener("startup-loader:complete", () => {
    toastSystem.flushPending();
  });
}
