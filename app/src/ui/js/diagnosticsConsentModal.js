import { appSettings } from "../../backend/core/settings.js";

export const diagnosticsConsentModal = {
  async showIfNeeded() {
    if (appSettings.get("diagnosticReportingConsentAnswered")) return;

    const modal = document.createElement("section");
    modal.className = "diagnostic-consent-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "diagnostic-consent-title");
    modal.innerHTML = `
      <div class="diagnostic-consent-panel">
        <div class="diagnostic-consent-icon" aria-hidden="true"><i class="fa-solid fa-shield-heart"></i></div>
        <div class="diagnostic-consent-main">
          <h2 id="diagnostic-consent-title">Help improve WeekBox</h2>
          <p>If WeekBox breaks, it can send an error report to the people who make WeekBox so they can fix it. Your personal file locations, email address, and common secret codes are removed before it is sent.</p>
          <label class="diagnostic-consent-choice">
            <span><strong>Send diagnostic reports</strong></span>
            <span class="switch"><input type="checkbox" checked /><span class="slider round"></span></span>
          </label>
          <button type="button" class="diagnostic-consent-confirm">Continue</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    const checkbox = modal.querySelector("input");
    const confirm = modal.querySelector(".diagnostic-consent-confirm");
    confirm.focus();
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") event.preventDefault();
    });

    await new Promise((resolve) => {
      confirm.addEventListener("click", async () => {
        confirm.disabled = true;
        appSettings.set("diagnosticReportingEnabled", checkbox.checked);
        appSettings.set("diagnosticReportingConsentAnswered", true);
        await appSettings.write().catch(() => {});
        modal.remove();
        resolve();
      });
    });
  },
};
