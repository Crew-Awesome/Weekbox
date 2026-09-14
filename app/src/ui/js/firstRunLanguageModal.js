import { getLocaleCoverage, i18n, LANGUAGES, t } from "./i18n/index.js";
import { appSettings } from "../../backend/core/system/settings.service.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";

export const firstRunLanguageModal = {
  show({ markComplete = true } = {}) {
    const modal = document.createElement("section");
    modal.className = "language-picker-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "first-run-language-title");
    modal.innerHTML = `
      <div class="language-picker-panel">
        <div class="language-picker-main">
          <h2 id="first-run-language-title" data-i18n="languageSetup.title">${t("languageSetup.title")}</h2>
          <div class="language-picker-options" role="group" aria-label="${t("languageSetup.optionsLabel")}">
            ${LANGUAGES.map(
              ({ id, flag, name }) => `
                <button type="button" class="language-picker-option" data-language="${id}" data-language-name="${name} (${getLocaleCoverage(id)}%)" aria-label="${name} (${getLocaleCoverage(id)}%)">
                  <span class="language-flag language-picker-flag fi fi-${flag}" aria-hidden="true"></span>
                </button>`,
            ).join("")}
          </div>
          <button type="button" class="language-picker-continue" aria-label="${t("common.continue")}" disabled>
            <span data-i18n="common.continue">${t("common.continue")}</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    const options = [...modal.querySelectorAll(".language-picker-option")];
    const continueButton = modal.querySelector(".language-picker-continue");
    let resolveSelection;
    let selectedLocale = i18n.locale;
    const currentOption = options.find(
      (option) => option.dataset.language === selectedLocale,
    );
    currentOption?.classList.add("is-selected");
    continueButton.disabled = !currentOption;
    continueButton.classList.toggle("is-ready", Boolean(currentOption));
    const finish = (locale) => {
      if (markComplete) appSettings.set("firstRunLanguageSetupComplete", true);
      i18n.setLocale(locale, { reload: true });
      deactivateCheckoutDialog(modal);
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
        resolveSelection?.(locale);
      }, 260);
    };

    options.forEach((option) => {
      option.addEventListener("click", () => {
        selectedLocale = option.dataset.language;
        options.forEach((item) =>
          item.classList.toggle("is-selected", item === option),
        );
        i18n.setLocale(selectedLocale);
        i18n.apply(modal);
        continueButton.disabled = false;
        continueButton.classList.add("is-ready");
        continueButton.focus();
      });
    });
    continueButton.addEventListener("click", () => {
      if (selectedLocale) finish(selectedLocale);
    });
    activateCheckoutDialog(modal, modal, options[0], () => {
      finish(selectedLocale);
    });

    return new Promise((resolve) => {
      resolveSelection = resolve;
    });
  },
};
