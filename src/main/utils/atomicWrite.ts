import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeSync } from 'fs'

// On Windows a write like this can fail for a moment: replacing a file that
// another process (antivirus, search indexer, backup software) briefly holds
// open fails with EPERM / EBUSY / EACCES, and in the app's E2E runs the
// just-written temporary file was now and then already gone when it was
// renamed (ENOENT). Such failures are retried for a short while, rewriting the
// temporary file each time, before giving up.
const RETRY_DELAYS_MS = [10, 50, 100, 200, 400]
const RETRYABLE_ERROR_CODES = new Set(['EPERM', 'EBUSY', 'EACCES', 'ENOENT'])

const isRetryableFsError = (error: unknown): boolean =>
  RETRYABLE_ERROR_CODES.has((error as NodeJS.ErrnoException | null)?.code ?? '')

const sleepSync = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// Runs task, retrying after each delay in turn while shouldRetry accepts the
// error; the last error is rethrown once the delays run out.
export function retrySync<T>(
  task: () => T,
  delaysMs: readonly number[],
  shouldRetry: (error: unknown) => boolean,
  sleep: (ms: number) => void = sleepSync
): T {
  for (let attempt = 0; ; attempt++) {
    try {
      return task()
    } catch (error) {
      const delay = delaysMs[attempt]
      if (delay === undefined || !shouldRetry(error)) throw error
      sleep(delay)
    }
  }
}

let tempFileCount = 0

const removeIfPresent = (path: string): void => {
  try {
    rmSync(path, { force: true })
  } catch {
    // A leftover temporary file is harmless; the error that led here matters more.
  }
}

const writeThroughTempFile = (filePath: string, data: string): void => {
  // A fresh name for every attempt, so none reuses a name an earlier one may
  // still be releasing.
  const tempPath = `${filePath}.${process.pid}-${++tempFileCount}.tmp`
  try {
    const fd = openSync(tempPath, 'w')
    try {
      writeSync(fd, data, null, 'utf-8')
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tempPath, filePath)
  } catch (error) {
    removeIfPresent(tempPath)
    throw error
  }
}

// Writes to a temporary file next to the target, flushes it to disk and then
// renames it into place, so a crash or power loss mid-write leaves either the
// old or the new contents - never a truncated file.
export function writeFileAtomicSync(filePath: string, data: string): void {
  retrySync(() => writeThroughTempFile(filePath, data), RETRY_DELAYS_MS, isRetryableFsError)
}
