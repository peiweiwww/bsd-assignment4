export type City = {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type WeatherReading = {
  id: string;
  city_id: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  recorded_at: string;
};

export function weatherCodeToLabel(code: number): string {
  switch (code) {
    case 0:  return "Clear sky";
    case 1:  return "Mainly clear";
    case 2:  return "Partly cloudy";
    case 3:  return "Overcast";
    case 45: return "Fog";
    case 48: return "Fog";
    case 51: return "Drizzle (light)";
    case 53: return "Drizzle (moderate)";
    case 55: return "Drizzle (dense)";
    case 56: return "Freezing drizzle";
    case 57: return "Freezing drizzle";
    case 61: return "Rain (slight)";
    case 63: return "Rain (moderate)";
    case 65: return "Rain (heavy)";
    case 66: return "Freezing rain";
    case 67: return "Freezing rain";
    case 71: return "Snow fall (slight)";
    case 73: return "Snow fall (moderate)";
    case 75: return "Snow fall (heavy)";
    case 77: return "Snow grains";
    case 80: return "Rain showers (slight)";
    case 81: return "Rain showers (moderate)";
    case 82: return "Rain showers (violent)";
    case 85: return "Snow showers";
    case 86: return "Snow showers";
    case 95: return "Thunderstorm";
    case 96: return "Thunderstorm with hail";
    case 99: return "Thunderstorm with hail";
    default: return "Unknown";
  }
}
