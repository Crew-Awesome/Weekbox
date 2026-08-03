import { emitViewChange } from "./events.service.js";

import { sidebar } from "../../../ui/js/index.js";
import { i18n } from "../../../ui/js/i18n/index.js";
var router;

router = {
  async init() {
    this.mainContent = document.getElementById("main-content");
    this.sidebarContainer = document.getElementById("sidebar-container");
    try {
      const response = await fetch("src/ui/html/index.html");
      const html = await response.text();
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const templates = temp.querySelectorAll("template");
      templates.forEach((t) => document.body.appendChild(t));
      const sidebarTpl = document.getElementById("tpl-sidebar");
      if (sidebarTpl) this.sidebarContainer.innerHTML = sidebarTpl.innerHTML;
      i18n.apply(this.sidebarContainer);
    } catch (e) {
      console.error("Failed to load templates", e);
    }
    await sidebar.init();
    await this.navigate("home");
  },
  async loadComponent(container, path) {},
  async navigate(viewId) {
    try {
      const tpl = document.getElementById("tpl-" + viewId);
      if (tpl) {
        this.mainContent.innerHTML = tpl.innerHTML;
        i18n.apply(this.mainContent);
        this.currentViewId = viewId;
        emitViewChange(viewId);
      } else {
        throw new Error("View template not found: tpl-" + viewId);
      }
    } catch (error) {
      this.mainContent.innerHTML =
        '<p style="padding: 24px; color: #ff4a4a;">Failed to load view: ' +
        viewId +
        "</p>";
    }
  },
};

export { router };
