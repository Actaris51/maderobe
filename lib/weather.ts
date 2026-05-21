/**
 * Open-Meteo client. Free, no API key, GDPR-friendly.
 *
 * Docs: https://open-meteo.com/en/docs
 *
 * Forecast horizon: up to 16 days.
 */

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'unknown';

export type CurrentWeather = {
  temperature: number; // °C
  humidity: number; // %
  precipitation: number; // mm last hour
  condition: WeatherCondition;
  fetchedAt: string; // ISO datetime
  lat: number;
  lon: number;
};

export type DailyForecast = {
  date: string; // YYYY-MM-DD
  tMin: number; // °C
  tMax: number; // °C
  precipitation: number; // mm
  condition: WeatherCondition;
};

/** Map WMO weather codes to a coarse condition bucket. */
export function wmoToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'unknown';
}

export function conditionEmoji(c: WeatherCondition): string {
  switch (c) {
    case 'clear': return '☀️';
    case 'cloudy': return '☁️';
    case 'rain': return '🌧️';
    case 'snow': return '❄️';
    case 'storm': return '⛈️';
    default: return '🌤️';
  }
}

export function conditionLabel(c: WeatherCondition): string {
  switch (c) {
    case 'clear': return 'Ensoleillé';
    case 'cloudy': return 'Nuageux';
    case 'rain': return 'Pluvieux';
    case 'snow': return 'Neigeux';
    case 'storm': return 'Orageux';
    default: return '—';
  }
}

const BASE = 'https://api.open-meteo.com/v1/forecast';
const GEO_BASE = 'https://geocoding-api.open-meteo.com/v1/search';

/** Fetch current conditions for the given coordinates. */
export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,weather_code,precipitation',
    timezone: 'auto',
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data: {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      precipitation: number;
      weather_code: number;
    };
  } = await res.json();
  return {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    condition: wmoToCondition(data.current.weather_code),
    fetchedAt: new Date().toISOString(),
    lat,
    lon,
  };
}

/** Fetch a daily forecast for the next `days` days (max 16). */
export async function fetchDailyForecast(
  lat: number,
  lon: number,
  days: number,
): Promise<DailyForecast[]> {
  const capped = Math.min(Math.max(1, days), 16);
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum',
    timezone: 'auto',
    forecast_days: String(capped),
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data: {
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      weather_code: number[];
      precipitation_sum: number[];
    };
  } = await res.json();
  const out: DailyForecast[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    out.push({
      date: data.daily.time[i],
      tMin: data.daily.temperature_2m_min[i],
      tMax: data.daily.temperature_2m_max[i],
      precipitation: data.daily.precipitation_sum[i],
      condition: wmoToCondition(data.daily.weather_code[i]),
    });
  }
  return out;
}

export type GeocodingHit = {
  name: string; // city name
  country: string;
  admin1?: string; // region
  latitude: number;
  longitude: number;
};

/** Search cities by name (FR results preferred). */
export async function searchCity(query: string): Promise<GeocodingHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const params = new URLSearchParams({
    name: trimmed,
    count: '5',
    language: 'fr',
    format: 'json',
  });
  const res = await fetch(`${GEO_BASE}?${params}`);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const data: {
    results?: Array<{
      name: string;
      country: string;
      admin1?: string;
      latitude: number;
      longitude: number;
    }>;
  } = await res.json();
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}
