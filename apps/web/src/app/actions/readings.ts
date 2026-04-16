'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import type { WeatherReading } from '@weather/shared'

/**
 * Returns the most recent WeatherReading for each city_id in the provided list.
 * Rows are fetched ordered newest-first so the first row per city_id is the latest.
 */
export async function getLatestReadings(
  cityIds: string[]
): Promise<Record<string, WeatherReading>> {
  if (cityIds.length === 0) return {}

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('weather_readings')
    .select('*')
    .in('city_id', cityIds)
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch weather readings: ${error.message}`)

  const latest: Record<string, WeatherReading> = {}
  for (const row of (data ?? []) as WeatherReading[]) {
    if (!latest[row.city_id]) {
      latest[row.city_id] = row
    }
  }
  return latest
}
