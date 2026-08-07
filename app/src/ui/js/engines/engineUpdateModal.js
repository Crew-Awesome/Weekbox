import { getTargetPlatform } from "./utils.js";
import { i18n, t } from "../i18n/index.js";

function ensureModal() {
  let overlay = document.getElementById("engine-update-modal");
  if (overlay) return overlay;

  const tpl = document.getElementById("tpl-engine-update-modal");
  if (tpl) {
    const fragment = tpl.content.cloneNode(true);
    overlay = fragment.firstElementChild;
  } else {
    overlay = document.createElement("div");
    overlay.id = "engine-update-modal";
    overlay.className = "engine-update-overlay";
    overlay.hidden = true;

    const section = document.createElement("section");
    section.className = "engine-update-modal";
    section.setAttribute("role", "dialog");
    section.setAttribute("aria-modal", "true");
    section.setAttribute("aria-labelledby", "engine-update-title");

    const heading = document.createElement("div");
    heading.className = "engine-update-heading";
    const mark = document.createElement("img");
    mark.className = "engine-update-mark";
    mark.alt = "";
    const title = document.createElement("h2");
    title.id = "engine-update-title";
    heading.append(mark, title);

    const copy = document.createElement("p");
    copy.className = "engine-update-copy";
    copy.dataset.i18n = "engineUpdates.detected";
    copy.textContent = t("engineUpdates.detected");

    const build = document.createElement("div");
    build.className = "engine-update-build";

    const actions = document.createElement("div");
    actions.className = "engine-update-actions";
    const laterBtn = document.createElement("button");
    laterBtn.type = "button";
    laterBtn.className = "engine-update-later";
    laterBtn.dataset.i18n = "storage.notNow";
    laterBtn.textContent = t("storage.notNow");

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "engine-update-confirm";
    const confirmSpan = document.createElement("span");
    confirmSpan.dataset.i18n = "engineUpdates.updateEngine";
    confirmSpan.textContent = t("engineUpdates.updateEngine");
    const confirmIcon = document.createElement("i");
    confirmIcon.className = "fa-solid fa-arrow-right";
    confirmBtn.append(confirmSpan, confirmIcon);

    actions.append(laterBtn, confirmBtn);
    section.append(heading, copy, build, actions);
    overlay.append(section);
  }

  document.body.appendChild(overlay);
  i18n.apply(overlay);
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
