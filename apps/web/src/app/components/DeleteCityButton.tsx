'use client'

import { useTransition } from 'react'
import { deleteCity } from '@/app/actions/cities'

export default function DeleteCityButton({ cityId }: { cityId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await deleteCity(cityId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label="Delete city"
      className="rounded px-2 py-1 text-sm text-gray-400 hover:text-red-500
                 hover:bg-red-50 disabled:opacity-40 transition-colors"
    >
      {isPending ? '…' : '✕'}
    </button>
  )
}
