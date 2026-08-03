import { getTargetPlatform } from "./utils.js";

function ensureModal() {
  let overlay = document.getElementById("engine-update-modal");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "engine-update-modal";
  overlay.className = "engine-update-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="engine-update-modal" role="dialog" aria-modal="true" aria-labelledby="engine-update-title">
      <div class="engine-update-heading">
        <img class="engine-update-mark" alt="" />
        <h2 id="engine-update-title"></h2>
      </div>
      <p class="engine-update-copy">There's a new update detected for this engine!</p>
      <div class="engine-update-build"></div>
      <div class="engine-update-actions">
        <button type="button" class="engine-update-later">Not now</button>
        <button type="button" class="engine-update-confirm">Update engine <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

export const engineUpdateModal = {
  confirm({ engineId, name, icon, candidate }) {
    const overlay = ensureModal();
    const platform = getTargetPlatform(candidate);
    const buildKey = candidate.updateKeys?.[platform] || candidate.updateKey;
    const buildLabel = candidate.isNightly
      ? `Nightly build · ${buildKey?.replace("nightly:", "").slice(0, 8) || "new commit"}`
      : `Release v${candidate.version}`;

    overlay.querySelector("#engine-update-title").textContent = name;
    const iconElement = overlay.querySelector(".engine-update-mark");
    iconElement.src = icon ? `assets/icons/${icon}` : "";
    iconElement.hidden = !icon;
    overlay.querySelector(".engine-update-build").textContent = buildLabel;

    return new Promise((resolve) => {
      const confirm = overlay.querySelector(".engine-update-confirm");
      const later = overlay.querySelector(".engine-update-later");
      const finish = (result) => {
        overlay.classList.remove("show");
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onKeydown);
        setTimeout(() => (overlay.hidden = true), 180);
        resolve(result);
      };
      const onOverlayClick = (event) => {
        if (event.target === overlay) finish("dismissed");
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") finish("dismissed");
      };

      confirm.onclick = () => finish("update");
      later.onclick = () => finish("skip");
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);
      confirm.focus();
    });
  },
};
