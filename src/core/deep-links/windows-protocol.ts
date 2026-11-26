import * as Neutralino from '@neutralinojs/lib'
import { isNeutralino } from '@/core/host'

const PROTOCOL_KEY = 'HKCU:\\Software\\Classes\\weekbox'

interface NeutralinoWindowGlobals {
  NL_OS?: string
  NL_PATH?: string
  NL_ARGS?: string[]
}

function getWinGlobals(): NeutralinoWindowGlobals {
  if (typeof window === 'undefined') return {}
  return window as unknown as NeutralinoWindowGlobals
}

export function getExecutablePath(): string {
  const globals = getWinGlobals()
  const argPath = String(globals.NL_ARGS?.[0] || '')
    .trim()
    .replace(/^"+|"+$/g, '')
  if (argPath) return argPath
  if (globals.NL_PATH) {
    return `${globals.NL_PATH}\\WeekBox.exe`
  }
  return ''
}

function quotePowerShell(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`
}

export function encodePowerShellCommand(script: string): string {
  const bytes = new Uint8Array(script.length * 2)
  for (let i = 0; i < script.length; i += 1) {
    const code = script.charCodeAt(i)
    bytes[i * 2] = code & 0xff
    bytes[i * 2 + 1] = code >> 8
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function focusWeekBoxWindow(): Promise<void> {
  if (!isNeutralino()) return
  try {
    const winApi = Neutralino.window as unknown as {
      unminimize?: () => Promise<void>
      show?: () => Promise<void>
      focus?: () => Promise<void>
    }
    if (typeof winApi.unminimize === 'function') {
      await winApi.unminimize().catch(() => {})
    }
    if (typeof winApi.show === 'function') {
      await winApi.show().catch(() => {})
    }
    if (typeof winApi.focus === 'function') {
      await winApi.focus().catch(() => {})
    }
  } catch {
  }
}

export async function syncWindowsProtocolRegistration(
  enabled: boolean,
): Promise<boolean> {
  if (!isNeutralino()) return false
  const globals = getWinGlobals()
  if (globals.NL_OS !== 'Windows') return true

  const executablePath = getExecutablePath()
  if (!executablePath) {
    console.warn('[WeekBox] Could not resolve executable path for protocol registration.')
    return false
  }

  const key = quotePowerShell(PROTOCOL_KEY)
  const executable = quotePowerShell(executablePath)
  const script = enabled
    ? [
        `$key = ${key}`,
        `$exe = ${executable}`,
        '$exeDir = Split-Path $exe -Parent',
        `$command = '"' + $exe + '" --path="' + $exeDir + '" --window-hidden "%1"'`,
        'New-Item -Path $key -Force | Out-Null',
        "Set-Item -Path $key -Value 'URL:WeekBox Protocol'",
        "New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null",
        'New-Item -Path "$key\\DefaultIcon" -Force | Out-Null',
        'Set-Item -Path "$key\\DefaultIcon" -Value ($exe + \',0\')',
        'New-Item -Path "$key\\shell\\open\\command" -Force | Out-Null',
        'Set-Item -Path "$key\\shell\\open\\command" -Value $command',
      ].join('; ')
    : [
        `$key = ${key}`,
        `$exe = ${executable}`,
        "$prefix = '\"' + $exe + '\"'",
        '$commandKey = Get-Item -LiteralPath "$key\\shell\\open\\command" -ErrorAction SilentlyContinue',
        "if ($commandKey -and ([string]$commandKey.GetValue('')).StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $key -Recurse -Force }",
      ].join('; ')

  try {
    const encoded = encodePowerShellCommand(script)
    const result = await Neutralino.os.execCommand(
      `powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    )
    if (result.exitCode !== 0) {
      throw new Error(result.stdErr || 'Windows protocol registration failed')
    }
    return true
  } catch (err) {
    console.warn('[WeekBox] Could not update weekbox:// protocol association:', err)
    return false
  }
}
