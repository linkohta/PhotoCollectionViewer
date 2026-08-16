import { useEffect, useRef, useState } from 'react'

interface RenameInputProps {
  initialName: string
  onSubmit: (newName: string) => Promise<void>
  onCancel: () => void
}

export function RenameInput({ initialName, onSubmit, onCancel }: RenameInputProps): JSX.Element {
  const [value, setValue] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = async (): Promise<void> => {
    if (submitting) return

    const trimmed = value.trim()
    if (!trimmed || trimmed === initialName) {
      onCancel()
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : '名前の変更に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="rename-input-wrap" onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        className="rename-input"
        value={value}
        disabled={submitting}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void submit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
        onBlur={() => {
          if (!submitting) onCancel()
        }}
      />
      {error && <span className="rename-input-error">{error}</span>}
    </div>
  )
}
