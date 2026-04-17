'use client'

import { useUnit } from '@/app/contexts/UnitContext'

export default function UnitToggle() {
  const { unit, setUnit } = useUnit()

  return (
    <div className="inline-flex rounded-full bg-white/60 backdrop-blur-sm border border-white/60 p-0.5">
      {(['C', 'F'] as const).map((u) => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            unit === u
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          °{u}
        </button>
      ))}
    </div>
  )
}
