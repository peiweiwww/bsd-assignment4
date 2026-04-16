import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { City, WeatherReading, weatherCodeToLabel } from '@weather/shared';

// ── Environment ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.'
  );
}

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 300_000);

// ── Supabase client ────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Data functions ─────────────────────────────────────────────────────────────

async function fetchCities(): Promise<City[]> {
  const { data, error } = await supabase.from('cities').select('*');
  if (error) throw new Error(`fetchCities failed: ${error.message}`);
  return (data ?? []) as City[];
}

interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
}

async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Open-Meteo request failed for (${lat}, ${lon}): HTTP ${res.status}`
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Failed to parse Open-Meteo JSON for (${lat}, ${lon})`);
  }

  const current = (json as { current: Record<string, number> }).current;
  return {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_speed: current.wind_speed_10m,
    weather_code: current.weather_code,
  };
}

async function insertReadings(
  rows: Omit<WeatherReading, 'id' | 'recorded_at'>[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('weather_readings').insert(rows);
  if (error) throw new Error(`insertReadings failed: ${error.message}`);
}

// ── Poll cycle ─────────────────────────────────────────────────────────────────

async function pollOnce(): Promise<void> {
  const cities = await fetchCities();

  // Deduplicate by "lat,lon" — multiple users may share a coordinate
  const coordMap = new Map<string, City[]>();
  for (const city of cities) {
    const key = `${city.latitude},${city.longitude}`;
    const bucket = coordMap.get(key) ?? [];
    bucket.push(city);
    coordMap.set(key, bucket);
  }

  const readingRows: Omit<WeatherReading, 'id' | 'recorded_at'>[] = [];
  let successfulCoords = 0;

  for (const [key, bucket] of coordMap) {
    const [latStr, lonStr] = key.split(',');
    const lat = Number(latStr);
    const lon = Number(lonStr);

    let snapshot: WeatherSnapshot;
    try {
      snapshot = await fetchCurrentWeather(lat, lon);
    } catch (err) {
      console.error(`[poll] Error fetching weather for (${lat}, ${lon}):`, err);
      continue;
    }

    successfulCoords++;

    // One reading row per city that shares this coordinate
    for (const city of bucket) {
      readingRows.push({
        city_id: city.id,
        temperature: snapshot.temperature,
        humidity: snapshot.humidity,
        wind_speed: snapshot.wind_speed,
        weather_code: snapshot.weather_code,
      });
      console.log(
        `[poll] ${city.name}: ${snapshot.temperature}°C — ${weatherCodeToLabel(snapshot.weather_code)}`
      );
    }
  }

  await insertReadings(readingRows);

  console.log(
    `[poll] ${cities.length} cities, ${coordMap.size} unique coords, ${readingRows.length} readings inserted`
  );
}

// ── Entry point ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(
    `[worker] Starting. Poll interval: ${POLL_INTERVAL_MS}ms (${POLL_INTERVAL_MS / 60_000} min)`
  );

  await pollOnce();

  const timer = setInterval(() => {
    pollOnce().catch((err) => console.error('[poll] Unhandled error:', err));
  }, POLL_INTERVAL_MS);

  const shutdown = (signal: string) => {
    console.log(`[worker] Received ${signal}, shutting down.`);
    clearInterval(timer);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
