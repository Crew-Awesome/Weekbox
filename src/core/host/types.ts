export type PlatformType = 'desktop' | 'mobile' | 'web'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
}

export interface FileSystemHost {
  readTextFile(path: string): Promise<string>
  writeTextFile(path: string, data: string): Promise<void>
  readBinaryFile(path: string): Promise<ArrayBuffer>
  writeBinaryFile(path: string, data: ArrayBuffer | Uint8Array): Promise<void>
  createDirectory(path: string): Promise<void>
  remove(path: string): Promise<void>
  readDirectory(path: string): Promise<FileEntry[]>
  exists(path: string): Promise<boolean>
}

export interface SpawnProcessOptions {
  cwd?: string
  args?: string[]
}

export interface SpawnProcessResult {
  pid?: number
  id?: number
}

export interface ProcessHost {
  spawn(command: string, options?: SpawnProcessOptions): Promise<SpawnProcessResult>
  execute(
    command: string,
    options?: SpawnProcessOptions,
  ): Promise<{ stdOut: string; stdErr: string; exitCode: number }>
}

export interface DownloadProgress {
  progress: number
  downloaded: number
  total: number
  speed: string
  statusText?: string
  currentFile?: string
}

export interface DownloadFileOptions {
  url: string
  destinationPath: string
  expectedSize?: number
  signal?: AbortSignal
  onProgress?: (progress: DownloadProgress) => void
}

export interface ExtractArchiveOptions {
  archivePath: string
  destinationDir: string
  removeArchive?: boolean
  flattenSingleRoot?: boolean
  onProgress?: (progress: Partial<DownloadProgress>) => void
}

export interface HostAdapter {
  readonly platform: PlatformType
  readonly fs: FileSystemHost
  readonly process: ProcessHost
  getAppVersion(): Promise<string>
  openUrl(url: string): Promise<void>
  getDataPath(): Promise<string>
  downloadFile(options: DownloadFileOptions): Promise<void>
  extractArchive(options: ExtractArchiveOptions): Promise<void>
}
