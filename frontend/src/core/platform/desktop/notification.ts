import type {
  INotificationService,
  SystemNotificationOptions,
  NotificationResult,
} from "@contracts";
import type { DesktopTransport } from "./transport";
import type { BackendOperation } from "../../backend/types";

function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Desktop notification driver (Node IPC -> PowerShell WinRT Toast -> Neutralino C++ API).
 */
export class DesktopNotification implements INotificationService {
  private transport: DesktopTransport;

  constructor(transport: DesktopTransport) {
    this.transport = transport;
  }

  async showNotification(options: SystemNotificationOptions): Promise<NotificationResult> {
    try {
      const result = await this.transport.call("notification.show" as BackendOperation, options);
      return (result as NotificationResult) || { ok: true, method: "node-ipc" };
    } catch (e: any) {
      // Fallback 1: Direct Windows PowerShell Toast Notification
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
        } catch {}
      }

      // Fallback 2: Direct macOS osascript via Neutralino execCommand
      if (typeof window !== "undefined" && window.Neutralino?.os?.execCommand && window.NL_OS === "Darwin") {
        try {
          const cleanTitle = (options.title || "WeekBox").replace(/["\\]/g, " ");
          const cleanContent = (options.content || "").replace(/["\\]/g, " ");
          await (window.Neutralino.os as any).execCommand(
            `osascript -e 'display notification "${cleanContent}" with title "WeekBox" subtitle "${cleanTitle}"'`,
            { background: true }
          );
          return { ok: true, method: "neutralino-exec-darwin" };
        } catch {}
      }

      // Fallback 3: Direct Neutralino OS Notification
      if (typeof window !== "undefined" && window.Neutralino?.os?.showNotification) {
        try {
          await window.Neutralino.os.showNotification(
            options.title,
            options.content,
            (options.icon as any) || "INFO"
          );
          return { ok: true, method: "neutralino-direct" };
        } catch {}
      }

      return { ok: false, error: e?.message || String(e) };
    }
  }
}
