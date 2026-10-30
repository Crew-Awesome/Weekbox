import * as Neutralino from '@neutralinojs/lib'
import type { ProcessHost, SpawnProcessOptions } from './types'

export function withTimeout<T>(
  promise: Promise<T>,
  ms = 4000,
  errorMsg = 'Neutralino call timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms),
    ),
  ])
}

export const desktopProcess: ProcessHost = {
  async spawn(command: string, options?: SpawnProcessOptions) {
    const formattedCmd =
      command.includes(' ') && !command.startsWith('"')
        ? `"${command}"`
        : command
    const fullCommand = options?.args?.length
      ? `${formattedCmd} ${options.args.join(' ')}`
      : formattedCmd
    const processInfo = await withTimeout(
      Neutralino.os.spawnProcess(fullCommand, {
        cwd: options?.cwd,
      }),
      6000,
      'Neutralino.os.spawnProcess timed out',
    )
    return {
      id: processInfo.id,
      pid: processInfo.pid,
    }
  },

  async execute(command: string, options?: SpawnProcessOptions) {
    const fullCommand = options?.args?.length
      ? `${command} ${options.args.join(' ')}`
      : command
    const res = await withTimeout(
      Neutralino.os.execCommand(fullCommand, {
        cwd: options?.cwd,
      }),
      300000,
      'Neutralino.os.execCommand timed out',
    )
    return {
      stdOut: res.stdOut || '',
      stdErr: res.stdErr || '',
      exitCode: res.exitCode ?? 0,
    }
  },
}
