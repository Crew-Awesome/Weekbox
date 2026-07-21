import { fetchAndRenderReleaseNotes } from "./releaseNotes.js";
import { getTargetLink, extractVersionFallback } from "./utils.js";
import { setupDropdown } from "../../utils/dropdown.js";

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
    optionsContainer.innerHTML = "";

    if (engine.versions.length === 0) {
      selectedText.textContent = "Unknown";
      badge.textContent = `Version: Unknown`;
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
      const optionDiv = document.createElement("div");
      optionDiv.className = "custom-option";
      if (index === 0) optionDiv.classList.add("selected");
      optionDiv.textContent = v.version;

      optionDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedText.textContent = v.version;
        badge.textContent = `Version: ${v.version}`;
        document
          .querySelectorAll(".custom-option")
          .forEach((opt) => opt.classList.remove("selected"));
        optionDiv.classList.add("selected");

        // Cerramos usando la nueva utilidad
        this.dropdownController?.close();

        fetchAndRenderReleaseNotes(v, getTargetLink(v));
        if (onVersionChanged) onVersionChanged(v.version);
      });
      optionsContainer.appendChild(optionDiv);
    });

    const initialVersion = engine.versions[0];
    selectedText.textContent = initialVersion.version;
    badge.textContent = `Version: ${initialVersion.version}`;
    fetchAndRenderReleaseNotes(initialVersion, getTargetLink(initialVersion));
    if (onVersionChanged) onVersionChanged(initialVersion.version);

    this.destroy(); // Limpia previos
    this.dropdownController = setupDropdown(trigger, dropdown);
  },
  destroy() {
    if (this.dropdownController) {
      this.dropdownController.destroy();
      this.dropdownController = null;
    }
  },
};
