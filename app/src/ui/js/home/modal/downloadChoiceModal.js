import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./dialogFocus.js";
import { getPreferredDownloadOption } from "../../../../backend/utils/gamebanana/download-options.js";
import { i18n, t } from "../../i18n/index.js";

function ensureModal() {
  let overlay = document.getElementById("download-choice-modal");
  if (overlay) return overlay;
  const tpl = document.getElementById("tpl-download-choice-modal");
  if (tpl) {
    document.body.appendChild(tpl.content.cloneNode(true));
    overlay = document.getElementById("download-choice-modal");
    if (overlay) {
      i18n.apply(overlay);
      return overlay;
    }
  }
  overlay = document.createElement("div");
  overlay.id = "download-choice-modal";
  overlay.className = "dependency-review-overlay";
  overlay.hidden = true;
  const section = document.createElement("section");
  section.className = "dependency-review-modal";
  section.setAttribute("role", "dialog");
  section.setAttribute("aria-modal", "true");
  section.setAttribute("aria-labelledby", "download-choice-title");
  const heading = document.createElement("div");
  heading.className = "dependency-review-heading";
  const hIcon = document.createElement("i");
  hIcon.className = "fa-solid fa-download";
  hIcon.setAttribute("aria-hidden", "true");
  const hDiv = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.id = "download-choice-title";
  h2.textContent = t("downloads.chooseTitle");
  hDiv.appendChild(h2);
  heading.append(hIcon, hDiv);
  const list = document.createElement("div");
  list.className = "dependency-review-list download-choice-list";
  const actions = document.createElement("div");
  actions.className = "dependency-review-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "dependency-review-cancel";
  cancelBtn.textContent = t("common.cancel");
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "dependency-review-confirm";
  confirmBtn.textContent = t("common.continue");
  actions.append(cancelBtn, confirmBtn);
  section.append(heading, list, actions);
  overlay.appendChild(section);
  document.body.appendChild(overlay);
  return overlay;
}

const downloadChoiceModal = {
  choose(options) {
    if (options.length === 1) return Promise.resolve(options[0]);
    const preferredOption = getPreferredDownloadOption(options);
    const selectedId = preferredOption?.id || options[0]?.id;
    const overlay = ensureModal();
    const list = overlay.querySelector(".download-choice-list");
    list.replaceChildren(
      ...options.map((option) => {
        const row = document.createElement("label");
        row.className = "dependency-review-item";
        row.title = option.name;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "download-choice";
        input.value = option.id;
        input.checked = option.id === selectedId;
        const copy = document.createElement("span");
        copy.className = "dependency-review-copy";
        const name = document.createElement("strong");
        name.textContent = option.name;
        const meta = document.createElement("small");
        const fileDetails =
          option.type === "external"
            ? option.fileSizeStr || t("downloads.alternateSource")
            : option.fileSizeStr;
        meta.textContent = [fileDetails, option.uploadedAtLabel]
          .filter(Boolean)
          .join(` ${t("common.separator")} `);
        copy.append(name, meta);
        const icon = document.createElement("i");
        icon.className =
          option.type === "external"
            ? "fa-solid fa-cloud-arrow-down download-choice-icon"
            : "fa-solid fa-file-zipper download-choice-icon";
        icon.setAttribute("aria-hidden", "true");
        row.append(input, copy, icon);
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
        const id = list.querySelector("input:checked")?.value || selectedId;
        finish(options.find((option) => option.id === id) || null);
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

export { downloadChoiceModal };
