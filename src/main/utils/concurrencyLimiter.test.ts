import { describe, expect, it } from 'vitest'
import { ConcurrencyLimiter } from './concurrencyLimiter'

describe('ConcurrencyLimiter', () => {
  const deferred = (): { promise: Promise<void>; resolve: () => void } => {
    let resolve!: () => void
    const promise = new Promise<void>((done) => (resolve = done))
    return { promise, resolve }
  }

  it('runs at most the given number of tasks at once, the rest in order', async () => {
    const limiter = new ConcurrencyLimiter(2)
    const gates = [deferred(), deferred(), deferred(), deferred()]
    const started: number[] = []
    const runs = gates.map((gate, index) =>
      limiter.run(async () => {
        started.push(index)
        await gate.promise
        return index
      })
    )

    await Promise.resolve()
    expect(started).toEqual([0, 1])

    gates[1]!.resolve()
    await runs[1]
    await Promise.resolve()
    expect(started).toEqual([0, 1, 2])

    gates.forEach((gate) => gate.resolve())
    expect(await Promise.all(runs)).toEqual([0, 1, 2, 3])
    expect(started).toEqual([0, 1, 2, 3])
  })

  it('frees the slot of a task that fails', async () => {
    const limiter = new ConcurrencyLimiter(1)

    await expect(limiter.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await expect(limiter.run(async () => 'next')).resolves.toBe('next')
  })
})
