import { router } from "../core/router.js";
import { setSelectedEngine } from "../core/state.js";
import { getEngineReleaseVersions } from "../api/githubReleaseProvider.js";
import { modManagerModal } from "./mod-manager/index.js";
import { engineManagerModal } from "./engine-manager/index.js";
import { engineUpdateService } from "./engines/engineUpdateService.js";
import { FS } from "../utils/filesystem.js";
import { configModal } from "./config/index.js";

export const sidebar = {
  updateEngineMarquee(button) {
    const container = button.querySelector(".marquee-container");
    const label = button.querySelector(".marquee-text");
    if (!container || !label) return;
    requestAnimationFrame(() => {
      const distance = Math.max(0, label.scrollWidth - container.clientWidth);
      label.classList.toggle("is-overflowing", distance > 1);
      label.style.setProperty("--marquee-distance", `${distance}px`);
      label.title = distance > 1 ? label.textContent : "";
    });
  },
  refreshEngineMarquees() {
    document
      .querySelectorAll(".engine-btn")
      .forEach((button) => this.updateEngineMarquee(button));
  },
  async init() {
    this.sidebar = document.getElementById("sidebar");
    this.resizer = document.getElementById("sidebar-resizer");
    this.tabButtons = document.querySelectorAll(".nav-btn[data-tab]");
    this.modManagerBtn = document.getElementById("mod-manager-btn");
    this.engineManagerBtn = document.getElementById("engine-manager-btn");
    this.configBtn = document.getElementById("config-btn");
    this.isResizing = false;
    if (!this.sidebar) return;
    this.setupResizer();
    this.setupNavigation();
    await this.loadEngines();
    engineUpdateService.startScheduledChecks();
  },
  setupResizer() {
    if (!this.resizer) return;
    this.resizer.addEventListener("mousedown", () => {
      this.isResizing = true;
      document.body.style.cursor = "ew-resize";
      this.resizer.classList.add("resizing");
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 500) newWidth = 500;
      this.sidebar.style.width = `${newWidth}px`;
      this.refreshEngineMarquees();
    });
    document.addEventListener("mouseup", () => {
      if (this.isResizing) {
        this.isResizing = false;
        document.body.style.cursor = "default";
        this.resizer.classList.remove("resizing");
      }
    });
  },
  setupNavigation() {
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tabButtons.forEach((b) => b.classList.remove("active"));
        if (this.modManagerBtn) this.modManagerBtn.classList.remove("active");
        if (this.engineManagerBtn) this.engineManagerBtn.classList.remove("active");
        if (this.configBtn) this.configBtn.classList.remove("active");
        const engineBtns = document.querySelectorAll(".engine-btn");
        engineBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const viewToLoad = btn.getAttribute("data-tab");
        router.navigate(viewToLoad);
      });
    });
    if (this.modManagerBtn) {
      this.modManagerBtn.addEventListener("click", () => {
        modManagerModal.open();
      });
    }
    if (this.engineManagerBtn) {
      this.engineManagerBtn.addEventListener("click", () => {
        engineManagerModal.open();
      });
    }
    if (this.configBtn) {
      this.configBtn.addEventListener("click", () => {
        configModal.open();
      });
    }
  },
  extractVersionFromUrl(url) {
    if (!url) return "Unknown";
    const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
    if (githubMatch && githubMatch[2]) return githubMatch[2];
    const genericMatch = url.match(/(?:v|-)?(\d+\.\d+(?:\.\d+)?)/i);
    if (genericMatch && genericMatch[1]) return genericMatch[1];
    return "Unknown";
  },
  async loadEngines() {
    const wrapper = document.getElementById("engines-wrapper");
    if (!wrapper) return;
    try {
      const response = await fetch("src/data/engines-router.json");
      if (!response.ok) throw new Error("Failed to load engines-router.json");
      const enginesRouter = await response.json();
      wrapper.innerHTML = "";
      for (const engineDef of enginesRouter) {
        const displayName = engineDef.name;
        const iconSrc = engineDef.icon ? `assets/icons/${engineDef.icon}` : "";
        const btn = document.createElement("button");
        btn.className = "nav-btn engine-btn";
        btn.innerHTML = `
          <img src="${iconSrc}" class="engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
          <div class="marquee-container"><span class="marquee-text">${displayName}</span></div>
        `;
        btn.addEventListener("click", async () => {
          this.tabButtons.forEach((b) => b.classList.remove("active"));
          if (this.modManagerBtn) this.modManagerBtn.classList.remove("active");
          if (this.engineManagerBtn) this.engineManagerBtn.classList.remove("active");
          if (this.configBtn) this.configBtn.classList.remove("active");
          const engineBtns = document.querySelectorAll(".engine-btn");
          engineBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          try {
            const originalText = btn.querySelector("span").textContent;
            btn.querySelector("span").innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Loading...`;
            const releaseVersions = await getEngineReleaseVersions(engineDef.versions);
            if (releaseVersions.length === 0) throw new Error("No compatible releases available");
            const processedVersionsData = releaseVersions.map((item) => {
              const sampleLink = item.win || item.win64 || item.win32 || item.lin || item.mac || item.mac64 || item.macarm || "";
              return { ...item, version: item.version || this.extractVersionFromUrl(sampleLink) };
            });
            processedVersionsData.sort((a, b) => {
              if (a.isNightly) return -1;
              if (b.isNightly) return 1;
              return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" });
            });
            btn.querySelector("span").textContent = originalText;
            setSelectedEngine({ id: engineDef.versions, meta: { name: engineDef.name, icon: engineDef.icon }, versions: processedVersionsData });
            router.navigate("engines");
          } catch (err) {
            console.error(err);
            btn.querySelector("span").textContent = displayName;
            alert(`Could not load version information for ${displayName}`);
          }
        });
        wrapper.appendChild(btn);
        this.updateEngineMarquee(btn);
      }
    } catch (error) {
      console.error(error);
      wrapper.innerHTML = `<p style="color:red; padding:8px; font-size:12px;">Failed to load engine router</p>`;
    }
  },
  async loadStandaloneMods() {
    if (!FS.isInitialized) await FS.init();
    const existingContainer = document.getElementById("standalone-mods-container");
    if (existingContainer) existingContainer.remove();
    const existingWrapper = document.getElementById("standalone-mods-wrapper");
    const existingDivider = document.getElementById("standalone-mods-divider");
    const existingTitle = document.getElementById("standalone-mods-title");
    if (existingWrapper) existingWrapper.remove();
    if (existingDivider) existingDivider.remove();
    if (existingTitle) existingTitle.remove();
    const allStandaloneMods = await FS.getStandaloneMods();
    const standaloneMods = allStandaloneMods.filter((mod) => !mod.hidden);
    if (standaloneMods.length === 0) return;
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (!sidebarNav) return;
    const container = document.createElement("div");
    container.className = "engines-list";
    container.id = "standalone-mods-container";
    const divider = document.createElement("div");
    divider.className = "nav-divider";
    container.appendChild(divider);
    const sectionTitle = document.createElement("p");
    sectionTitle.className = "section-title";
    sectionTitle.textContent = "Standalone Mods";
    container.appendChild(sectionTitle);
    const wrapper = document.createElement("div");
    wrapper.className = "engines-wrapper";
    wrapper.id = "standalone-mods-wrapper";
    container.appendChild(wrapper);
    sidebarNav.appendChild(container);
    for (const mod of standaloneMods) {
      const btn = document.createElement("button");
      btn.className = "nav-btn engine-btn standalone-btn";
      const iconSrc = mod.icoPath || "data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>";
      btn.innerHTML = `
        <img src="${iconSrc}" class="engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
        <div class="marquee-container"><span class="marquee-text">${mod.name}</span></div>
      `;
      btn.addEventListener("click", async () => {
        if (btn.classList.contains("running")) {
          const process = FS.activeEngineProcesses.get(`standalone:${mod.id}`);
          if (process) {
            btn.querySelector(".marquee-container").innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Closing...`;
            Neutralino.os.updateSpawnedProcess(process.id, "exit").catch(() => {});
          }
          return;
        }
        this.tabButtons.forEach((b) => b.classList.remove("active"));
        if (this.modManagerBtn) this.modManagerBtn.classList.remove("active");
        if (this.engineManagerBtn) this.engineManagerBtn.classList.remove("active");
        if (this.configBtn) this.configBtn.classList.remove("active");
        const engineBtns = document.querySelectorAll(".engine-btn");
        engineBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const originalText = btn.querySelector(".marquee-text").textContent;
        btn.querySelector(".marquee-container").innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-stop" style="color: #ff4a4a;" title="Stop"></i>
            <span>Launched</span>
          </div>
        `;
        btn.classList.add("running");
        await FS.runStandaloneMod(mod.id, () => {
          btn.querySelector(".marquee-container").innerHTML = `<span class="marquee-text">${originalText}</span>`;
          this.updateEngineMarquee(btn);
          btn.classList.remove("running");
          btn.classList.remove("active");
        });
      });
      wrapper.appendChild(btn);
      this.updateEngineMarquee(btn);
    }
  }
};