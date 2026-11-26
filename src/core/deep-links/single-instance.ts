import * as Neutralino from '@neutralinojs/lib'
import { isNeutralino } from '@/core/host'
import { resolveActiveLibraryPath, joinPaths } from '@/core/storage/weekbox-library'
import {
  getWeekBoxLinkFromArgs,
  openWeekBoxLink,
  parseWeekBoxLink,
} from './deep-links'
import {
  encodePowerShellCommand,
  focusWeekBoxWindow,
} from './windows-protocol'

const SINGLE_INSTANCE_MUTEX = 'Global\\WeekBox-com.weekbox.app'

interface NeutralinoRuntimeGlobals {
  NL_OS?: string
  NL_PID?: number | string
  NL_DATAPATH?: string
  NL_ARGS?: string[]
  NL_SINGLE_INSTANCE_OWNER?: boolean
}

function getRuntimeGlobals(): NeutralinoRuntimeGlobals {
  if (typeof window === 'undefined') return {}
  return window as unknown as NeutralinoRuntimeGlobals
}

export function isDevelopmentNeutralinoRun(): boolean {
  const args = getRuntimeGlobals().NL_ARGS
  const joined = Array.isArray(args) ? args.join(' ') : String(args || '')
  return joined.includes('--neu-dev-auto-reload')
}

async function getRuntimeHandoffPaths(): Promise<string[]> {
  const paths: string[] = []
  try {
    const libPath = await resolveActiveLibraryPath()
    if (libPath) {
      paths.push(joinPaths(libPath, 'runtime/deeplink.json'))
      paths.push(joinPaths(libPath, 'data/weekbox-deeplink.json'))
    }
  } catch {
  }
  const legacyDataPath = String(getRuntimeGlobals().NL_DATAPATH || '').trim().replace(/\\/g, '/')
  if (legacyDataPath) {
    paths.push(`${legacyDataPath}/weekbox-deeplink.json`)
  }
  return paths.filter((p, idx, all) => Boolean(p) && all.indexOf(p) === idx)
}

export async function ensureSingleInstance(): Promise<boolean> {
  if (!isNeutralino()) return true
  const globals = getRuntimeGlobals()
  if (globals.NL_SINGLE_INSTANCE_OWNER) return true
  if (isDevelopmentNeutralinoRun() || globals.NL_OS !== 'Windows') return true

  const parentPid = Number(globals.NL_PID)
  if (!Number.isInteger(parentPid) || parentPid <= 0) return true

  const script = [
    '$created = $false',
    `$mutex = [System.Threading.Mutex]::new($false, '${SINGLE_INSTANCE_MUTEX}', [ref]$created)`,
    '$owned = $false',
    'try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }',
    "if (-not $owned) { [Console]::Out.WriteLine('duplicate'); exit 2 }",
    "[Console]::Out.WriteLine('acquired')",
    `try { while (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 500 } } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }`,
  ].join('\n')

  return new Promise<boolean>((resolve) => {
    let processId: number | null = null
    let settled = false
    let outputBuffer = ''
    const pendingEvents: Array<{ detail?: { id?: number; action?: string; data?: unknown } }> = []
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const finish = (isPrimary: boolean) => {
      if (settled) return
      settled = true
      if (timeoutHandle) clearTimeout(timeoutHandle)
      Neutralino.events.off('spawnedProcess', handler).catch(() => {})
      resolve(isPrimary)
    }

    const handleEvent = (event: {
      detail?: { id?: number; action?: string; data?: unknown }
    }) => {
      if (processId === null) {
        pendingEvents.push(event)
        return
      }
      if (event?.detail?.id !== processId) return
      if (event.detail.action === 'stdOut') {
        outputBuffer += String(event.detail.data || '').toLowerCase()
      }
      if (outputBuffer.includes('acquired')) {
        finish(true)
      } else if (outputBuffer.includes('duplicate')) {
        finish(false)
      } else if (event.detail.action === 'exit') {
        finish(Number(event.detail.data) === 2 ? false : true)
      }
    }

    const handler = (ev: CustomEvent) => handleEvent(ev)

    Neutralino.events
      .on('spawnedProcess', handler)
      .then(() =>
        Neutralino.os.spawnProcess(
          `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShellCommand(script)}`,
        ),
      )
      .then((proc) => {
        processId = proc.id
        timeoutHandle = setTimeout(() => finish(true), 4000)
        pendingEvents.splice(0).forEach(handleEvent)
      })
      .catch(() => finish(true))
  })
}

export async function handoffToPrimaryInstance(): Promise<void> {
  const link = getWeekBoxLinkFromArgs()
  const handoffPaths = await getRuntimeHandoffPaths().catch(() => [])
  if (handoffPaths[0]) {
    try {
      const dir = handoffPaths[0].slice(0, handoffPaths[0].lastIndexOf('/'))
      if (dir) {
        await Neutralino.filesystem.createDirectory(dir).catch(() => {})
      }
      await Neutralino.filesystem.writeFile(
        handoffPaths[0],
        JSON.stringify({ link, timestamp: Date.now() }),
      )
    } catch {
    }
  }

  try {
    const winApi = Neutralino.window as unknown as { hide?: () => Promise<void> }
    await winApi.hide?.().catch(() => {})
  } catch {
  }

  if (link) {
    await Neutralino.app.broadcast('weekbox:deep-link', { link }).catch(() => {})
  } else {
    await Neutralino.app.broadcast('weekbox:focus').catch(() => {})
  }

  await new Promise((r) => setTimeout(r, 250))
  await Neutralino.app.exit().catch(() => {})
}

async function readPendingHandoff(): Promise<{ link?: string; timestamp?: number } | null> {
  try {
    for (const filePath of await getRuntimeHandoffPaths()) {
      const raw = await Neutralino.filesystem.readFile(filePath).catch(() => '')
      if (raw) {
        await Neutralino.filesystem.remove(filePath).catch(() => {})
        return JSON.parse(raw) as { link?: string; timestamp?: number }
      }
    }
  } catch {
  }
  return null
}

export function createDeepLinkCoordinator() {
  let lastLink: string | null = null
  let lastLinkAt = 0
  let checkingHandoff = false

  const handleLink = (rawLink: unknown) => {
    const target = parseWeekBoxLink(rawLink)
    if (!target) return
    const now = Date.now()
    if (target.rawLink === lastLink && now - lastLinkAt < 2000) return
    lastLink = target.rawLink
    lastLinkAt = now
    void openWeekBoxLink(target.rawLink).catch((err) =>
      console.warn('[WeekBox] Could not open deep link:', err),
    )
  }

  const checkPendingHandoff = async () => {
    if (checkingHandoff) return
    checkingHandoff = true
    const pending = await readPendingHandoff()
    checkingHandoff = false

    const isFresh =
      pending?.timestamp && Date.now() - Number(pending.timestamp) < 10000
    if (isFresh && pending?.link) {
      handleLink(pending.link)
    } else if (isFresh) {
      void focusWeekBoxWindow()
    }
  }

  return {
    handleLink,
    checkPendingHandoff,
  }
}
