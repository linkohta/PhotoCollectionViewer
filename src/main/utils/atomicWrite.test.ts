import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retrySync, writeFileAtomicSync } from './atomicWrite'

// Error codes the next renameSync calls fail with, the way Windows sometimes
// does; once the list is empty the real renameSync runs again.
const renameFailures = vi.hoisted(() => [] as string[])

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    renameSync: (from: string, to: string): void => {
      const code = renameFailures.shift()
      if (code === undefined) return actual.renameSync(from, to)
      // ENOENT stands for the temporary file being gone before the rename.
      if (code === 'ENOENT') actual.rmSync(from, { force: true })
      throw Object.assign(new Error(code), { code })
    }
  }
})

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'pcv-atomic-'))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
  renameFailures.length = 0
})

const errorWithCode = (code: string): NodeJS.ErrnoException =>
  Object.assign(new Error(code), { code })

describe('writeFileAtomicSync', () => {
  it('writes the contents to a new file', () => {
    const filePath = join(workDir, 'state.json')

    writeFileAtomicSync(filePath, '{"a":1}')

    expect(readFileSync(filePath, 'utf-8')).toBe('{"a":1}')
  })

  it('replaces an existing file and leaves no temporary file behind', () => {
    const filePath = join(workDir, 'state.json')
    writeFileSync(filePath, 'old')

    writeFileAtomicSync(filePath, '日本語')

    expect(readFileSync(filePath, 'utf-8')).toBe('日本語')
    expect(readdirSync(workDir)).toEqual(['state.json'])
  })

  it('removes the temporary file when the target cannot be replaced', () => {
    const targetPath = join(workDir, 'state.json')
    mkdirSync(targetPath)

    expect(() => writeFileAtomicSync(targetPath, 'new')).toThrow()
    expect(readdirSync(workDir)).toEqual(['state.json'])
  })

  it('writes the temporary file again when it is gone before the rename', () => {
    const filePath = join(workDir, 'state.json')
    renameFailures.push('ENOENT')

    writeFileAtomicSync(filePath, 'new')

    expect(readFileSync(filePath, 'utf-8')).toBe('new')
    expect(readdirSync(workDir)).toEqual(['state.json'])
  })

  it('retries while another process briefly holds the target open', () => {
    const filePath = join(workDir, 'state.json')
    writeFileSync(filePath, 'old')
    renameFailures.push('EPERM', 'EBUSY')

    writeFileAtomicSync(filePath, 'new')

    expect(readFileSync(filePath, 'utf-8')).toBe('new')
    expect(readdirSync(workDir)).toEqual(['state.json'])
  })

  it('gives up after a few attempts, keeping the old contents and no temporary file', () => {
    const filePath = join(workDir, 'state.json')
    writeFileSync(filePath, 'old')
    renameFailures.push(...Array<string>(10).fill('EBUSY'))

    expect(() => writeFileAtomicSync(filePath, 'new')).toThrow('EBUSY')
    expect(readFileSync(filePath, 'utf-8')).toBe('old')
    expect(readdirSync(workDir)).toEqual(['state.json'])
  })
})

describe('retrySync', () => {
  const retryAll = (): boolean => true

  it('returns the result without waiting when the task succeeds', () => {
    const sleep = vi.fn()

    expect(retrySync(() => 42, [10, 20], retryAll, sleep)).toBe(42)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('waits for each delay in turn until the task succeeds', () => {
    const sleep = vi.fn()
    const task = vi
      .fn<() => string>()
      .mockImplementationOnce(() => {
        throw errorWithCode('EBUSY')
      })
      .mockImplementationOnce(() => {
        throw errorWithCode('EPERM')
      })
      .mockReturnValue('done')

    expect(retrySync(task, [10, 50, 100], retryAll, sleep)).toBe('done')
    expect(sleep.mock.calls).toEqual([[10], [50]])
  })

  it('rethrows at once when the error is not worth retrying', () => {
    const sleep = vi.fn()
    const error = errorWithCode('ENOENT')

    expect(() =>
      retrySync(
        () => {
          throw error
        },
        [10],
        () => false,
        sleep
      )
    ).toThrow(error)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('rethrows the last error once the delays run out', () => {
    const sleep = vi.fn()
    let attempts = 0

    expect(() =>
      retrySync(
        () => {
          attempts++
          throw errorWithCode(`EBUSY-${attempts}`)
        },
        [10, 20],
        retryAll,
        sleep
      )
    ).toThrow('EBUSY-3')
    expect(sleep.mock.calls).toEqual([[10], [20]])
  })
})
