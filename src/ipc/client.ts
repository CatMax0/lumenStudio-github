import type { PingResponseT, VersionResponseT } from '@shared/ipc'

export const ping = (message: string): Promise<PingResponseT> =>
  window.lumen.ping(message)

export const getVersion = (): Promise<VersionResponseT> =>
  window.lumen.getVersion()
