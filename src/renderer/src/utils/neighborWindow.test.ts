import { describe, expect, it } from 'vitest'
import { getNeighborWindow } from './neighborWindow'

const alternating = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => [from + i, -(from + i)]).flat()

describe('getNeighborWindow', () => {
  it('prepares nothing around the only image, but keeps it warm', () => {
    expect(getNeighborWindow(1)).toEqual({ fullOffsets: [], previews: [], warmupOffsets: [0] })
  })

  it('preloads the three images on each side in full', () => {
    expect(getNeighborWindow(100).fullOffsets).toEqual([1, 2, 3, -1, -2, -3])
  })

  // In a small folder the offsets wrap around and can land on the same image;
  // preloading one twice costs nothing, as the preload cache keeps one copy.
  it('preloads the same offsets in full in a folder of two', () => {
    expect(getNeighborWindow(2).fullOffsets).toEqual([1, 2, 3, -1, -2, -3])
  })

  it('fetches previews from four to twenty away, the nearest two as data URLs', () => {
    const { previews } = getNeighborWindow(100)

    expect(previews.map((preview) => preview.offset)).toEqual(alternating(4, 20))
    expect(previews.filter((preview) => preview.hot).map((preview) => preview.offset)).toEqual(
      alternating(4, 5)
    )
  })

  it('keeps the current image and twenty on each side warm, nearest first', () => {
    expect(getNeighborWindow(100).warmupOffsets).toEqual([0, ...alternating(1, 20)])
  })

  it('stops before the two sides meet in a small folder', () => {
    expect(getNeighborWindow(7)).toEqual({
      fullOffsets: [1, 2, 3, -1, -2, -3],
      previews: [],
      warmupOffsets: [0, 1, -1, 2, -2, 3, -3]
    })
    expect(getNeighborWindow(10).previews).toEqual([
      { offset: 4, hot: true },
      { offset: -4, hot: true }
    ])
  })
})
