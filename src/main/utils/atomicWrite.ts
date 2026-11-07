import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeSync } from 'fs'

// Windows refuses to replace a file that another process (antivirus, search
// indexer, backup software) briefly holds open, failing with EPERM / EBUSY /
// EACCES, so the final rename is retried for a short while before giving up.
const RENAME_RETRY_DELAYS_MS = [10, 50, 100, 200]
const RETRYABLE_ERROR_CODES = new Set(['EPERM', 'EBUSY', 'EACCES'])

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

// Writes to a temporary file next to the target, flushes it to disk and then
// renames it into place, so a crash or power loss mid-write leaves either the
// old or the new contents - never a truncated file.
export function writeFileAtomicSync(filePath: string, data: string): void {
  const tempPath = `${filePath}.${process.pid}.tmp`
  try {
    const fd = openSync(tempPath, 'w')
    try {
      writeSync(fd, data, null, 'utf-8')
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    retrySync(() => renameSync(tempPath, filePath), RENAME_RETRY_DELAYS_MS, isRetryableFsError)
  } catch (error) {
    rmSync(tempPath, { force: true })
    throw error
  }
}
