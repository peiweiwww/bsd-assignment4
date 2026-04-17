'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { City } from '@weather/shared'

const USER_AGENT = 'weather-dashboard/1.0 (https://github.com/peiweiwww/bsd-assignment4)'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GeocodeResult {
  name: string
  latitude: number
  longitude: number
}

interface GeocodeResponse {
  results?: GeocodeResult[]
}

interface OpenMeteoCurrentResponse {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    wind_speed_10m: number
    weather_code: number
  }
}

// ── Helper: fetch current weather + insert into weather_readings ───────────────
// Failures are non-fatal — the worker will catch up on the next poll.

async function fetchAndInsertInitialReading(
  cityId: string,
  lat: number,
  lon: number
): Promise<void> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

    let res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })

    if (res.status === 429) {
      const retryAfterSec = parseInt(res.headers.get('retry-after') ?? '60', 10)
      await new Promise((r) => setTimeout(r, retryAfterSec * 1000))
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    }

    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)

    const json = (await res.json()) as OpenMeteoCurrentResponse
    const { temperature_2m, relative_humidity_2m, wind_speed_10m, weather_code } = json.current

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('weather_readings').insert({
      city_id: cityId,
      temperature: temperature_2m,
      humidity: relative_humidity_2m,
      wind_speed: wind_speed_10m,
      weather_code,
    })

    if (error) throw new Error(error.message)
  } catch (err) {
    console.warn('[addCity] Initial reading fetch failed (worker will retry):', err)
  }
}

// ── Server Actions ─────────────────────────────────────────────────────────────

export async function addCity(formData: FormData): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('You must be signed in to add a city.')

  const rawName = formData.get('name')
  if (typeof rawName !== 'string' || !rawName.trim()) {
    throw new Error('City name cannot be empty.')
  }
  const name = rawName.trim()

  // Geocode via Open-Meteo
  const geocodeUrl =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(name)}&count=1&language=en&format=json`

  let geoData: GeocodeResponse
  try {
    const res = await fetch(geocodeUrl, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`Geocoding request failed: HTTP ${res.status}`)
    geoData = (await res.json()) as GeocodeResponse
  } catch {
    throw new Error('Could not reach the geocoding service. Try again.')
  }

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`City not found: "${name}"`)
  }

  const { name: canonicalName, latitude, longitude } = geoData.results[0]

  const supabase = await createServerSupabaseClient()
  const { data: newCity, error } = await supabase
    .from('cities')
    .insert({ user_id: userId, name: canonicalName, latitude, longitude })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('You already added this city.')
    throw new Error(`Failed to save city: ${error.message}`)
  }

  // Best-effort: fetch current weather immediately so the card shows data
  // right away instead of waiting for the next worker poll (up to 5 min).
  // Fires async — does not block the response or fail addCity on error.
  await fetchAndInsertInitialReading(newCity.id, latitude, longitude)

  revalidatePath('/')
}

export async function deleteCity(cityId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('You must be signed in to delete a city.')

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('cities')
    .delete()
    .eq('id', cityId)

  if (error) throw new Error(`Failed to delete city: ${error.message}`)

  revalidatePath('/')
}

export async function getMyCities(): Promise<City[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch cities: ${error.message}`)
  return (data ?? []) as City[]
}
