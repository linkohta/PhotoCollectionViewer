// Runs at most maxConcurrent tasks at a time; the others wait, in the order
// they were started, until a running task finishes.
export class ConcurrencyLimiter {
  private running = 0
  private readonly waiters: Array<() => void> = []
  private readonly maxConcurrent: number

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve)
      })
    }

    this.running++
    try {
      return await task()
    } finally {
      this.running--
      const next = this.waiters.shift()
      if (next) next()
    }
  }
}
