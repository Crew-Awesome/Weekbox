import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import type { WeekBoxLibraryPaths } from '@/core/storage'

export function toEngineFolderName(modTitle?: string): string {
  const cleaned = (modTitle || 'MOD')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 32)
  return cleaned || 'MOD'
}

export function generateModInstanceUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function extractBaseModId(id: string | number): string {
  const str = String(id)
  const parts = str.split('--')
  return parts[0] || str
}

export function toSafeModFolderName(
  modId: string | number,
  modTitle?: string,
  instanceUuid?: string,
): string {
  const baseId = extractBaseModId(modId)
  const engineFolder = toEngineFolderName(modTitle)
  const uuid = instanceUuid || generateModInstanceUuid()
  return `${engineFolder}--${baseId}--${uuid}`
}

export function resolveArchiveExtension(
  fileName?: string,
  downloadUrl?: string,
): string {
  const source = (fileName || downloadUrl || '').toLowerCase()
  if (source.endsWith('.tar.gz') || source.endsWith('.tgz')) return '.tar.gz'
  if (source.endsWith('.7z')) return '.7z'
  if (source.endsWith('.rar')) return '.rar'
  if (source.endsWith('.tar')) return '.tar'
  return '.zip'
}

export async function resolveModInstallDirectory(
  modId: string | number,
  modTitle?: string,
  existingFolderName?: string,
): Promise<{
  libraryPaths: WeekBoxLibraryPaths
   compositeId: string
  engineFolderName: string
  folderName: string
  modInstallDir: string
}> {
  const { paths } = await ensureWeekBoxLibrary()
  const baseId = extractBaseModId(modId)
  const engineFolderName = toEngineFolderName(modTitle)
  const uuid = generateModInstanceUuid()

  const folderName =
    existingFolderName || `${engineFolderName}--${baseId}--${uuid}`

  const folderParts = folderName.split('--')
  const compositeId =
    folderParts.length >= 3
      ? `${folderParts[1]}--${folderParts.slice(2).join('--')}`
      : `${baseId}--${uuid}`

  const modInstallDir = joinPaths(paths.modsDir, folderName)

  return {
    libraryPaths: paths,
    compositeId,
    engineFolderName,
    folderName,
    modInstallDir,
  }
}

export async function flattenSingleRootSubdirectory(
  targetDir: string,
): Promise<void> {
  const host = initHost()
  if (host.platform !== 'desktop') return

  try {
    const entries = await host.fs.readDirectory(targetDir)
    const validEntries = entries.filter(
      (e) =>
        e.name !== '.' &&
        e.name !== '..' &&
        e.name !== '__MACOSX' &&
        !e.name.startsWith('.temp_archive'),
    )

    if (validEntries.length === 1 && validEntries[0].isDirectory) {
      const subDir = validEntries[0]
      const isWin =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.toLowerCase().includes('win')

      if (isWin) {
        const winTarget = targetDir.replace(/\//g, '\\')
        const winSub = subDir.path.replace(/\//g, '\\')
        const psScript = `Get-ChildItem -LiteralPath '${winSub.replace(/'/g, "''")}' -Force | Move-Item -Destination '${winTarget.replace(/'/g, "''")}' -Force; Remove-Item -LiteralPath '${winSub.replace(/'/g, "''")}' -Recurse -Force`
        await host.process.execute(
          `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
        )
      } else {
        const escSub = subDir.path.replace(/"/g, '\\"')
        const escTarget = targetDir.replace(/"/g, '\\"')
        await host.process.execute(
          `sh -c "mv \\"${escSub}\\"/* \\"${escSub}\\"/.[!.]* \\"${escTarget}\\"/ 2>/dev/null; rmdir \\"${escSub}\\""`,
        )
      }
    }
  } catch (err) {
    console.warn('[WeekBox] Folder flattening skipped or non-fatal warning:', err)
  }
}

export async function detectModEngineFromFiles(
  modDir: string,
  fallbackEngineId?: string,
): Promise<{ engineId: string; isExecutable: boolean }> {
  const host = initHost()
  const defaultId =
    fallbackEngineId && fallbackEngineId !== 'unknown'
      ? fallbackEngineId
      : 'psych'

  let hasExe = false
  let hasPolymodMeta = false
  let hasPackJson = false
  let hasCodenameMeta = false

  const scanLevel = async (dirPath: string, depth: number) => {
    if (depth > 2) return
    try {
      const entries = await host.fs.readDirectory(dirPath)
      for (const entry of entries) {
        if (entry.name === '.' || entry.name === '..') continue
        const lower = entry.name.toLowerCase()

        if (!entry.isDirectory) {
          if (
            lower.endsWith('.exe') &&
            !lower.includes('unins') &&
            !lower.includes('crash') &&
            !lower.includes('unitycrash')
          ) {
            hasExe = true
          } else if (lower === '_polymod_meta.json') {
            hasPolymodMeta = true
          } else if (lower === 'pack.json') {
            hasPackJson = true
          } else if (lower === 'meta.xml' || lower === 'config.xml') {
            hasCodenameMeta = true
          }
        } else if (depth < 2) {
          await scanLevel(entry.path, depth + 1)
        }
      }
    } catch {
    }
  }

  await scanLevel(modDir, 0)

  if (hasExe) {
    return { engineId: 'executable', isExecutable: true }
  }
  if (hasPolymodMeta) {
    return { engineId: 'vslice', isExecutable: false }
  }
  if (hasCodenameMeta && fallbackEngineId === 'codename') {
    return { engineId: 'codename', isExecutable: false }
  }
  if (hasPackJson) {
    return { engineId: 'psych', isExecutable: false }
  }

  return {
    engineId: defaultId,
    isExecutable: defaultId === 'exe' || defaultId === 'executable',
  }
}

export async function openFolderInExplorer(folderPath: string): Promise<boolean> {
  if (!folderPath) return false

  const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
    action: 'openFolder',
    path: folderPath,
  })
  if (bridgeRes?.ok) {
    return true
  }

  const host = initHost()
  if (host.platform === 'desktop') {
    try {
      const exists = await host.fs.exists(folderPath)
      if (!exists) {
        await host.fs.createDirectory(folderPath)
      }
      const isWin =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.toLowerCase().includes('win')

      if (isWin) {
        const winPath = folderPath.replace(/\//g, '\\')
        await host.process.execute(`explorer.exe "${winPath}"`)
        return true
      }

      const isMac =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.toLowerCase().includes('mac')
      if (isMac) {
        await host.process.execute(`open "${folderPath}"`)
        return true
      }

      await host.process.execute(`xdg-open "${folderPath}"`)
      return true
    } catch (err) {
      console.error('[WeekBox] Failed to open folder in OS explorer:', err)
      return false
    }
  }

  return false
}
