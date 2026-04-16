'use client'

import { useRef, useState, useTransition } from 'react'
import { addCity } from '@/app/actions/cities'

export default function AddCityForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await addCity(formData)
        if (inputRef.current) inputRef.current.value = ''
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          name="name"
          type="text"
          placeholder="Enter a city name…"
          required
          disabled={isPending}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Adding…' : 'Add City'}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
