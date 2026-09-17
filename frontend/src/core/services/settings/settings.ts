import type { ISettingsService } from "@contracts";
import { platform } from "@platform";

/**
 * Domain service managing persistence of application settings (SRP / OCP).
 */
export class SettingsService implements ISettingsService {
  private readonly provider: ISettingsService;

  constructor(provider?: ISettingsService) {
    this.provider = provider || platform.settings;
  }

  async getSettings(): Promise<Record<string, any>> {
    return this.provider.getSettings();
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    return this.provider.saveSettings(settings);
  }
}

export const settingsService = new SettingsService();
