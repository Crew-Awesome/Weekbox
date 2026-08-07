import { emitViewChange } from "./events.service.js";

import { sidebar } from "../../../ui/js/sidebar.js";
import { i18n } from "../../../ui/js/i18n/index.js";
var router;

router = {
  async init() {
    this.mainContent = document.getElementById("main-content");
    this.sidebarContainer = document.getElementById("sidebar-container");
    if (!this.mainContent || !this.sidebarContainer) {
      throw new Error(
        "WeekBox startup interface is missing required containers.",
      );
    }
    try {
      const templateFiles = [
        "src/ui/html/index.html",
        "src/ui/html/context-menu.html",
        "src/ui/html/engine-manager.html",
        "src/ui/html/engine-update-modal.html",
        "src/ui/html/engine-launch-button.html",
        "src/ui/html/engine-release-notes.html",
      ];
      const parser = new DOMParser();
      for (const file of templateFiles) {
        try {
          const response = await fetch(file);
          if (response.ok) {
            const html = await response.text();
            const doc = parser.parseFromString(html, "text/html");
            const templates = doc.querySelectorAll("template");
            templates.forEach((t) => {
              if (t.id && !document.getElementById(t.id)) {
                document.body.appendChild(document.importNode(t, true));
              }
            });
          }
        } catch (fetchErr) {
          console.warn(`Could not load template file: ${file}`, fetchErr);
        }
      }
      const sidebarTpl = document.getElementById("tpl-sidebar");
      if (sidebarTpl) {
        this.sidebarContainer.replaceChildren(
          sidebarTpl.content.cloneNode(true),
        );
        i18n.apply(this.sidebarContainer);
      }
    } catch (e) {
      console.error("Failed to load templates", e);
    }
    await sidebar.init();
    await this.navigate("home");
  },
  async loadComponent(container, path) {},
  async navigate(viewId) {
    try {
      if (!this.mainContent)
        throw new Error("Main content container is missing.");
      const tpl = document.getElementById("tpl-" + viewId);
      if (tpl) {
        this.mainContent.replaceChildren(tpl.content.cloneNode(true));
        i18n.apply(this.mainContent);
        this.currentViewId = viewId;
        emitViewChange(viewId);
      } else {
        throw new Error("View template not found: tpl-" + viewId);
      }
    } catch (error) {
      const errorMsg = document.createElement("p");
      errorMsg.className = "router-error-message";
      errorMsg.style.padding = "24px";
      errorMsg.style.color = "#ff4a4a";
      errorMsg.textContent = `Failed to load view: ${viewId}`;
      this.mainContent.replaceChildren(errorMsg);
    }
  },
};

export { router };
