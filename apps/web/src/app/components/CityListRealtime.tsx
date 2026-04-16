'use client'

// Note: token refresh on reconnect is not implemented; reload to reconnect if needed.

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import DeleteCityButton from '@/app/components/DeleteCityButton'
import { weatherCodeToLabel } from '@weather/shared'
import type { City, WeatherReading } from '@weather/shared'

// ── Relative time helper ───────────────────────────────────────────────────────

function formatRelativeTime(recorded_at: string): string {
  const diffMs = Date.now() - new Date(recorded_at).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  cities: City[]
  initialReadings: Record<string, WeatherReading>
}

export default function CityListRealtime({ cities, initialReadings }: Props) {
  const [readings, setReadings] = useState<Record<string, WeatherReading>>(initialReadings)
  const [, setTick] = useState(0) // forces re-render every minute to update relative times
  const { getToken } = useAuth()

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    // cancelled flag prevents async work completing after cleanup
    let cancelled = false
    let client: ReturnType<typeof createBrowserSupabaseClient> | null = null
    let channel: ReturnType<ReturnType<typeof createBrowserSupabaseClient>['channel']> | null = null

    async function subscribe() {
      const token = await getToken()
      if (cancelled) return

      client = createBrowserSupabaseClient(token)

      // Realtime WebSocket auth is separate from the REST Authorization header.
      // Without setAuth(), Supabase silently rejects the channel join.
      if (token) {
        await client.realtime.setAuth(token)
      }
      if (cancelled) return

      channel = client
        .channel('weather-readings-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'weather_readings' },
          (payload) => {
            const r = payload.new as WeatherReading
            setReadings((prev) => {
              const existing = prev[r.city_id]
              if (
                !existing ||
                new Date(r.recorded_at) > new Date(existing.recorded_at)
              ) {
                return { ...prev, [r.city_id]: r }
              }
              return prev
            })
          }
        )
        .subscribe((_status) => {
          // status logged during development; remove callback if not needed
        })
    }

    subscribe()

    return () => {
      cancelled = true
      if (channel && client) {
        client.removeChannel(channel)
      }
    }
  }, []) // subscribe once on mount — getToken is captured from the initial closure

  // ── Minute ticker — keeps relative timestamps fresh ────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick((c) => c + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (cities.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-10">
        No cities yet. Add one above.
      </p>
    )
  }

  // ── City cards ─────────────────────────────────────────────────────────────
  return (
    <ul className="space-y-3">
      {cities.map((city) => {
        const reading = readings[city.id]
        return (
          <li
            key={city.id}
            className="flex items-start justify-between border border-gray-200
                       rounded-lg p-4 bg-white hover:border-gray-300 hover:shadow-sm
                       transition-all"
          >
            {/* Left: city info + weather */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">{city.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">
                {city.latitude.toFixed(4)}, {city.longitude.toFixed(4)}
              </p>

              {reading ? (
                <div>
                  <p className="text-3xl font-semibold text-gray-900 leading-none">
                    {reading.temperature.toFixed(1)}°C
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {weatherCodeToLabel(reading.weather_code)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {reading.humidity}% humidity
                    {' · '}
                    {reading.wind_speed.toFixed(1)} km/h wind
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Updated {formatRelativeTime(reading.recorded_at)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Waiting for first reading…
                </p>
              )}
            </div>

            {/* Right: delete button */}
            <div className="ml-4 shrink-0 self-start">
              <DeleteCityButton cityId={city.id} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
