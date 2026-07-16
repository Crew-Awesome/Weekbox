import { emitViewChange } from "./events.js";
import { sidebar } from "../ui/sidebar.js";

export const router = {
  async init() {
    this.mainContent = document.getElementById("main-content");
    this.sidebarContainer = document.getElementById("sidebar-container");
    // El sidebar se mantiene en su ruta original
    await this.loadComponent(this.sidebarContainer, "src/html/sidebar.html");
    await sidebar.init();
    await this.navigate("home");
  },
  async loadComponent(container, path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not find HTML file: ${path}`);
    container.innerHTML = await response.text();
  },
  async navigate(viewId) {
    try {
      // Las secciones del router ahora apuntan a la carpeta sections
      await this.loadComponent(this.mainContent, `src/html/sections/${viewId}.html`);
      emitViewChange(viewId);
    } catch (error) {
      this.mainContent.innerHTML = `<p style="padding: 24px; color: #ff4a4a;">Failed to load view: ${viewId}.html</p>`;
    }
  },
};