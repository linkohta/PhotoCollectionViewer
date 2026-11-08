import { describe, expect, it } from 'vitest'
import { LruMap } from './lruMap'

const keysOf = (map: LruMap<string, number>, candidates: string[]): string[] =>
  candidates.filter((key) => map.get(key) !== undefined)

describe('LruMap', () => {
  it('drops the entry stored least recently once it holds more than its size', () => {
    const map = new LruMap<string, number>(2)
    map.set('a', 1)
    map.set('b', 2)
    map.set('c', 3)

    expect(map.size).toBe(2)
    expect(keysOf(map, ['a', 'b', 'c'])).toEqual(['b', 'c'])
  })

  it('counts storing a key again as a fresh use', () => {
    const map = new LruMap<string, number>(2)
    map.set('a', 1)
    map.set('b', 2)
    map.set('a', 10)
    map.set('c', 3)

    expect(keysOf(map, ['a', 'b', 'c'])).toEqual(['a', 'c'])
    expect(map.get('a')).toBe(10)
  })

  it('does not count reading a key as a use', () => {
    const map = new LruMap<string, number>(2)
    map.set('a', 1)
    map.set('b', 2)
    map.get('a')
    map.set('c', 3)

    expect(keysOf(map, ['a', 'b', 'c'])).toEqual(['b', 'c'])
  })
})
