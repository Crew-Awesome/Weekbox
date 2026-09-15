import type { ISettingsService } from "@contracts";

/**
 * Settings persistence in Web localStorage.
 */
export class WebSettings implements ISettingsService {
  async getSettings(): Promise<Record<string, any>> {
    try {
      const raw = localStorage.getItem("wb_app_settings");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      localStorage.setItem("wb_app_settings", JSON.stringify(settings));
    } catch {}
  }
}
