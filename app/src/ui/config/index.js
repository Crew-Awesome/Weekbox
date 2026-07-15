import { appSettings } from "../../core/settings.js";

export const configModal = {
  async init() {
    if (!document.getElementById("config-modal")) {
      const response = await fetch("src/html/config-modal.html");
      if (!response.ok) return;
      
      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);

      this.bindEvents();
    }
  },

  bindEvents() {
    document.getElementById("config-close-btn").addEventListener("click", () => this.close());
    document.getElementById("config-modal").addEventListener("click", (e) => {
      if (e.target.id === "config-modal") this.close();
    });

    // Cambiar Tabs (Pestañas)
    const tabBtns = document.querySelectorAll(".config-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const targetId = btn.getAttribute("data-tab-target");
        document.querySelectorAll(".config-tab-content").forEach(content => {
          content.style.display = "none";
          content.classList.remove("active");
        });
        
        const targetContent = document.getElementById(`config-${targetId}`);
        if (targetContent) {
          targetContent.style.display = "block";
          targetContent.classList.add("active");
        }
        
        const titleElement = document.getElementById("config-section-title");
        if (titleElement) {
          titleElement.textContent = targetId.charAt(0).toUpperCase() + targetId.slice(1);
        }
      });
    });

    // Detectar cambios en los Toggles/Switches
    const toggleIds = [
      "launchOnStartup", 
      "blurOutOfFocus", 
      "hideOnLaunch", 
      "autoStartAfterDownload"
    ];

    toggleIds.forEach(settingKey => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          appSettings.set(settingKey, e.target.checked);
          if (settingKey === "launchOnStartup") {
            this.handleStartupToggle(e.target.checked);
          }
        });
      }
    });
  },

  loadSettingsToUI() {
    const toggleIds = [
      "launchOnStartup", 
      "blurOutOfFocus", 
      "hideOnLaunch", 
      "autoStartAfterDownload"
    ];

    toggleIds.forEach(settingKey => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.checked = appSettings.get(settingKey);
      }
    });
  },

  async handleStartupToggle(enabled) {
    if (window.NL_OS === 'Windows') {
      try {
        const exePath = `${window.NL_CWD}\\WeekBox.exe`; 
        const command = enabled 
            ? `cmd /c reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /t REG_SZ /d "\\"${exePath}\\"" /f`
            : `cmd /c reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /f`;
        
        await Neutralino.os.execCommand(command, { background: true });
      } catch (e) {
        console.error("No se pudo configurar el registro de inicio de Windows", e);
      }
    }
  },

  async open() {
    await this.init();
    const modal = document.getElementById("config-modal");
    if (!modal) return;
    
    // Carga los valores actuales visualmente
    this.loadSettingsToUI();

    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
  },

  close() {
    const modal = document.getElementById("config-modal");
    if (!modal) return;
    
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
};