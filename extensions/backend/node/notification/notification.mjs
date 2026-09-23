import { exec, spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the absolute path to the WeekBox PNG application icon.
 * Checks relative to this file and the working directory.
 */
function getAppIconPath() {
  const candidates = [
    path.resolve(__dirname, "../../../../assets/icon.png"),
    path.resolve(__dirname, "../../../../app/assets/icons/launcher-icon.png"),
    path.resolve(__dirname, "../../../../app/assets/icons/app/launcher-icon.png"),
    path.resolve(process.cwd(), "assets/icon.png"),
    path.resolve(process.cwd(), "app/assets/icons/launcher-icon.png"),
    path.resolve(process.cwd(), "../assets/icon.png"),
    path.resolve(process.cwd(), "../app/assets/icons/launcher-icon.png"),
  ];

  return candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || "";
}

/**
 * Escapes XML entity characters for safe inclusion in WinRT Toast XML.
 */
function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Node ESM Module for Native Operating System Notifications.
 * Supports Windows (win32), macOS (darwin), and Linux.
 * Explicitly brands all notifications with "WeekBox" as application title
 * and displays the official WeekBox PNG application icon.
 */
export const notificationApi = {
  /**
   * Dispatches a branded OS notification with WeekBox title and icon.
   *
   * @param {Function} [callApi] - Neutralino Extension callApi bridge fallback.
   * @param {Object} options - Notification options.
   * @param {string} [options.title="WeekBox"] - Notification title.
   * @param {string} [options.content=""] - Notification body text.
   * @param {string} [options.icon="INFO"] - Fallback icon type.
   */
  show: async (callApi, { title = "WeekBox", content = "", icon = "INFO" } = {}) => {
    return new Promise((resolve) => {
      const platform = process.platform;
      const safeTitle = title || "WeekBox";
      const safeContent = content || "";
      const iconPath = getAppIconPath();

      if (platform === "win32") {
        const winIconPath = iconPath ? iconPath.replace(/\//g, "\\") : "";
        const iconUri = iconPath ? "file:///" + iconPath.replace(/\\/g, "/") : "";
        const escapedTitle = escapeXml(safeTitle);
        const escapedContent = escapeXml(safeContent);

        const psScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$xmlString = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>${escapedTitle}</text>
      <text>${escapedContent}</text>
      ${iconUri ? `<image placement="appLogoOverride" hint-crop="circle" src="${iconUri}"/>` : ""}
    </binding>
  </visual>
</toast>
"@

$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
$xml.LoadXml($xmlString)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)

try {
  $regPath = "HKCU:\\Software\\Classes\\AppUserModelId\\WeekBox"
  if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
  }
  Set-ItemProperty -Path $regPath -Name "DisplayName" -Value "WeekBox" -Force
  ${winIconPath ? `Set-ItemProperty -Path $regPath -Name "IconUri" -Value "${winIconPath.replace(/"/g, '`"')}" -Force` : ""}
  Set-ItemProperty -Path $regPath -Name "IconBackgroundColor" -Value "0" -Force
  $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("WeekBox")
  $notifier.Show($toast)
} catch {
  $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe")
  $notifier.Show($toast)
}
Start-Sleep -Milliseconds 1200
`.trim();

        const encoded = Buffer.from(psScript, "utf16le").toString("base64");
        const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stderr = "";
        child.stderr?.on("data", (d) => { stderr += d.toString(); });

        child.on("close", (code) => {
          if (code !== 0 && stderr) {
            console.warn("[notification.mjs] PowerShell exit code:", code, stderr);
            if (typeof callApi === "function") {
              return callApi("os", "showNotification", { title: safeTitle, content: safeContent, icon })
                .then((r) => resolve(r ?? { ok: true, method: "neutralino-os" }))
                .catch(() => resolve({ ok: true, method: "powershell-toast" }));
            }
          }
          resolve({ ok: true, method: "powershell-toast" });
        });

        child.on("error", (err) => {
          console.warn("[notification.mjs] PowerShell error:", err);
          if (typeof callApi === "function") {
            callApi("os", "showNotification", { title: safeTitle, content: safeContent, icon })
              .then((r) => resolve(r ?? { ok: true, method: "neutralino-os" }))
              .catch((e) => resolve({ ok: false, error: String(e) }));
          } else {
            resolve({ ok: false, error: String(err) });
          }
        });
      } else if (platform === "darwin") {
        const cleanContent = safeContent.replace(/["\\]/g, " ");
        const cleanTitle = safeTitle.replace(/["\\]/g, " ");
        const script = `display notification "${cleanContent}" with title "WeekBox" subtitle "${cleanTitle}"`;
        const child = spawn("osascript", ["-e", script], { stdio: "ignore" });
        child.on("close", (code) => {
          if (code !== 0) {
            console.warn("[notification.mjs] osascript exit code:", code);
            if (typeof callApi === "function") {
              return callApi("os", "showNotification", { title: safeTitle, content: safeContent, icon })
                .then((r) => resolve(r ?? { ok: true, method: "neutralino-os" }))
                .catch(() => resolve({ ok: false, error: `osascript exited with code ${code}` }));
            }
            return resolve({ ok: false, error: `osascript exited with code ${code}` });
          }
          resolve({ ok: true, method: "darwin-osascript" });
        });
        child.on("error", (err) => {
          console.warn("[notification.mjs] osascript spawn error:", err);
          if (typeof callApi === "function") {
            return callApi("os", "showNotification", { title: safeTitle, content: safeContent, icon })
              .then((r) => resolve(r ?? { ok: true, method: "neutralino-os" }))
              .catch(() => resolve({ ok: false, error: String(err) }));
          }
          resolve({ ok: false, error: String(err) });
        });
      } else {
        const cleanContent = safeContent.replace(/["`$\\]/g, "");
        const cleanTitle = safeTitle.replace(/["`$\\]/g, "");
        const iconArg = iconPath ? `-i "${iconPath}"` : "";
        exec(`notify-send -a "WeekBox" ${iconArg} "${cleanTitle}" "${cleanContent}"`, (error) => {
          if (error) {
            console.warn("[notification.mjs] notify-send error:", error);
            if (typeof callApi === "function") {
              return callApi("os", "showNotification", { title: safeTitle, content: safeContent, icon })
                .then((r) => resolve(r ?? { ok: true }))
                .catch(() => resolve({ ok: false, error: String(error) }));
            }
            return resolve({ ok: false, error: String(error) });
          }
          resolve({ ok: true, method: "linux-notify-send" });
        });
      }
    });
  },
};
