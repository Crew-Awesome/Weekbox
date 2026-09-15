import type { ISettingsService } from "@contracts";
import type { DesktopTransport } from "./transport";

export async function getDesktopBasePath(): Promise<string> {
  let basePath = window.NL_CWD || window.NL_PATH || "";
  try {
    if (window.Neutralino?.os?.getPath) {
      const dataPath = await window.Neutralino.os.getPath("data");
      basePath = `${dataPath}/WeekBox`;
    }
  } catch {}
  return basePath.replace(/\\/g, "/");
}

/**
 * Desktop settings storage implementation.
 */
export class DesktopSettings implements ISettingsService {
  private transport: DesktopTransport;

  constructor(transport: DesktopTransport) {
    this.transport = transport;
  }

  async getSettings(): Promise<Record<string, any>> {
    try {
      const base = await getDesktopBasePath();
      const settingsPath = `${base}/data/settings.json`;
      const exists = await this.transport.call("fs.exists", { path: settingsPath }).catch(() => false);
      if (exists) {
        const raw = await this.transport.call("fs.readFile", { path: settingsPath });
        return typeof raw === "string" ? JSON.parse(raw) : ((raw as any) || {});
      }
    } catch {}
    return {};
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      const base = await getDesktopBasePath();
      const dataDir = `${base}/data`;
      await this.transport.call("fs.createDirectory", { path: dataDir }).catch(() => {});
      const settingsPath = `${dataDir}/settings.json`;
      await this.transport.call("fs.writeFile", {
        path: settingsPath,
        content: JSON.stringify(settings, null, 2),
      });
      this.transport.emitLocalEvent("settings:changed", settings);
    } catch (err) {
      console.warn("Could not write settings.json:", err);
    }
  }
}
