'use client'

import { useEffect, useRef, useState } from 'react'
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

const ts = () => new Date().toISOString()

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  cities: City[]
  initialReadings: Record<string, WeatherReading>
}

export default function CityListRealtime({ cities, initialReadings }: Props) {
  const [readings, setReadings] = useState<Record<string, WeatherReading>>(initialReadings)
  const [, setTick] = useState(0)
  const { getToken } = useAuth()

  // Stable ref to the supabase client — created once, token refreshed in-place
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null)
  // Ref to the active channel so cleanup and token-refresh can always reach it
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserSupabaseClient>['channel']> | null>(null)

  // ── Realtime subscription with per-attempt token refresh ──────────────────
  useEffect(() => {
    console.log('[realtime]', ts(), 'effect fired')

    let cancelled = false
    // Track any pending reconnect setTimeout so we can cancel it on unmount
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    async function setupChannel(retryCount: number) {
      if (cancelled) return

      // Re-fetch token on every (re)connect attempt — Clerk tokens expire ~60s
      const token = await getToken()
      console.log('[realtime]', ts(), `token: ${token ? 'got token' : 'no token'} (attempt ${retryCount + 1})`)

      if (!token) {
        console.log('[realtime]', ts(), 'no token — user may be signed out, aborting subscription')
        return
      }
      if (cancelled) return

      // Create client once; subsequent calls just update auth
      if (!supabaseRef.current) {
        console.log('[realtime]', ts(), 'creating supabase client')
        supabaseRef.current = createBrowserSupabaseClient(token)
      }
      const supabase = supabaseRef.current

      // Always set auth before subscribing so this attempt uses a fresh token
      await supabase.realtime.setAuth(token)
      if (cancelled) return

      console.log('[realtime]', ts(), `subscribing to channel (attempt ${retryCount + 1})`)
      const channel = supabase
        .channel('weather-readings-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'weather_readings' },
          (payload) => {
            console.log('[realtime]', ts(), 'INSERT received:', payload)
            const r = payload.new as WeatherReading
            setReadings((prev) => {
              const existing = prev[r.city_id]
              if (!existing || new Date(r.recorded_at) > new Date(existing.recorded_at)) {
                return { ...prev, [r.city_id]: r }
              }
              return prev
            })
          }
        )
        .subscribe((status) => {
          console.log('[realtime]', ts(), 'subscription status:', status)

          if (status === 'SUBSCRIBED') {
            console.log('[realtime]', ts(), 'channel healthy ✓')
          }

          if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && retryCount < 10 && !cancelled) {
            console.log('[realtime]', ts(), `status ${status} — scheduling reconnect in 5s (retry ${retryCount + 1}/10)`)
            reconnectTimer = setTimeout(() => {
              if (cancelled) return
              supabase.removeChannel(channel)
              channelRef.current = null
              setupChannel(retryCount + 1) // recursive — getToken() called fresh each time
            }, 5000)
          }
        })

      channelRef.current = channel
    }

    // ── Proactive token refresh every 50s ──────────────────────────────────
    // Clerk session tokens expire ~60s. Re-authing before expiry prevents
    // CLOSED from ever being triggered by a stale token.
    refreshInterval = setInterval(async () => {
      if (cancelled || !supabaseRef.current) return
      const newToken = await getToken()
      if (newToken && !cancelled) {
        await supabaseRef.current.realtime.setAuth(newToken)
        console.log('[realtime]', ts(), 'proactively refreshed token')
      }
    }, 50_000)

    // Kick off initial subscription
    setupChannel(0)

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (refreshInterval) clearInterval(refreshInterval)
      if (channelRef.current && supabaseRef.current) {
        console.log('[realtime]', ts(), 'cleaning up channel')
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

            <div className="ml-4 shrink-0 self-start">
              <DeleteCityButton cityId={city.id} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
