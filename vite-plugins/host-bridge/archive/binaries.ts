import path from 'path'
import fs from 'fs'

const PROJECT_ROOT = process.cwd()

export function resolvePortable7z(): string | null {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  const candidates = [
    path.resolve(
      PROJECT_ROOT,
      `bin/7z/${isWin ? 'win/' + (process.arch === 'ia32' ? 'ia32' : arch) + '/7za.exe' : isMac ? 'mac/' + arch + '/7za' : 'linux/' + arch + '/7za'}`,
    ),
    path.resolve(
      PROJECT_ROOT,
      `node_modules/7zip-bin/${isWin ? 'win/' + (process.arch === 'ia32' ? 'ia32' : arch) + '/7za.exe' : isMac ? 'mac/' + arch + '/7za' : 'linux/' + arch + '/7za'}`,
    ),
    path.resolve(
      PROJECT_ROOT,
      `public/bin/7z/${isWin ? 'win/' + (process.arch === 'ia32' ? 'ia32' : arch) + '/7za.exe' : isMac ? 'mac/' + arch + '/7za' : 'linux/' + arch + '/7za'}`,
    ),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      if (!isWin) {
        try {
          fs.chmodSync(c, 0o755)
        } catch {
        }
      }
      return c
    }
  }
  return null
}

export function resolvePortableUnrar(): string | null {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  const candidates = [
    path.resolve(
      PROJECT_ROOT,
      isWin
        ? 'bin/unrar/win/UnRAR.exe'
        : isMac
          ? `bin/unrar/mac/${arch}/unrar`
          : `bin/unrar/linux/${arch}/unrar`,
    ),
    path.resolve(
      PROJECT_ROOT,
      isWin
        ? 'bin/unrar/win/UnRAR.exe'
        : isMac
          ? `bin/unrar/mac/${arch}/unrar`
          : 'bin/unrar/linux/unrar',
    ),
    path.resolve(
      PROJECT_ROOT,
      isWin
        ? 'public/bin/unrar/win/UnRAR.exe'
        : isMac
          ? `public/bin/unrar/mac/${arch}/unrar`
          : 'public/bin/unrar/linux/unrar',
    ),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      if (!isWin) {
        try {
          fs.chmodSync(c, 0o755)
        } catch {
        }
      }
      return c
    }
  }
  return null
}
