import { platform } from "../../platform";

const PROTOCOL_KEY = "HKCU:\\Software\\Classes\\weekbox";

function getExecutablePath() {
  return String(window.NL_ARGS?.[0] || "")
    .trim()
    .replace(/^"|"$/g, "");
}

function quotePowerShell(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function encodePowerShell(script: string) {
  const bytes: number[] = [];
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes.push(code & 255, code >> 8);
  }
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Registra o desregistra el protocolo custom `weekbox://` en Windows, Linux y macOS.
 * Esto permite abrir la aplicacin al hacer clic en enlaces web como `weekbox://mod/1234`.
 */
export async function syncProtocolRegistration(enabled: boolean = true): Promise<boolean> {
  if (platform.platformName !== "desktop" || !window.NL_OS) {
    return true; 
  }

  const executablePath = getExecutablePath();
  if (!executablePath) {
    console.warn("Could not find the WeekBox executable path.");
    return false;
  }

  const osName = window.NL_OS;

  if (osName === "Windows") {
    return await syncWindowsProtocol(executablePath, enabled);
  } else if (osName === "Linux") {
    /** Delegado a bash para entornos Linux nativos y Crostini (Chromebooks) */
    return await syncLinuxProtocol(executablePath, enabled);
  } else if (osName === "Darwin") {
    /** 
     * MacOS require ser configurado desde el Info.plist durante el empaquetado (.app).
     * Si se usa un bundler oficial, se debe inyectar CFBundleURLTypes all.
     */
    console.info("En macOS, el protocolo weekbox:// debe ser configurado en el Info.plist (CFBundleURLTypes).");
    return true;
  }

  return false;
}

async function syncWindowsProtocol(executablePath: string, enabled: boolean): Promise<boolean> {
  const key = quotePowerShell(PROTOCOL_KEY);
  const executable = quotePowerShell(executablePath);
  
  // Extraemos el directorio del ejecutable usando PowerShell para pasarlo como --path
  // Esto arregla el bug donde Neutralino ignora singleInstance si se lanza desde Chrome.
  const script = enabled
    ? [
        `$key = ${key}`,
        `$exe = ${executable}`,
        `$exeDir = Split-Path $exe -Parent`,
        `$command = '"' + $exe + '" --path="' + $exeDir + '" "%1"'`,
        "New-Item -Path $key -Force | Out-Null",
        "Set-Item -Path $key -Value 'URL:WeekBox Protocol'",
        "New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null",
        "New-ItemProperty -Path $key -Name 'FriendlyTypeName' -Value 'WeekBox' -PropertyType String -Force | Out-Null",
        'New-Item -Path "$key\\Application" -Force | Out-Null',
        "New-ItemProperty -Path \"$key\\Application\" -Name 'ApplicationName' -Value 'WeekBox' -PropertyType String -Force | Out-Null",
        'New-Item -Path "$key\\DefaultIcon" -Force | Out-Null',
        `Set-Item -Path "$key\\DefaultIcon" -Value ($exe + ',0')`,
        'New-Item -Path "$key\\shell\\open\\command" -Force | Out-Null',
        'Set-Item -Path "$key\\shell\\open\\command" -Value $command',
      ].join("; ")
    : [
        `$key = ${key}`,
        `$exe = ${executable}`,
        `$exeDir = Split-Path $exe -Parent`,
        `$expected = '"' + $exe + '" --path="' + $exeDir + '" "%1"'`,
        '$commandKey = Get-Item -LiteralPath "$key\\shell\\open\\command" -ErrorAction SilentlyContinue',
        "if ($commandKey -and $commandKey.GetValue('') -eq $expected) { Remove-Item -LiteralPath $key -Recurse -Force }",
      ].join("; ");

  try {
    const encoded = encodePowerShell(script);
    if (!window.Neutralino?.os?.execCommand) return false;
    
    const result = await window.Neutralino.os.execCommand(
      `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`
    );
    
    if (result.exitCode !== 0) throw new Error(result.stdErr);
    return true;
  } catch (error) {
    console.warn("Could not update the Windows link association", error);
    return false;
  }
}

async function syncLinuxProtocol(executablePath: string, enabled: boolean): Promise<boolean> {
  try {
    if (!window.Neutralino?.os?.execCommand) return false;

    if (enabled) {
      const script = `
mkdir -p ~/.local/share/applications
cat << 'EOF' > ~/.local/share/applications/weekbox-deeplink.desktop
[Desktop Entry]
Name=Weekbox
Exec="${executablePath}" --path="$(dirname "${executablePath}")" %U
Path=$(dirname "${executablePath}")
Terminal=false
Type=Application
MimeType=x-scheme-handler/weekbox;
EOF
xdg-mime default weekbox-deeplink.desktop x-scheme-handler/weekbox
update-desktop-database ~/.local/share/applications || true
      `.trim();
      await window.Neutralino.os.execCommand(`sh -c '${script.replace(/'/g, "'\\''")}'`);
    } else {
      await window.Neutralino.os.execCommand(`sh -c 'rm -f ~/.local/share/applications/weekbox-deeplink.desktop && update-desktop-database ~/.local/share/applications || true'`);
    }
    return true;
  } catch (error) {
    console.warn("Could not update the Linux link association", error);
    return false;
  }
}

/**
 * Extrae la informacin del mod desde un array de argumentos (como NL_ARGS o newInstance).
 */
export function parseDeeplinkArgs(args: string[]): { type: string; id: number } | null {
  if (!args || !Array.isArray(args)) return null;
  
  /** Localiza el primer argumento que inicie con la expresin del esquema local */
  const linkArg = args.find(arg => typeof arg === 'string' && arg.toLowerCase().startsWith("weekbox://"));
  if (!linkArg) return null;

  const directMatch = String(linkArg || "")
    .trim()
    .match(/^weekbox:\/\/mod(?:\/|,)(\d+)\/?$/i);
    
  if (directMatch) return { type: "mod", id: Number(directMatch[1]) };
  
  try {
    const url = new URL(linkArg);
    if (url.protocol !== "weekbox:") return null;
    
    const type = url.hostname.toLowerCase();
    const id = Number(url.pathname.replace(/^\//, ""));
    
    if (type !== "mod" || !Number.isInteger(id) || id <= 0) return null;
    return { type, id };
  } catch {
    return null;
  }
}

/**
 * Lee los argumentos de inicio (NL_ARGS) y devuelve la informacin del mod si
 * la aplicacin fue iniciada va un enlace deeplink (`weekbox://mod/1234`).
 */
export function parseStartupDeeplink(): { type: string; id: number } | null {
  return parseDeeplinkArgs(window.NL_ARGS || []);
}
