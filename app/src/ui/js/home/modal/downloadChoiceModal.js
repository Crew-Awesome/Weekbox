import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./dialogFocus.js";
import { getPreferredDownloadOption } from "../../../../backend/utils/gamebanana/download-options.js";
import { t } from "../../i18n/index.js";

function ensureModal() {
  let overlay = document.getElementById("download-choice-modal");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "download-choice-modal";
  overlay.className = "dependency-review-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="dependency-review-modal" role="dialog" aria-modal="true" aria-labelledby="download-choice-title">
      <div class="dependency-review-heading">
        <i class="fa-solid fa-download" aria-hidden="true"></i>
        <div><h2 id="download-choice-title">${t("downloads.chooseTitle")}</h2></div>
      </div>
      <div class="dependency-review-list download-choice-list"></div>
      <div class="dependency-review-actions">
        <button type="button" class="dependency-review-cancel">${t("common.cancel")}</button>
        <button type="button" class="dependency-review-confirm">${t("common.continue")}</button>
      </div>
    </section>`;
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
