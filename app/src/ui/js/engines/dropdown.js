import { fetchAndRenderReleaseNotes } from "./releaseNotes.js";
import {
  getTargetLink,
  getTargetPlatform,
  extractVersionFallback,
} from "./utils.js";
import { setupDropdown } from "../../utils/components/dropdown.component.js";
import { t } from "../i18n/index.js";

function getVersionLabel(versionData) {
  const label = versionData.label || versionData.version;
  const usesWine =
    (window.NL_OS === "Linux" || window.NL_OS === "Darwin") &&
    getTargetPlatform(versionData) === "win";
  return usesWine ? `${label} (Wine)` : label;
}

export const engineDropdown = {
  dropdownController: null,
  setup(engine, onVersionChanged) {
    const dropdown = document.getElementById("engine-version-dropdown");
    let trigger = document.getElementById("engine-version-trigger");
    const optionsContainer = document.getElementById("engine-version-options");
    const badge = document.getElementById("engine-display-version");

    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    trigger = newTrigger;

    const selectedText = document.getElementById("engine-version-selected");
    optionsContainer.replaceChildren();

    if (engine.versions.length === 0) {
      selectedText.textContent = t("common.unknown");
      badge.textContent = `${t("common.version")}: ${t("common.unknown")}`;
      return;
    }

    engine.versions.forEach((v, index) => {
      if (!v.version || v.version === "Unknown") {
        const sampleLink =
          v.win64 ||
          v.win32 ||
          v.win ||
          v.lin ||
          v.mac ||
          Object.values(v).find(
            (val) => typeof val === "string" && val.startsWith("http"),
          ) ||
          "";
        v.version = extractVersionFallback(sampleLink);
      }
      const optionDiv = document.createElement("button");
      optionDiv.type = "button";
      optionDiv.setAttribute("role", "option");
      optionDiv.setAttribute("aria-selected", String(index === 0));
      optionDiv.className = "custom-option";
      if (index === 0) optionDiv.classList.add("selected");
      optionDiv.textContent = getVersionLabel(v);

      optionDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        const versionLabel = getVersionLabel(v);
        selectedText.textContent = versionLabel;
        badge.textContent = `${t("common.version")}: ${versionLabel}`;
        optionsContainer.querySelectorAll(".custom-option").forEach((opt) => {
          opt.classList.remove("selected");
          opt.setAttribute("aria-selected", "false");
        });
        optionDiv.classList.add("selected");
        optionDiv.setAttribute("aria-selected", "true");


        this.dropdownController?.close();

        fetchAndRenderReleaseNotes(v, getTargetLink(v));
        if (onVersionChanged) onVersionChanged(v.version);
      });
      optionsContainer.appendChild(optionDiv);
    });

    const initialVersion = engine.versions[0];
    const initialVersionLabel = getVersionLabel(initialVersion);
    selectedText.textContent = initialVersionLabel;
    badge.textContent = `${t("common.version")}: ${initialVersionLabel}`;
    fetchAndRenderReleaseNotes(initialVersion, getTargetLink(initialVersion));
    if (onVersionChanged) onVersionChanged(initialVersion.version);

    this.destroy();
    this.dropdownController = setupDropdown(trigger, dropdown, {
      menuElement: optionsContainer,
    });
  },
  destroy() {
    if (this.dropdownController) {
      this.dropdownController.destroy();
      this.dropdownController = null;
    }
  },
};
