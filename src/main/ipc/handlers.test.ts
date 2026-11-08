import { expect, it, vi } from 'vitest'
import { IPC } from '../../shared/ipcChannels'
import { registerIpcHandlers } from './handlers'

const registered = vi.hoisted(() => [] as string[])

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string): void => {
      registered.push(channel)
    },
    on: (channel: string): void => {
      registered.push(channel)
    }
  },
  app: {},
  BrowserWindow: {},
  dialog: {},
  nativeImage: {},
  shell: {}
}))

it('handles every channel the preload API sends on, and no others', () => {
  registerIpcHandlers()

  // onConfirmationsChanged goes the other way: main pushes it to the windows.
  const expected = Object.entries(IPC)
    .filter(([method]) => method !== 'onConfirmationsChanged')
    .map(([, channel]) => channel)
  expect([...registered].sort()).toEqual(expected.sort())
})
