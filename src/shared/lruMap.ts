// A Map that holds at most maxSize entries: storing one more drops the entry
// stored least recently, after handing it to onEvict. Storing a key again
// counts as a fresh use; reading it with get() does not.
export class LruMap<K, V> {
  private readonly entries = new Map<K, V>()
  private readonly maxSize: number
  private readonly onEvict: ((value: V, key: K) => void) | undefined

  constructor(maxSize: number, onEvict?: (value: V, key: K) => void) {
    this.maxSize = maxSize
    this.onEvict = onEvict
  }

  get size(): number {
    return this.entries.size
  }

  get(key: K): V | undefined {
    return this.entries.get(key)
  }

  set(key: K, value: V): void {
    // A Map iterates in insertion order, so re-inserting moves the key last
    // and the first entry is always the least recently stored.
    this.entries.delete(key)
    this.entries.set(key, value)

    while (this.entries.size > this.maxSize) {
      const oldest = this.entries.entries().next()
      if (oldest.done) break
      const [oldestKey, oldestValue] = oldest.value
      this.entries.delete(oldestKey)
      this.onEvict?.(oldestValue, oldestKey)
    }
  }

  values(): IterableIterator<V> {
    return this.entries.values()
  }

  // Drops every entry without calling onEvict.
  clear(): void {
    this.entries.clear()
  }
}
