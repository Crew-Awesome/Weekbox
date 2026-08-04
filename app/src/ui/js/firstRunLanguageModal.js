import { i18n, t } from "./i18n/index.js";
import { appSettings } from "../../backend/core/system/settings.service.js";

const languages = [
  { id: "en", flag: "us", name: "English" },
  { id: "es", flag: "es", name: "Español" },
  { id: "de", flag: "de", name: "Deutsch" },
];

export const firstRunLanguageModal = {
  show() {
    const previousFocus = document.activeElement;
    const modal = document.createElement("section");
    modal.className = "language-picker-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "first-run-language-title");
    modal.innerHTML = `
      <div class="language-picker-panel">
        <div class="language-picker-main">
          <h2 id="first-run-language-title">${t("languageSetup.title")}</h2>
          <div class="language-picker-options" role="group" aria-label="${t("languageSetup.optionsLabel")}">
            ${languages
              .map(
                ({ id, flag, name }) => `
                  <button type="button" class="language-picker-option" data-language="${id}" data-language-name="${name}" aria-label="${name}">
                    <span class="language-picker-flag fi fi-${flag}" aria-hidden="true"></span>
                  </button>`,
              )
              .join("")}
          </div>
          <button type="button" class="language-picker-continue" aria-label="${t("common.continue")}" disabled>
            <span>${t("common.continue")}</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;

    const app = document.getElementById("app");
    app?.setAttribute("inert", "");
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    const options = [...modal.querySelectorAll(".language-picker-option")];
    const continueButton = modal.querySelector(".language-picker-continue");
    let resolveSelection;
    let selectedLocale = null;
    const finish = (locale) => {
      i18n.setLocale(locale);
      appSettings.set("firstRunLanguageSetupComplete", true);
      app?.removeAttribute("inert");
      modal.remove();
      previousFocus?.focus?.();
      resolveSelection?.(locale);
    };

    options.forEach((option) => {
      option.addEventListener("click", () => {
        selectedLocale = option.dataset.language;
        options.forEach((item) =>
          item.classList.toggle("is-selected", item === option),
        );
        continueButton.disabled = false;
        continueButton.classList.add("is-ready");
        continueButton.focus();
      });
    });
    continueButton.addEventListener("click", () => {
      if (selectedLocale) finish(selectedLocale);
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = options
        .concat(continueButton)
        .filter((item) => !item.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    options[0]?.focus();

    return new Promise((resolve) => {
      resolveSelection = resolve;
    });
  },
};
