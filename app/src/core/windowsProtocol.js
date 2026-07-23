const PROTOCOL_KEY = "HKCU:\\Software\\Classes\\weekbox";

function getExecutablePath() {
  return String(window.NL_ARGS?.[0] || "")
    .trim()
    .replace(/^"|"$/g, "");
}

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function encodePowerShell(script) {
  const bytes = [];
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes.push(code & 0xff, code >> 8);
  }
  return btoa(String.fromCharCode(...bytes));
}

export async function syncWindowsProtocolRegistration(enabled) {
  if (window.NL_OS !== "Windows") return true;

  const executablePath = getExecutablePath();
  if (!executablePath) {
    console.warn("Could not find the WeekBox executable path.");
    return false;
  }

  const key = quotePowerShell(PROTOCOL_KEY);
  const executable = quotePowerShell(executablePath);
  const script = enabled
    ? [
        `$key = ${key}`,
        `$exe = ${executable}`,
        "$command = '\"' + $exe + '\" \"%1\"'",
        "New-Item -Path $key -Force | Out-Null",
        "Set-Item -Path $key -Value 'URL:WeekBox Protocol'",
        "New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null",
        'New-Item -Path "$key\\DefaultIcon" -Force | Out-Null',
        "Set-Item -Path \"$key\\DefaultIcon\" -Value ($exe + ',0')",
        'New-Item -Path "$key\\shell\\open\\command" -Force | Out-Null',
        'Set-Item -Path "$key\\shell\\open\\command" -Value $command',
      ].join("; ")
    : [
        `$key = ${key}`,
        `$exe = ${executable}`,
        "$expected = '\"' + $exe + '\" \"%1\"'",
        '$commandKey = Get-Item -LiteralPath "$key\\shell\\open\\command" -ErrorAction SilentlyContinue',
        "if ($commandKey -and $commandKey.GetValue('') -eq $expected) { Remove-Item -LiteralPath $key -Recurse -Force }",
      ].join("; ");

  try {
    const encoded = encodePowerShell(script);
    const result = await Neutralino.os.execCommand(
      `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    );
    if (result.exitCode !== 0) {
      throw new Error(result.stdErr || "Windows protocol registration failed");
    }
    return true;
  } catch (error) {
    console.warn("Could not update the WeekBox link association", error);
    return false;
  }
}
