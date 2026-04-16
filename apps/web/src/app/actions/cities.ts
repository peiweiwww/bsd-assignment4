'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { City } from '@weather/shared'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GeocodeResult {
  name: string
  latitude: number
  longitude: number
}

interface GeocodeResponse {
  results?: GeocodeResult[]
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
    const res = await fetch(geocodeUrl)
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
  const { error } = await supabase
    .from('cities')
    .insert({ user_id: userId, name: canonicalName, latitude, longitude })

  if (error) {
    // Postgres unique violation — user already has this city
    if (error.code === '23505') {
      throw new Error('You already added this city.')
    }
    throw new Error(`Failed to save city: ${error.message}`)
  }

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
