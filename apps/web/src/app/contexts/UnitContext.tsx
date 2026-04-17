'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type TempUnit = 'C' | 'F'

interface UnitContextValue {
  unit: TempUnit
  setUnit: (u: TempUnit) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function convertTemp(celsius: number, unit: TempUnit): number {
  return unit === 'C' ? celsius : celsius * 9 / 5 + 32
}

export function formatTemp(celsius: number, unit: TempUnit): string {
  return `${convertTemp(celsius, unit).toFixed(1)}°${unit}`
}

// ── Context ────────────────────────────────────────────────────────────────────

const UnitContext = createContext<UnitContextValue | null>(null)

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext)
  if (!ctx) throw new Error('useUnit must be used within a UnitProvider')
  return ctx
}

// ── Provider ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'temp_unit'

export function UnitProvider({ children }: { children: React.ReactNode }) {
  // Initialize to 'C' on both server and client to avoid SSR hydration mismatch.
  // The real persisted value is synced from localStorage after mount.
  const [unit, setUnitState] = useState<TempUnit>('C')

  // On mount: read saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'C' || saved === 'F') setUnitState(saved)
  }, [])

  // On change: persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unit)
  }, [unit])

  return (
    <UnitContext.Provider value={{ unit, setUnit: setUnitState }}>
      {children}
    </UnitContext.Provider>
  )
}
