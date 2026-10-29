import path from 'path'
import fs from 'fs'

export function flattenSingleSubdirectorySync(targetDir: string): void {
  try {
    if (!fs.existsSync(targetDir)) return
    const entries = fs
      .readdirSync(targetDir, { withFileTypes: true })
      .filter(
        (e) =>
          e.name !== '__MACOSX' &&
          !e.name.startsWith('.temp_archive') &&
          !e.name.startsWith('.flatten_'),
      )

    if (entries.length === 1 && entries[0].isDirectory()) {
      const subDir = path.join(targetDir, entries[0].name)
      const tempDir = path.join(targetDir, `.flatten_${Date.now()}`)
      fs.renameSync(subDir, tempDir)
      for (const child of fs.readdirSync(tempDir)) {
        const srcPath = path.join(tempDir, child)
        const destPath = path.join(targetDir, child)
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true })
        }
        fs.renameSync(srcPath, destPath)
      }
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch {
  }
}

