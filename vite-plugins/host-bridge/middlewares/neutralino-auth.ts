import type { IncomingMessage, ServerResponse } from 'http'
import { readNeutralinoAuthInfo } from '../utils.ts'

export function createNeutralinoAuthMiddleware() {
  return (_req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    const auth = readNeutralinoAuthInfo()
    res.end(JSON.stringify(auth || { available: false }))
  }
}

