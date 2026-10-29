import { execFile } from 'child_process'
import { promisify } from 'util'
import { resolvePortable7z, resolvePortableUnrar } from './binaries.ts'

const execFileAsync = promisify(execFile)

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

export async function listArchiveEntries(archivePath: string): Promise<string[]> {
  const lower = archivePath.toLowerCase()
  const maxBuffer = 64 * 1024 * 1024

  if (lower.endsWith('.rar')) {
    const unrarBin = resolvePortableUnrar()
    if (unrarBin) {
      try {
        const winArchive =
          process.platform === 'win32'
            ? archivePath.replace(/\//g, '\\')
            : archivePath
        const { stdout } = await execFileAsync(unrarBin, ['lb', winArchive], {
          maxBuffer,
        })
        return stdout
          .split(/\r?\n/)
          .map((entry) => normalizeArchiveEntryPath(entry.trim()))
          .filter((entry) => entry && !entry.endsWith('/'))
      } catch {
        return []
      }
    }
    return []
  }

  if (
    lower.endsWith('.tar') ||
    lower.endsWith('.tar.gz') ||
    lower.endsWith('.tgz')
  ) {
    try {
      const { stdout } = await execFileAsync('tar', ['-tf', archivePath], {
        maxBuffer,
      })
      return stdout
        .split(/\r?\n/)
        .map((entry) => normalizeArchiveEntryPath(entry.trim()))
        .filter((entry) => entry && !entry.endsWith('/'))
    } catch {
    }
  }

  const sevenZipBin = resolvePortable7z()
  if (sevenZipBin) {
    try {
      const { stdout } = await execFileAsync(
        sevenZipBin,
        ['l', '-slt', archivePath],
        { maxBuffer },
      )
      return parse7zListingPaths(stdout)
    } catch {
    }
  }

  if (process.platform !== 'win32' && lower.endsWith('.zip')) {
    try {
      const { stdout } = await execFileAsync('zipinfo', ['-1', archivePath], {
        maxBuffer,
      })
      return stdout
        .split(/\r?\n/)
        .map((entry) => normalizeArchiveEntryPath(entry.trim()))
        .filter((entry) => entry && !entry.endsWith('/'))
    } catch {
      try {
        const { stdout } = await execFileAsync('unzip', ['-Z1', archivePath], {
          maxBuffer,
        })
        return stdout
          .split(/\r?\n/)
          .map((entry) => normalizeArchiveEntryPath(entry.trim()))
          .filter((entry) => entry && !entry.endsWith('/'))
      } catch {
      }
    }
  }

  return []
}
