import { emitViewChange } from "./events.service.js";

import { sidebar } from "../../../ui/js/sidebar.js";
import { i18n, t } from "../../../ui/js/i18n/index.js";
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
        "/app/src/ui/html/index.html",
      ];
      const parser = new DOMParser();
      const requiredTemplateIds = [
        "tpl-mainModal",
        "tpl-config-modal",
        "tpl-home",
        "tpl-sidebar",
      ];
      for (const file of templateFiles) {
        let loaded = false;
        for (let attempt = 1; attempt <= 3 && !loaded; attempt += 1) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(file, {
              signal: controller.signal,
              cache: "no-store",
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            const doc = parser.parseFromString(html, "text/html");
            const missingTemplateIds = requiredTemplateIds.filter(
              (id) => !document.getElementById(id) && !doc.getElementById(id),
            );
            if (missingTemplateIds.length) {
              throw new Error(
                `Template response was incomplete: ${missingTemplateIds.join(", ")}`,
              );
            }
            const templates = doc.querySelectorAll("template");
            templates.forEach((t) => {
              if (t.id && !document.getElementById(t.id)) {
                document.body.appendChild(document.importNode(t, true));
              }
            });
            loaded = true;
          } catch (fetchErr) {
            if (attempt === 3) {
              console.warn(`Could not load template file: ${file}`, fetchErr);
            } else {
              await new Promise((resolve) =>
                setTimeout(resolve, attempt * 250),
              );
            }
          }
        }
        if (loaded) break;
      }
      const missingTemplates = requiredTemplateIds.filter(
        (id) => !document.getElementById(id),
      );
      if (missingTemplates.length) {
        throw new Error(
          `WeekBox interface templates are unavailable: ${missingTemplates.join(", ")}`,
        );
      }
      const sidebarTpl = document.getElementById("tpl-sidebar");
      if (sidebarTpl) {
        this.sidebarContainer.replaceChildren(
          sidebarTpl.content.cloneNode(true),
        );
        i18n.apply(this.sidebarContainer);
      }
    } catch (error) {
      console.error("Failed to load templates", error);
      throw error;
    }
    await sidebar.init();
    await this.navigate("home");
  },
  async loadComponent(container, path) {},
  async navigate(viewId) {
    const navigationId = (this.navigationId || 0) + 1;
    this.navigationId = navigationId;
    try {
      if (!this.mainContent)
        throw new Error("Main content container is missing.");
      const tpl = document.getElementById("tpl-" + viewId);
      if (tpl) {
        const shouldAnimate =
          this.currentViewId && this.currentViewId !== viewId;
        if (shouldAnimate) {
          this.mainContent.classList.remove("app-layout__content--entering");
          this.mainContent.classList.add("app-layout__content--leaving");
          await new Promise((resolve) => setTimeout(resolve, 180));
          if (navigationId !== this.navigationId) return;
        }
        this.mainContent.replaceChildren(tpl.content.cloneNode(true));
        i18n.apply(this.mainContent);
        this.currentViewId = viewId;
        this.mainContent.classList.remove("app-layout__content--leaving");
        if (shouldAnimate) {
          this.mainContent.classList.add("app-layout__content--entering");
          setTimeout(() => {
            if (navigationId === this.navigationId)
              this.mainContent.classList.remove(
                "app-layout__content--entering",
              );
          }, 320);
        }
        emitViewChange(viewId);
      } else {
        throw new Error("View template not found: tpl-" + viewId);
      }
    } catch (error) {
      const errorMsg = document.createElement("p");
      errorMsg.className = "router-error-message";
      errorMsg.style.padding = "24px";
      errorMsg.style.color = "#ff4a4a";
      errorMsg.textContent = t("startup.viewLoadFailed", { view: viewId });
      this.mainContent.replaceChildren(errorMsg);
      this.mainContent.classList.remove(
        "app-layout__content--leaving",
        "app-layout__content--entering",
      );
    }
  },
};

export { router };
