function getToastId(engineId) {
  return `engine-update-toast-${engineId}`;
}

export const engineUpdateToast = {
  show(engineId, name) {
    const id = getToastId(engineId);
    document.getElementById(id)?.remove();
    const toast = document.createElement("aside");
    toast.id = id;
    toast.className = "engine-update-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <div class="engine-update-toast-icon"><i class="fa-solid fa-download"></i></div>
      <div class="engine-update-toast-body">
        <strong>${name}</strong>
        <span>Preparing update…</span>
        <div class="engine-update-toast-track"><i></i></div>
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
  },

  update(engineId, { progress, status }) {
    const toast = document.getElementById(getToastId(engineId));
    if (!toast) return;
    toast.querySelector("span").textContent =
      `${Math.floor(progress)}% · ${status}`;
    toast.querySelector(".engine-update-toast-track i").style.width =
      `${Math.max(0, Math.min(100, progress))}%`;
  },

  complete(engineId) {
    const toast = document.getElementById(getToastId(engineId));
    if (!toast) return;
    toast.classList.add("complete");
    toast.querySelector(".engine-update-toast-icon").innerHTML =
      '<i class="fa-solid fa-check"></i>';
    toast.querySelector("span").textContent = "Updated";
    toast.querySelector(".engine-update-toast-track i").style.width = "100%";
    setTimeout(() => this.hide(engineId), 4200);
  },

  info(engineId, name, message) {
    this.show(engineId, name);
    const toast = document.getElementById(getToastId(engineId));
    if (!toast) return;
    toast.querySelector(".engine-update-toast-icon").innerHTML =
      '<i class="fa-solid fa-check"></i>';
    toast.querySelector("span").textContent = message;
    toast.querySelector(".engine-update-toast-track i").style.width = "100%";
    setTimeout(() => this.hide(engineId), 2600);
  },

  offer(engineId, name, icon, onSelect) {
    this.show(engineId, name);
    const toast = document.getElementById(getToastId(engineId));
    if (!toast) return;
    toast.classList.add("offer");
    toast.setAttribute("role", "button");
    toast.tabIndex = 0;
    toast.querySelector(".engine-update-toast-icon").innerHTML =
      `<img src="assets/icons/${icon}" alt="" />`;
    toast.querySelector("span").textContent =
      "Update available · Click to review";
    toast.querySelector(".engine-update-toast-track i").style.width = "100%";
    toast.querySelector("strong").textContent = `${name} Update Available!`;
    toast.querySelector("span").textContent = "Click to review";
    toast.querySelector(".engine-update-toast-track").hidden = true;
    let selected = false;
    const select = () => {
      if (selected) return;
      selected = true;
      this.hide(engineId);
      onSelect();
    };
    toast.addEventListener("click", select, { once: true });
    toast.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
  },

  error(engineId) {
    const toast = document.getElementById(getToastId(engineId));
    if (!toast) return;
    toast.classList.add("error");
    toast.querySelector(".engine-update-toast-icon").innerHTML =
      '<i class="fa-solid fa-xmark"></i>';
    toast.querySelector("span").textContent =
      "Update failed, existing engine kept";
    setTimeout(() => this.hide(engineId), 5200);
  },

  missingEngine(engineId, name, icon) {
    const toastId = `missing-engine-${engineId || "unassigned"}`;
    this.show(toastId, "Engine missing");
    const toast = document.getElementById(getToastId(toastId));
    if (!toast) return;
    toast.classList.add("missing-engine");
    toast.querySelector(".engine-update-toast-icon").innerHTML = `
      <span class="engine-missing-icon">
        <img src="assets/icons/${icon || "exe.png"}" alt="" />
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </span>`;
    toast.querySelector("strong").textContent = "Engine missing";
    toast.querySelector(".engine-update-toast-body span").textContent = engineId
      ? `Install ${name} to launch this mod`
      : "Assign an engine in Mod Manager";
    toast.querySelector(".engine-update-toast-track").hidden = true;
    setTimeout(() => this.hide(toastId), 4600);
  },

  hide(engineId) {
    const toast = document.getElementById(getToastId(engineId));
    if (!toast) return;
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 220);
  },
};
