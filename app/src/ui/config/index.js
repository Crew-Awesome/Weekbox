import { appSettings } from "../../core/settings.js";

export const configModal = {
  async init() {
    if (!document.getElementById("config-modal")) {
      const response = await fetch("src/html/sections/config-modal.html");
      if (!response.ok) return;

      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);

      this.bindEvents();
    }
  },

  bindEvents() {
    document
      .getElementById("config-close-btn")
      .addEventListener("click", () => this.close());
    document.getElementById("config-modal").addEventListener("click", (e) => {
      if (e.target.id === "config-modal") this.close();
    });
    document.querySelectorAll("#config-modal a[href]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        Neutralino.os.open(link.href).catch(() => {});
      });
    });
    document
      .querySelector('[data-credit-message="Oyachi"]')
      ?.addEventListener("click", () => {
        Neutralino.os
          .showMessageBox(
            "To Oyachi",
            "Sorry for not using your logo and art. I really loved it, and I do love you a lot. I always will.\n\n— Malloy",
            "OK",
            "INFO",
          )
          .catch(() => {});
      });

    // Cambiar Tabs (Pestañas)
    const tabBtns = document.querySelectorAll(".config-tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const targetId = btn.getAttribute("data-tab-target");
        document.querySelectorAll(".config-tab-content").forEach((content) => {
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
          titleElement.textContent =
            targetId.charAt(0).toUpperCase() + targetId.slice(1);
        }
      });
    });

    // Detectar cambios en los Toggles/Switches
    const toggleIds = [
      "launchOnStartup",
      "blurOutOfFocus",
      "hideOnLaunch",
      "autoStartAfterDownload",
      "multithreadDownloads",
      "checkUpdatesOnStartup",
      "checkUpdatesInBackground",
    ];

    toggleIds.forEach((settingKey) => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.addEventListener("change", async (e) => {
          const enabled = e.target.checked;
          if (settingKey === "launchOnStartup") {
            const updated = await this.handleStartupToggle(enabled);
            if (!updated) {
              checkbox.checked = appSettings.get(settingKey);
              return;
            }
          }
          appSettings.set(settingKey, enabled);
        });
      }
    });
  },

  loadSettingsToUI() {
    const toggleIds = [
      "launchOnStartup",
      "blurOutOfFocus",
      "hideOnLaunch",
      "autoStartAfterDownload",
      "multithreadDownloads",
      "checkUpdatesOnStartup",
      "checkUpdatesInBackground",
    ];

    toggleIds.forEach((settingKey) => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.checked = appSettings.get(settingKey);
      }
    });
  },

  async handleStartupToggle(enabled) {
    if (window.NL_OS !== "Windows") return false;
    try {
      const exePath = `${window.NL_PATH}\\WeekBox.exe`;
      if (enabled) await Neutralino.filesystem.getStats(exePath);
      const command = enabled
        ? `cmd /c reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /t REG_SZ /d "\\"${exePath}\\"" /f`
        : `cmd /c reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /f`;
      const result = await Neutralino.os.execCommand(command, {
        background: false,
      });
      if (result.exitCode !== 0) {
        throw new Error(result.stdErr || "Windows Registry command failed");
      }
      return true;
    } catch (error) {
      console.error("Could not configure Windows startup", error);
      return false;
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
  },
};
