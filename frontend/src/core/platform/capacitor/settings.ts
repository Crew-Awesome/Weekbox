import type { ISettingsService } from "@contracts";
import { CapacitorJsonStorage } from "./json-storage";

/**
 * Settings persistence in mobile/Capacitor environment using data/settings.json.
 */
export class CapacitorSettings implements ISettingsService {
  private readonly settingsPath = "data/settings.json";

  async getSettings(): Promise<Record<string, any>> {
    return CapacitorJsonStorage.readJson<Record<string, any>>(this.settingsPath, {});
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    await CapacitorJsonStorage.writeJson(this.settingsPath, settings);
  }
}
