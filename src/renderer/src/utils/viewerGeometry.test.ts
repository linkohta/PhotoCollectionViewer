import { describe, expect, it } from 'vitest'
import { getFitScale, getRotatedSize } from './viewerGeometry'

describe('getRotatedSize', () => {
  const size = { width: 400, height: 300 }

  it('swaps width and height for quarter turns, including negative and wrapped angles', () => {
    for (const rotation of [90, 270, -90, 450]) {
      expect(getRotatedSize(size, rotation)).toEqual({ width: 300, height: 400 })
    }
  })

  it('keeps the size for half and full turns', () => {
    for (const rotation of [0, 180, 360, -180]) {
      expect(getRotatedSize(size, rotation)).toEqual(size)
    }
  })
})

describe('getFitScale', () => {
  it('uses the tighter of the two axes', () => {
    expect(getFitScale({ width: 4000, height: 2000 }, { width: 1000, height: 1000 })).toBe(0.25)
    expect(getFitScale({ width: 1000, height: 4000 }, { width: 1000, height: 1000 })).toBe(0.25)
  })

  it('enlarges images smaller than the container', () => {
    expect(getFitScale({ width: 100, height: 50 }, { width: 400, height: 400 })).toBe(4)
  })

  it('falls back to 1 when either size is still unknown', () => {
    expect(getFitScale({ width: 0, height: 0 }, { width: 800, height: 600 })).toBe(1)
    expect(getFitScale({ width: 800, height: 600 }, { width: 0, height: 0 })).toBe(1)
  })
})
