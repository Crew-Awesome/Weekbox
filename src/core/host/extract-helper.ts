
export async function extractViaDevBridge(
  archivePath: string,
  destinationDir: string,
  onProgress?: (progress: {
    progress?: number
    statusText?: string
    currentFile?: string
    filesDone?: number
    totalFiles?: number
  }) => void,
  options: { removeArchive?: boolean; flattenSingleRoot?: boolean } = {},
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return false
  }

  let response: Response
  try {
    response = await fetch('/api/wb-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archivePath,
        destinationDir,
        removeArchive: options.removeArchive !== false,
        flattenSingleRoot: options.flattenSingleRoot !== false,
      }),
    })
  } catch {
    return false
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/x-ndjson') || !response.body) {
    return false
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      let event: {
        type?: string
        progress?: number
        statusText?: string
        currentFile?: string
        filesDone?: number
        totalFiles?: number
        error?: string
        ok?: boolean
      }
      try {
        event = JSON.parse(line)
      } catch {
        continue
      }

      if (event.type === 'error' || event.error) {
        throw new Error(event.error || 'Extraction stream failed')
      }

      if (
        typeof event.progress === 'number' ||
        event.statusText ||
        event.currentFile
      ) {
        onProgress?.({
          progress: Number(event.progress ?? 0),
          statusText: event.statusText,
          currentFile: event.currentFile,
          filesDone: event.filesDone,
          totalFiles: event.totalFiles,
        })
      }

      if (event.type === 'done' || event.ok === true) {
        completed = true
      }
    }
  }

  return completed
}
