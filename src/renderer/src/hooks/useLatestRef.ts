import { useLayoutEffect, useRef, type MutableRefObject } from 'react'

// A ref that always holds the value from the latest committed render. Event
// handlers can read it instead of closing over the value, so they don't have
// to be recreated - and passed down anew - every time the value changes.
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
