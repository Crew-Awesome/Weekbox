import { platform } from "../../platform";
import type { BackendOperation } from "../types";

export interface SystemNotificationOptions {
  title: string;
  content: string;
  icon?: "INFO" | "WARNING" | "ERROR";
}

function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * @description Unified interface for Native OS Notifications.
 * Delegates to the Node ESM backend module or falls back to PowerShell/Web Notification API.
 */
export const notificationApi = {
  async showNotification(options: SystemNotificationOptions): Promise<{ ok: boolean; method?: string; error?: string }> {
    if (platform.platformName === "web") {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(options.title, { body: options.content });
          return { ok: true, method: "web-notification" };
        } else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            new Notification(options.title, { body: options.content });
            return { ok: true, method: "web-notification" };
          }
        }
      }
      return { ok: false, error: "Web notifications unavailable or permission denied" };
    }

    try {
      const result = await platform.call("notification.show" as BackendOperation, options);
      return (result as { ok: boolean; method?: string; error?: string }) || { ok: true };
    } catch (e: any) {
      console.warn("[Core.notification] Backend notification.show failed, trying direct OS fallback:", e);

      if (typeof window !== "undefined" && window.Neutralino?.os?.execCommand && window.NL_OS === "Windows") {
        try {
          const basePath = window.NL_PATH || "";
          const iconPath = basePath ? `${basePath}/assets/icon.png`.replace(/\\/g, "/") : "";
          const winIconPath = iconPath.replace(/\//g, "\\");
          const iconUri = iconPath ? `file:///${iconPath}` : "";
          const escapedTitle = escapeXml(options.title || "WeekBox");
          const escapedContent = escapeXml(options.content || "");

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
  if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
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

          const utf16Bytes: number[] = [];
          for (let i = 0; i < psScript.length; i++) {
            const code = psScript.charCodeAt(i);
            utf16Bytes.push(code & 0xff, (code >> 8) & 0xff);
          }
          const base64Ps = btoa(String.fromCharCode(...utf16Bytes));
          await (window.Neutralino.os as any).execCommand(
            `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${base64Ps}`,
            { background: true }
          );
          return { ok: true, method: "neutralino-exec-toast" };
        } catch (execErr) {
          console.warn("[Core.notification] Direct PowerShell toast fallback failed:", execErr);
        }
      }

      if (typeof window !== "undefined" && window.Neutralino?.os?.showNotification) {
        try {
          await window.Neutralino.os.showNotification(
            options.title,
            options.content,
            (options.icon as any) || "INFO"
          );
          return { ok: true, method: "neutralino-direct" };
        } catch (neuErr) {
          console.warn("[Core.notification] Direct Neutralino fallback also failed:", neuErr);
        }
      }

      return { ok: false, error: e?.message || String(e) };
    }
  },
};

export default notificationApi;
