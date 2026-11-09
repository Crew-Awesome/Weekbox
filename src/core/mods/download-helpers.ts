import { initHost } from '@/core/host'
import { ENGINE_CATEGORIES } from '@/services/gamebanana'
import { detectModEngineFromFiles } from './mod-filesystem'
import type { InstalledModRecord, StartModDownloadParams } from './types'
import type { GameBananaFile } from '@/ui/mod-details-modal/types'

export async function verifyDownloadedArchive(
  archivePath: string,
  expectedSize: number,
): Promise<void> {
  const host = initHost()
  const separator = archivePath.lastIndexOf('/')
  const parentPath = separator > 0 ? archivePath.slice(0, separator) : '.'
  const archiveName = archivePath.slice(separator + 1)
  const entry = (await host.fs.readDirectory(parentPath)).find(
    (item) => item.name === archiveName,
  )

  if (!entry || entry.isDirectory || entry.size === 0) {
    throw new Error('The downloaded archive is missing or empty.')
  }
  if (expectedSize > 0 && entry.size !== undefined && entry.size !== expectedSize) {
    throw new Error(
      `The downloaded archive is incomplete (${entry.size} of ${expectedSize} bytes).`,
    )
  }
}

export async function removePathWithRetry(path: string, attempts = 3): Promise<void> {
  if (!path) return
  const host = initHost()

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (!(await host.fs.exists(path))) return
      await host.fs.remove(path)
      return
    } catch {
      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * (attempt + 1)),
        )
      }
    }
  }
}

export async function cleanupInstallArtifacts(
  installDir: string,
  archivePath: string,
  removeInstallDir: boolean,
): Promise<void> {
  if (archivePath) {
    await removePathWithRetry(archivePath)
  }
  if (installDir && removeInstallDir) {
    await removePathWithRetry(installDir)
  }
}

export function resolveTargetModFile(
  files: GameBananaFile[] | Record<string, GameBananaFile> | undefined,
  explicitFile?: GameBananaFile,
  explicitFileId?: string,
  explicitUrl?: string,
): {
  file?: GameBananaFile
  fileId: string
  downloadUrl: string
  fileName: string
  expectedSize: number
} | null {
  const cleanExplicitUrl =
    typeof explicitUrl === 'string' && explicitUrl.trim().startsWith('http')
      ? explicitUrl.trim()
      : undefined

  const cleanExplicitFileId =
    typeof explicitFileId === 'string' && explicitFileId.trim().length > 0
      ? explicitFileId.trim()
      : typeof explicitFileId === 'number'
        ? String(explicitFileId)
        : undefined

  const validFiles: GameBananaFile[] = files
    ? Array.isArray(files)
      ? files
      : Object.values(files)
    : []

  const matchedFile =
    explicitFile ||
    (cleanExplicitFileId
      ? validFiles.find((f) => String(f._idRow) === cleanExplicitFileId)
      : undefined) ||
    (cleanExplicitUrl
      ? validFiles.find((f) => f._sDownloadUrl === cleanExplicitUrl)
      : undefined) ||
    validFiles[0]

  const downloadUrl = cleanExplicitUrl || matchedFile?._sDownloadUrl || ''
  if (!downloadUrl) return null

  const fileId = String(cleanExplicitFileId || matchedFile?._idRow || 'default')
  const fileName = matchedFile?._sFile || `mod_${fileId}.zip`
  const expectedSize = matchedFile?._nFilesize || 0

  return {
    file: matchedFile,
    fileId,
    downloadUrl,
    fileName,
    expectedSize,
  }
}

export async function buildInstalledModRecord(params: {
  mod: StartModDownloadParams['mod']
  compositeId: string
  baseModId: string
  modTitle: string
  downloadUrl: string
  engineFolderName: string
  folderName: string
  modInstallDir: string
  fileId: string
  fileName: string
  expectedSize: number
}): Promise<InstalledModRecord> {
  const {
    mod,
    compositeId,
    baseModId,
    modTitle,
    downloadUrl,
    engineFolderName,
    folderName,
    modInstallDir,
    fileId,
    fileName,
    expectedSize,
  } = params

  const detected = await detectModEngineFromFiles(
    modInstallDir,
    mod.engineId,
  )

  const isExe =
    detected.isExecutable ||
    detected.engineId === 'executable' ||
    detected.engineId === 'exe'
  const finalEngineId = isExe ? 'executable' : detected.engineId

  const defaultEngineId =
    mod.engineId && mod.engineId !== 'executable' && mod.engineId !== 'exe'
      ? mod.engineId
      : detected.engineId !== 'executable' && detected.engineId !== 'exe'
        ? detected.engineId
        : 'vslice'

  const defaultCatEntry = Object.values(ENGINE_CATEGORIES).find(
    (c) => c.id === defaultEngineId,
  )
  const defaultEngineName =
    defaultCatEntry?.name || mod.engineName || 'V-Slice Engine'

  const matchedEntry = Object.entries(ENGINE_CATEGORIES).find(
    ([, cat]) => cat.id === finalEngineId,
  )
  const matchedCategoryId = matchedEntry
    ? Number(matchedEntry[0])
    : isExe
      ? 3827
      : 28367
  const matchedEngineCat = matchedEntry?.[1]

  const now = Date.now()
  return {
    id: compositeId,
    modId: baseModId,
    name: modTitle,
    title: modTitle,
    hidden: false,
    visible: true,
    kind: 'mod',
    categoryId: matchedCategoryId,
    source: 'gamebanana',
    sourceUrl: `https://gamebanana.com/mods/${baseModId}`,
    downloadUrl,
    engineLocked: false,
    engineId: finalEngineId,
    engineName: isExe ? 'Executable Mods' : (matchedEngineCat?.name || defaultEngineName),
    defaultEngineId,
    defaultEngineName,
    engineFolderName,
    description: mod.description,
    htmlBody: mod.htmlBody,
    author: mod.author,
    image:
      (mod.image?.startsWith('http') ? mod.image : undefined) ||
      (mod.thumbnail?.startsWith('http') ? mod.thumbnail : undefined) ||
      (mod.img?.startsWith('http') ? mod.img : undefined) ||
      mod.image ||
      mod.thumbnail ||
      mod.img,
    thumbnail:
      (mod.thumbnail?.startsWith('http') ? mod.thumbnail : undefined) ||
      (mod.image?.startsWith('http') ? mod.image : undefined) ||
      (mod.img?.startsWith('http') ? mod.img : undefined) ||
      mod.thumbnail ||
      mod.image ||
      mod.img,
    previewMedia: mod.previewMedia,
    icon: matchedEngineCat?.icon || mod.icon || mod.engineIcon,
    categoryName: mod.categoryName,
    installPath: modInstallDir,
    folderName,
    installedAt: now,
    updatedAt: mod.updatedAt || now,
    submittedAt: mod.submittedAt,
    downloadedFileId: fileId,
    installedFileId: fileId,
    fileName,
    fileSize: expectedSize,
    isExecutable: isExe,
    hasEngineWarning: detected.hasEngineWarning,
    engineWarningMessage: detected.engineWarningMessage,
    meta: {
      link: downloadUrl,
      downloadUrl,
      sourceUrl: `https://gamebanana.com/mods/${baseModId}`,
    },
  }
}
