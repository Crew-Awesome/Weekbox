import { callDevFsBridge, extractViaDevBridge } from './download-helper'
import { desktopFileSystem, ensureParentDirectories } from './desktop-fs'
import { desktopProcess } from './desktop-process'
import {
  extractWithNativeBinaries,
  listNativeArchiveEntries,
  normalizeArchiveEntryPath,
  parse7zListingPaths,
} from './desktop-archive-native'
import type { ExtractArchiveOptions } from './types'

export {
  normalizeArchiveEntryPath,
  parse7zListingPaths,
  listNativeArchiveEntries,
}

export async function flattenDesktopSubdirectory(targetDir: string): Promise<void> {
  try {
    const entries = await desktopFileSystem.readDirectory(targetDir)
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
        await desktopProcess.execute(
          `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
        )
      } else {
        const escSub = subDir.path.replace(/"/g, '\\"')
        const escTarget = targetDir.replace(/"/g, '\\"')
        await desktopProcess.execute(
          `sh -c "mv \\"${escSub}\\"/* \\"${escSub}\\"/.[!.]* \\"${escTarget}\\"/ 2>/dev/null; rmdir \\"${escSub}\\""`,
        )
      }
    }
  } catch (err) {
    console.warn('[DesktopArchive] Subdirectory flattening skipped:', err)
  }
}

export async function extractDesktopArchive(
  options: ExtractArchiveOptions,
): Promise<void> {
  const {
    archivePath,
    destinationDir,
    removeArchive = true,
    flattenSingleRoot = true,
    onProgress,
  } = options

  onProgress?.({
    progress: 1,
    statusText: 'Preparing extraction...',
    currentFile: archivePath.split(/[\\/]/).pop(),
  })

  const handledByStream = await extractViaDevBridge(
    archivePath,
    destinationDir,
    (progress) => onProgress?.(progress),
    { removeArchive, flattenSingleRoot },
  )
  if (handledByStream) {
    onProgress?.({
      progress: 100,
      statusText: 'Extraction complete',
      currentFile: '',
    })
    return
  }

  const bridgeExtract = await callDevFsBridge<{ ok?: boolean; error?: string }>(
    {
      action: 'extractArchive',
      archivePath,
      destinationDir,
      removeArchive,
      flattenSingleRoot,
    },
    300000,
  )
  if (bridgeExtract?.ok) {
    onProgress?.({
      progress: 100,
      statusText: 'Extraction complete',
      currentFile: '',
    })
    return
  }
  if (bridgeExtract?.error) {
    throw new Error(bridgeExtract.error)
  }

  const isWin =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('win')

  const expectedFiles = onProgress
    ? await listNativeArchiveEntries(archivePath, isWin)
    : []
  let simulatedIndex = 0
  let progressTimer: ReturnType<typeof setInterval> | null = null

  if (onProgress && expectedFiles.length > 0) {
    onProgress({
      progress: 2,
      statusText: `Extracting ${expectedFiles.length} files...`,
      currentFile: expectedFiles[0],
    })
    const step = Math.max(1, Math.ceil(expectedFiles.length / 200))
    progressTimer = setInterval(() => {
      simulatedIndex = Math.min(
        expectedFiles.length - 1,
        simulatedIndex + step,
      )
      onProgress({
        progress: Math.min(
          95,
          3 + Math.round(((simulatedIndex + 1) / expectedFiles.length) * 92),
        ),
        statusText: `Extracting ${simulatedIndex + 1} of ${expectedFiles.length} files...`,
        currentFile: expectedFiles[simulatedIndex],
      })
    }, 300)
  }

  try {
    const exists = await desktopFileSystem.exists(destinationDir)
    if (!exists) {
      await ensureParentDirectories(desktopFileSystem, `${destinationDir}/.keep`)
    }

    await extractWithNativeBinaries(archivePath, destinationDir, isWin)

    onProgress?.({
      progress: 98,
      statusText: 'Organizing extracted files...',
      currentFile: '',
    })

    if (removeArchive) {
      try {
        await desktopFileSystem.remove(archivePath)
      } catch {
      }
    }

    if (flattenSingleRoot) {
      await flattenDesktopSubdirectory(destinationDir)
    }

    onProgress?.({
      progress: 100,
      statusText: 'Extraction complete',
      currentFile: '',
    })
  } catch (err) {
    if (removeArchive) {
      try {
        await desktopFileSystem.remove(archivePath)
      } catch {
      }
    }
    throw err
  } finally {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }
}
