import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./dialogFocus.js";
import { i18n, t } from "../../i18n/index.js";

function ensureModal() {
  let overlay = document.getElementById("dependency-review-modal");
  if (overlay) return overlay;
  const tpl = document.getElementById("tpl-dependency-review-modal");
  if (tpl) {
    document.body.appendChild(tpl.content.cloneNode(true));
    overlay = document.getElementById("dependency-review-modal");
    if (overlay) {
      i18n.apply(overlay);
      return overlay;
    }
  }
  overlay = document.createElement("div");
  overlay.id = "dependency-review-modal";
  overlay.className = "dependency-review-overlay";
  overlay.hidden = true;
  const section = document.createElement("section");
  section.className = "dependency-review-modal";
  section.setAttribute("role", "dialog");
  section.setAttribute("aria-modal", "true");
  section.setAttribute("aria-labelledby", "dependency-review-title");
  const heading = document.createElement("div");
  heading.className = "dependency-review-heading";
  const hIcon = document.createElement("i");
  hIcon.className = "fa-solid fa-puzzle-piece";
  hIcon.setAttribute("aria-hidden", "true");
  const hDiv = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.id = "dependency-review-title";
  h2.textContent = t("dependencies.installTitle");
  hDiv.appendChild(h2);
  heading.append(hIcon, hDiv);
  const list = document.createElement("div");
  list.className = "dependency-review-list";
  const actions = document.createElement("div");
  actions.className = "dependency-review-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "dependency-review-cancel";
  cancelBtn.textContent = t("common.cancel");
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "dependency-review-confirm";
  confirmBtn.textContent = t("dependencies.installSelected");
  actions.append(cancelBtn, confirmBtn);
  section.append(heading, list, actions);
  overlay.appendChild(section);
  document.body.appendChild(overlay);
  return overlay;
}

const dependencyReviewModal = {
  review(requirements) {
    const overlay = ensureModal();
    const list = overlay.querySelector(".dependency-review-list");
    list.replaceChildren(
      ...requirements.map((requirement) => {
        const row = document.createElement("label");
        row.className = "dependency-review-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.value = requirement.dependencyId;
        const copy = document.createElement("span");
        copy.className = "dependency-review-copy";
        const name = document.createElement("strong");
        name.textContent = requirement.title;
        const meta = document.createElement("small");
        meta.textContent = requirement.fileSizeStr || "";
        copy.append(name);
        if (requirement.fileSizeStr) copy.append(meta);
        const open = document.createElement("button");
        open.type = "button";
        open.className = "dependency-review-open";
        open.title = t("home.openOnGameBanana");
        open.setAttribute(
          "aria-label",
          t("dependencies.openOnGameBanana", { title: requirement.title }),
        );
        const openIcon = document.createElement("i");
        openIcon.className = "fa-solid fa-arrow-up-right-from-square";
        openIcon.setAttribute("aria-hidden", "true");
        open.appendChild(openIcon);
        open.addEventListener("click", (event) => {
          event.preventDefault();
          Neutralino.os.open(requirement.gameBananaUrl).catch(() => {});
        });
        row.append(checkbox, copy, open);
        return row;
      }),
    );
    return new Promise((resolve) => {
      const confirm = overlay.querySelector(".dependency-review-confirm");
      const cancel = overlay.querySelector(".dependency-review-cancel");
      const finish = (result) => {
        overlay.classList.remove("show");
        document.removeEventListener("keydown", onKeydown);
        deactivateCheckoutDialog(overlay);
        setTimeout(() => (overlay.hidden = true), 180);
        resolve(result);
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") finish(null);
      };
      cancel.onclick = () => finish(null);
      confirm.onclick = () => {
        const selected = new Set(
          [...list.querySelectorAll("input:checked")].map(
            (input) => input.value,
          ),
        );
        finish(requirements.filter((item) => selected.has(item.dependencyId)));
      };
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      document.addEventListener("keydown", onKeydown);
      activateCheckoutDialog(
        overlay,
        overlay.querySelector(".dependency-review-modal"),
        confirm,
      );
    });
  },
};

export { dependencyReviewModal };
