import { desktopProcess } from './desktop-process'

export function normalizeArchiveEntryPath(entry: string): string {
  return entry
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
}

export function parse7zListingPaths(stdout: string): string[] {
  const files: string[] = []
  const blocks = stdout.split(/\r?\n\r?\n/)

  for (const block of blocks) {
    const fields = new Map<string, string>()
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(' = ')
      if (separator <= 0) continue
      fields.set(
        line.slice(0, separator).trim(),
        line.slice(separator + 3).trim(),
      )
    }

    const entryPath = fields.get('Path')
    if (!entryPath) continue
    const attributes = fields.get('Attributes') || ''
    const isDirectory =
      fields.get('Folder') === '+' || /^D/i.test(attributes)
    if (isDirectory) continue
    if (!fields.has('Size') && !fields.has('Attributes')) continue
    files.push(normalizeArchiveEntryPath(entryPath))
  }

  return files
}

export async function listNativeArchiveEntries(
  archivePath: string,
  isWin: boolean,
): Promise<string[]> {
  const lower = archivePath.toLowerCase()

  if (lower.endsWith('.rar')) {
    const candidates = isWin
      ? [
          '.\\bin\\unrar\\win\\UnRAR.exe',
          '.\\public\\bin\\unrar\\win\\UnRAR.exe',
          'UnRAR.exe',
        ]
      : [
          './bin/unrar/linux/unrar',
          './bin/unrar/mac/arm64/unrar',
          './bin/unrar/mac/x64/unrar',
          'unrar',
        ]

    for (const bin of candidates) {
      try {
        const res = await desktopProcess.execute(`"${bin}" lb "${archivePath}"`)
        if (res.exitCode === 0 && res.stdOut.trim()) {
          return res.stdOut
            .split(/\r?\n/)
            .map((entry) => normalizeArchiveEntryPath(entry.trim()))
            .filter((entry) => entry && !entry.endsWith('/'))
        }
      } catch {
      }
    }
    return []
  }

  const candidates = isWin
    ? [
        '.\\bin\\7z\\win\\x64\\7za.exe',
        '.\\public\\bin\\7z\\win\\x64\\7za.exe',
        '7za.exe',
      ]
    : [
        './bin/7z/linux/x64/7za',
        './bin/7z/mac/x64/7za',
        './bin/7z/mac/arm64/7za',
        '7za',
        '7z',
      ]

  for (const bin of candidates) {
    try {
      const res = await desktopProcess.execute(
        `"${bin}" l -slt "${archivePath}"`,
      )
      if (res.exitCode === 0 && res.stdOut.trim()) {
        return parse7zListingPaths(res.stdOut)
      }
    } catch {
    }
  }

  return []
}

export async function extractWithNativeBinaries(
  archivePath: string,
  destinationDir: string,
  isWin: boolean,
): Promise<void> {
  const lower = archivePath.toLowerCase()

  if (isWin) {
    const winArchive = archivePath.replace(/\//g, '\\')
    const winDest = destinationDir.replace(/\//g, '\\')
    const trailingDest = winDest.endsWith('\\') ? winDest : `${winDest}\\`

    if (lower.endsWith('.rar')) {
      const unrarCandidates = [
        '.\\bin\\unrar\\win\\UnRAR.exe',
        '.\\public\\bin\\unrar\\win\\UnRAR.exe',
        'bin\\unrar\\win\\UnRAR.exe',
      ]
      for (const uPath of unrarCandidates) {
        const res = await desktopProcess.execute(
          `"${uPath}" x -y -o+ "${winArchive}" "${trailingDest}"`,
        )
        if (res.exitCode === 0) return
      }
      throw new Error(`Failed to extract RAR archive: ${archivePath.split('/').pop()}`)
    }

    if (lower.endsWith('.7z')) {
      const sevenZipCandidates = [
        '.\\bin\\7z\\win\\x64\\7za.exe',
        '.\\public\\bin\\7z\\win\\x64\\7za.exe',
        'bin\\7z\\win\\x64\\7za.exe',
      ]
      for (const zPath of sevenZipCandidates) {
        const res = await desktopProcess.execute(
          `"${zPath}" x -y -o"${winDest}" "${winArchive}"`,
        )
        if (res.exitCode === 0) return
      }
      const tarRes = await desktopProcess.execute(
        `tar.exe -xf "${winArchive}" -C "${winDest}"`,
      )
      if (tarRes.exitCode === 0) return
      throw new Error(`Failed to extract 7z archive: ${archivePath.split('/').pop()}`)
    }

    const sevenZipCandidates = [
      '.\\bin\\7z\\win\\x64\\7za.exe',
      '.\\public\\bin\\7z\\win\\x64\\7za.exe',
    ]
    for (const zPath of sevenZipCandidates) {
      const res = await desktopProcess.execute(
        `"${zPath}" x -y -o"${winDest}" "${winArchive}"`,
      )
      if (res.exitCode === 0) return
    }
    const tarRes = await desktopProcess.execute(
      `tar.exe -xf "${winArchive}" -C "${winDest}"`,
    )
    if (tarRes.exitCode === 0) return

    if (lower.endsWith('.zip')) {
      const psCmd = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${winArchive.replace(/'/g, "''")}' -DestinationPath '${winDest.replace(/'/g, "''")}' -Force"`
      const psRes = await desktopProcess.execute(psCmd)
      if (psRes.exitCode === 0) return
      throw new Error(psRes.stdErr || `Failed to extract zip (code ${psRes.exitCode})`)
    }
    throw new Error(`Failed to extract archive: ${archivePath.split('/').pop()}`)
  }

  if (lower.endsWith('.rar')) {
    const unrarCandidates = [
      './bin/unrar/linux/unrar',
      './bin/unrar/mac/arm64/unrar',
      './bin/unrar/mac/x64/unrar',
      'unrar',
    ]
    for (const uPath of unrarCandidates) {
      const res = await desktopProcess.execute(
        `"${uPath}" x -y -o+ "${archivePath}" "${destinationDir}/"`,
      )
      if (res.exitCode === 0) return
    }
    throw new Error('Failed to extract RAR archive on Unix host.')
  }

  if (lower.endsWith('.7z')) {
    const sevenZipCandidates = [
      './bin/7z/linux/x64/7za',
      './bin/7z/mac/x64/7za',
      './bin/7z/mac/arm64/7za',
      '7za',
      '7z',
    ]
    for (const zPath of sevenZipCandidates) {
      const res = await desktopProcess.execute(
        `"${zPath}" x -y -o"${destinationDir}" "${archivePath}"`,
      )
      if (res.exitCode === 0) return
    }
    throw new Error('Failed to extract 7z archive on Unix host.')
  }

  const escArchive = archivePath.replace(/"/g, '\\"')
  const escDest = destinationDir.replace(/"/g, '\\"')
  const tarRes = await desktopProcess.execute(
    `tar -xf "${escArchive}" -C "${escDest}" || unzip -o "${escArchive}" -d "${escDest}"`,
  )
  if (tarRes.exitCode !== 0) {
    throw new Error(tarRes.stdErr || 'Failed to extract archive')
  }
}
