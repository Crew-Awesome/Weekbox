let nativeWindowFocused = true;

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodePowerShell(script) {
  const bytes = new Uint8Array(script.length * 2);
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  return btoa(String.fromCharCode(...bytes));
}

async function showWindowsNotification(title, message) {
  const xml = `<toast><visual><binding template="ToastGeneric"><text>${escapeXml(title)}</text><text>${escapeXml(message)}</text></binding></visual></toast>`;
  const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
$xml.LoadXml(@"
${xml}
"@)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
try {
  $regPath = "HKCU:\\Software\\Classes\\AppUserModelId\\WeekBox"
  if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
  Set-ItemProperty -Path $regPath -Name "DisplayName" -Value "WeekBox" -Force
  $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("WeekBox")
  $notifier.Show($toast)
} catch {
  $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe")
  $notifier.Show($toast)
}
`.trim();
  const encoded = encodePowerShell(script);
  const result = await Neutralino.os.execCommand(
    `powershell.exe -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
    { background: false },
  );
  if (result?.exitCode !== undefined && result.exitCode !== 0) {
    throw new Error(`PowerShell exited with code ${result.exitCode}`);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("blur", () => {
    nativeWindowFocused = false;
  });
  window.addEventListener("focus", () => {
    nativeWindowFocused = true;
  });
}

if (typeof Neutralino !== "undefined" && Neutralino.events?.on) {
  Neutralino.events.on("windowBlur", () => {
    nativeWindowFocused = false;
  });
  Neutralino.events.on("windowFocus", () => {
    nativeWindowFocused = true;
  });
}

export function notifyDesktop(title, message, icon = "INFO", force = false) {
  if (
    typeof Neutralino === "undefined" ||
    !Neutralino.os?.showNotification ||
    (!force && !document.hidden && document.hasFocus() && nativeWindowFocused)
  ) {
    return;
  }

  if (window.NL_OS === "Windows" && Neutralino.os.execCommand) {
    void showWindowsNotification(title, message).catch(() =>
      Neutralino.os.showNotification(title, message, icon).catch(() => {}),
    );
    return;
  }

  void Neutralino.os.showNotification(title, message, icon).catch(() => {});
}
