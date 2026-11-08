// A Map that holds at most maxSize entries: storing one more drops the entry
// stored least recently. Storing a key again counts as a fresh use; reading it
// with get() does not.
export class LruMap<K, V> {
  private readonly entries = new Map<K, V>()
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get size(): number {
    return this.entries.size
  }

  get(key: K): V | undefined {
    return this.entries.get(key)
  }

  set(key: K, value: V): void {
    // A Map iterates in insertion order, so re-inserting moves the key last
    // and the first key is always the least recently stored.
    this.entries.delete(key)
    this.entries.set(key, value)

    while (this.entries.size > this.maxSize) {
      const oldest = this.entries.keys().next()
      if (oldest.done) break
      this.entries.delete(oldest.value)
    }
  }
}
