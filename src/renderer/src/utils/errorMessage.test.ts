import { describe, expect, it } from 'vitest'
import { toUserMessage } from './errorMessage'

describe('toUserMessage', () => {
  it('removes the wrapper Electron adds to errors thrown in the main process', () => {
    const error = new Error(
      "Error invoking remote method 'fs:rename': Error: 同名のファイル・フォルダが既に存在します"
    )

    expect(toUserMessage(error, 'fallback')).toBe('同名のファイル・フォルダが既に存在します')
  })

  it('also removes other error names after the wrapper', () => {
    const error = new Error("Error invoking remote method 'folder:scan': TypeError: bad input")

    expect(toUserMessage(error, 'fallback')).toBe('bad input')
  })

  it('keeps messages that were not wrapped', () => {
    expect(toUserMessage(new Error('フォルダの削除に失敗しました'), 'fallback')).toBe(
      'フォルダの削除に失敗しました'
    )
  })

  it('uses the fallback when there is no message to show', () => {
    expect(toUserMessage('not an error', 'fallback')).toBe('fallback')
    expect(toUserMessage(new Error(''), 'fallback')).toBe('fallback')
    expect(toUserMessage(new Error("Error invoking remote method 'x': Error: "), 'fallback')).toBe(
      'fallback'
    )
  })
})
