const TOAST_STATES = ["complete", "error", "offer", "missing-engine"];

export const toastSystem = {
  toasts: new Map(),

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
      onSelect,
      onCancel,
    },
  ) {
    this.remove(id);
    const toast = document.createElement("aside");
    toast.id = id;
    toast.className = "engine-update-toast toast-system-item";
    toast.classList.toggle("has-progress", showProgress);
    toast.setAttribute("role", onSelect ? "button" : "status");
    if (onSelect) toast.tabIndex = 0;
    toast.innerHTML = `
      <div class="engine-update-toast-icon"><span class="toast-system-media">${mediaHtml}</span><span class="toast-system-status-badge">${badgeHtml}</span></div>
      <div class="engine-update-toast-body">
        <div class="toast-system-heading">
          <strong>${title}</strong>${showPercent ? '<em class="toast-system-percent">0%</em>' : ""}
          ${onCancel ? '<span class="toast-system-controls"><button type="button" class="toast-system-control toast-system-cancel" aria-label="Cancel download" title="Cancel download"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><button type="button" class="toast-system-control toast-system-collapse" aria-label="Show only progress" title="Show only progress"><i class="fa-solid fa-compress" aria-hidden="true"></i></button></span>' : ""}
        </div>
        <span>${message}</span>
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
        onCancel(id);
      });
    toast
      .querySelector(".toast-system-collapse")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        const compact = toast.classList.toggle("compact");
        if (compact) {
          toast.setAttribute("aria-label", "Show full download toast");
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
      const select = () => onSelect();
      toast.addEventListener("click", select, { once: true });
      toast.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
    }
    requestAnimationFrame(() => toast.classList.add("show"));
    return entry;
  },

  update(id, { message, progress }) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    if (message !== undefined) entry.message.textContent = message;
    if (progress !== undefined) {
      const value = Math.max(0, Math.min(100, progress));
      entry.progress.style.width = `${value}%`;
      if (entry.percent) entry.percent.textContent = `${Math.floor(value)}%`;
    }
  },

  setState(id, state, { badgeHtml, showProgress } = {}) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.classList.remove(...TOAST_STATES);
    if (state) entry.toast.classList.add(state);
    if (badgeHtml) entry.badge.innerHTML = badgeHtml;
    if (showProgress !== undefined) entry.track.hidden = !showProgress;
  },

  hide(id) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.classList.remove("show");
    setTimeout(() => this.remove(id), 220);
  },

  remove(id) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.remove();
    this.toasts.delete(id);
    if (this.toasts.size === 0) {
      document.getElementById("toast-system-container")?.remove();
    }
  },
};
