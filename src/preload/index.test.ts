import { describe, expect, it, vi } from 'vitest'
import { IPC } from '../shared/ipcChannels'
import './index'

type ApiMethod = (...args: unknown[]) => unknown

const bridge = vi.hoisted(() => ({
  api: {} as Record<string, ApiMethod>,
  channels: [] as string[]
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (_name: string, api: Record<string, ApiMethod>): void => {
      bridge.api = api
    }
  },
  ipcRenderer: {
    invoke: (channel: string): Promise<void> => {
      bridge.channels.push(channel)
      return Promise.resolve()
    },
    send: (channel: string): void => {
      bridge.channels.push(channel)
    },
    on: (channel: string): void => {
      bridge.channels.push(channel)
    },
    removeListener: (): void => undefined
  }
}))

describe('preload API', () => {
  it('has one method for each IPC channel, named like its key in IPC', () => {
    expect(Object.keys(bridge.api).sort()).toEqual(Object.keys(IPC).sort())
  })

  it.each(Object.entries(IPC))('%s uses the %s channel', (method, channel) => {
    bridge.channels.length = 0
    bridge.api[method]?.()
    expect(bridge.channels).toEqual([channel])
  })
})
