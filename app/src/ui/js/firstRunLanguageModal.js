import { getLocaleCoverage, i18n, LANGUAGES, t } from "./i18n/index.js";
import { appSettings } from "../../backend/core/system/settings.service.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";

const LANGUAGE_PAGE_SIZE = 9;

export const firstRunLanguageModal = {
  show({ markComplete = true } = {}) {
    const languageItems = [
      ...[...LANGUAGES]
        .sort(
          (left, right) =>
            getLocaleCoverage(right.id) - getLocaleCoverage(left.id),
        )
        .map((language) => ({ ...language, type: "language" })),
      { id: "translation-report", type: "report" },
    ];
    const pageCount = Math.ceil(languageItems.length / LANGUAGE_PAGE_SIZE);

    const modal = document.createElement("section");
    modal.className = "language-picker-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "first-run-language-title");
    modal.innerHTML = `
      <div class="language-picker-panel">
        <div class="language-picker-main">
          <h2 id="first-run-language-title" data-i18n="languageSetup.title">${t("languageSetup.title")}</h2>
          <div class="language-picker-options" role="group" aria-label="${t("languageSetup.optionsLabel")}"></div>
          <div class="language-picker-navigation">
            <button type="button" class="language-picker-nav" data-page-direction="previous" data-i18n-attr="aria-label:common.previous" aria-label="${t("common.previous")}">
              <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            </button>
            <span class="language-picker-page" aria-live="polite"></span>
            <button type="button" class="language-picker-nav" data-page-direction="next" data-i18n-attr="aria-label:common.next" aria-label="${t("common.next")}">
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
          <button type="button" class="language-picker-continue" aria-label="${t("common.continue")}" disabled>
            <span data-i18n="common.continue">${t("common.continue")}</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    const optionsContainer = modal.querySelector(".language-picker-options");
    const previousButton = modal.querySelector(
      '[data-page-direction="previous"]',
    );
    const nextButton = modal.querySelector('[data-page-direction="next"]');
    const pageLabel = modal.querySelector(".language-picker-page");
    const continueButton = modal.querySelector(".language-picker-continue");
    let resolveSelection;
    let selectedLocale = i18n.locale;
    let pageIndex = Math.floor(
      languageItems.findIndex((item) => item.id === selectedLocale) /
        LANGUAGE_PAGE_SIZE,
    );
    if (pageIndex < 0) pageIndex = 0;

    const openTranslationReport = () => {
      const reportOverlay = document.createElement("section");
      reportOverlay.className = "language-report-overlay";
      reportOverlay.setAttribute("role", "dialog");
      reportOverlay.setAttribute("aria-modal", "true");
      reportOverlay.setAttribute("aria-labelledby", "language-report-title");
      reportOverlay.innerHTML = `
        <div class="language-report-dialog">
          <button type="button" class="language-report-close" data-i18n-attr="aria-label:common.close" aria-label="${t("common.close")}">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          <div class="language-report-icon" aria-hidden="true">?</div>
          <h2 id="language-report-title" data-i18n="languageSetup.translationReportTitle">${t("languageSetup.translationReportTitle")}</h2>
          <p data-i18n="languageSetup.translationReportMessage">${t("languageSetup.translationReportMessage")}</p>
          <div class="language-report-actions">
            <a class="language-report-link" href="https://github.com/Crew-Awesome/Weekbox/issues" data-i18n="languageSetup.translationReportGithub">Report on GitHub</a>
            <a class="language-report-link" href="https://discord.gg/xQTtYF2Cfn" data-i18n="languageSetup.translationReportDiscord">Join the Discord server</a>
          </div>
        </div>`;
      document.body.appendChild(reportOverlay);
      const reportDialog = reportOverlay.querySelector(
        ".language-report-dialog",
      );
      const closeButton = reportOverlay.querySelector(".language-report-close");
      const closeReport = () => {
        deactivateCheckoutDialog(reportOverlay);
        reportOverlay.classList.remove("show");
        setTimeout(() => reportOverlay.remove(), 180);
      };
      closeButton.addEventListener("click", closeReport);
      reportOverlay.addEventListener("click", (event) => {
        if (event.target === reportOverlay) closeReport();
      });
      reportOverlay
        .querySelectorAll(".language-report-link")
        .forEach((link) => {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            void Neutralino.os.open(link.href).catch(() => {});
          });
        });
      requestAnimationFrame(() => reportOverlay.classList.add("show"));
      activateCheckoutDialog(
        reportOverlay,
        reportDialog,
        closeButton,
        closeReport,
      );
    };

    const renderPage = (direction = 0) => {
      const pageItems = languageItems.slice(
        pageIndex * LANGUAGE_PAGE_SIZE,
        (pageIndex + 1) * LANGUAGE_PAGE_SIZE,
      );
      optionsContainer.innerHTML = pageItems
        .map((item) => {
          if (item.type === "report") {
            return `<button type="button" class="language-picker-option language-picker-report" data-language="translation-report" data-language-name="${t("languageSetup.translationReportLabel")}" aria-label="${t("languageSetup.translationReportLabel")}">
              <span class="language-picker-report-mark" aria-hidden="true">?</span>
            </button>`;
          }
          const label = `${item.name} (${getLocaleCoverage(item.id)}%)`;
          return `<button type="button" class="language-picker-option" data-language="${item.id}" data-language-name="${label}" aria-label="${label}">
            <span class="language-flag language-picker-flag fi fi-${item.flag}" aria-hidden="true"></span>
          </button>`;
        })
        .join("");
      optionsContainer.querySelectorAll("[data-language]").forEach((option) => {
        option.classList.toggle(
          "is-selected",
          option.dataset.language === selectedLocale,
        );
        option.addEventListener("click", () => {
          if (option.dataset.language === "translation-report") {
            openTranslationReport();
            return;
          }
          selectedLocale = option.dataset.language;
          optionsContainer
            .querySelectorAll("[data-language]")
            .forEach((item) =>
              item.classList.toggle("is-selected", item === option),
            );
          i18n.setLocale(selectedLocale);
          i18n.apply(modal);
          continueButton.disabled = false;
          continueButton.classList.add("is-ready");
          continueButton.focus();
        });
      });
      previousButton.disabled = pageIndex === 0;
      nextButton.disabled = pageIndex === pageCount - 1;
      pageLabel.textContent = `${pageIndex + 1} / ${pageCount}`;
      if (direction) {
        optionsContainer.classList.add(
          direction > 0 ? "is-entering-next" : "is-entering-previous",
        );
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            optionsContainer.classList.remove(
              "is-entering-next",
              "is-entering-previous",
            ),
          ),
        );
      }
    };

    renderPage();
    continueButton.disabled = !selectedLocale;
    continueButton.classList.toggle("is-ready", Boolean(selectedLocale));
    previousButton.addEventListener("click", () => {
      if (pageIndex === 0) return;
      pageIndex -= 1;
      renderPage(-1);
    });
    nextButton.addEventListener("click", () => {
      if (pageIndex === pageCount - 1) return;
      pageIndex += 1;
      renderPage(1);
    });
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

    continueButton.addEventListener("click", () => {
      if (selectedLocale) finish(selectedLocale);
    });
    activateCheckoutDialog(
      modal,
      modal,
      modal.querySelector(".language-picker-option"),
      () => {
        finish(selectedLocale);
      },
    );

    return new Promise((resolve) => {
      resolveSelection = resolve;
    });
  },
};
