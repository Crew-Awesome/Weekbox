import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { resolvePortable7z, resolvePortableUnrar } from './binaries.ts'

const execFileAsync = promisify(execFile)

export async function extractRarArchive(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const unrarBin = resolvePortableUnrar()
  if (unrarBin) {
    try {
      const isWin = process.platform === 'win32'
      if (isWin) {
        const winArchive = archivePath.replace(/\//g, '\\')
        const winDest = destinationDir.replace(/\//g, '\\')
        const trailingDest = winDest.endsWith('\\') ? winDest : `${winDest}\\`
        await execFileAsync(unrarBin, ['x', '-y', '-o+', winArchive, trailingDest])
        return true
      } else {
        const trailingDest = destinationDir.endsWith('/')
          ? destinationDir
          : `${destinationDir}/`
        await execFileAsync(unrarBin, ['x', '-y', '-o+', archivePath, trailingDest])
        return true
      }
    } catch (err) {
      console.warn(
        '[ViteBridge] Portable unrar binary failed, falling back to node-unrar-js:',
        err,
      )
    }
  }

  try {
    const unrarModule = await import('node-unrar-js')
    const extractor = await unrarModule.createExtractorFromFile({
      filepath: archivePath,
      targetPath: destinationDir,
    })
    const extracted = extractor.extract()
    const files = [...extracted.files]
    for (const file of files) {
      const targetFilePath = path.join(destinationDir, file.fileHeader.name)
      if (file.fileHeader.flags.directory) {
        fs.mkdirSync(targetFilePath, { recursive: true })
      } else if (file.extraction) {
        fs.mkdirSync(path.dirname(targetFilePath), { recursive: true })
        fs.writeFileSync(targetFilePath, Buffer.from(file.extraction))
      }
    }
    return true
  } catch (err) {
    console.error('[ViteBridge] node-unrar-js extraction error:', err)
    throw err
  }
}

export async function extract7zArchive(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const sevenZipBin = resolvePortable7z()
  if (sevenZipBin) {
    try {
      await execFileAsync(sevenZipBin, [
        'x',
        '-y',
        `-o${destinationDir}`,
        archivePath,
      ])
      return true
    } catch (err) {
      console.warn('[ViteBridge] Portable 7za execution failed:', err)
    }
  }
  return false
}

export async function extractGeneralArchive(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const sevenZipBin = resolvePortable7z()
  if (sevenZipBin) {
    try {
      await execFileAsync(sevenZipBin, [
        'x',
        '-y',
        `-o${destinationDir}`,
        archivePath,
      ])
      return true
    } catch {
    }
  }

  const isWin = process.platform === 'win32'
  if (isWin) {
    const winArchive = archivePath.replace(/\//g, '\\')
    const winDest = destinationDir.replace(/\//g, '\\')
    try {
      await execFileAsync('tar.exe', ['-xf', winArchive, '-C', winDest])
      return true
    } catch {
    }

    if (archivePath.toLowerCase().endsWith('.zip')) {
      const psCmd = `Expand-Archive -LiteralPath '${winArchive.replace(/'/g, "''")}' -DestinationPath '${winDest.replace(/'/g, "''")}' -Force`
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        psCmd,
      ])
      return true
    }
  } else {
    try {
      await execFileAsync('tar', ['-xf', archivePath, '-C', destinationDir])
      return true
    } catch {
      await execFileAsync('unzip', ['-o', archivePath, '-d', destinationDir])
      return true
    }
  }
  return false
}

export async function extractArchiveToDir(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  fs.mkdirSync(destinationDir, { recursive: true })

  const lower = archivePath.toLowerCase()

  if (lower.endsWith('.rar')) {
    return extractRarArchive(archivePath, destinationDir)
  }

  if (lower.endsWith('.7z')) {
    if (await extract7zArchive(archivePath, destinationDir)) return true
    return extractGeneralArchive(archivePath, destinationDir)
  }

  return extractGeneralArchive(archivePath, destinationDir)
}

