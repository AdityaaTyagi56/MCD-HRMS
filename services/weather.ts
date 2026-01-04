import { Ward } from '../types';

export interface WeatherSnapshot {
  temperatureC: number;
  windKph: number;
  precipitationMm: number;
  condition: 'clear' | 'light_rain' | 'heavy_rain' | 'windy';
  raw: any;
}

const DELHI_LAT = 28.6139;
const DELHI_LON = 77.2090;

export const fetchDelhiWeather = async (): Promise<WeatherSnapshot> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${DELHI_LAT}&longitude=${DELHI_LON}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,wind_speed_10m`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch weather');
  }
  const data = await res.json();
  const current = data.current || {};
  const precipitationMm = Number(current.precipitation ?? 0);
  const windKph = Number(current.wind_speed_10m ?? 0);

  let condition: WeatherSnapshot['condition'] = 'clear';
  if (precipitationMm >= 10) condition = 'heavy_rain';
  else if (precipitationMm >= 2) condition = 'light_rain';
  else if (windKph >= 35) condition = 'windy';

  return {
    temperatureC: Number(current.temperature_2m ?? 0),
    windKph,
    precipitationMm,
    condition,
    raw: data,
  };
};

export const pickHighestRiskWard = (wards: Ward[]): Ward | null => {
  if (!wards.length) return null;
  const rank = { Low: 1, Medium: 2, High: 3, Critical: 4 } as const;
  return [...wards].sort((a, b) => (rank[b.riskLevel] || 0) - (rank[a.riskLevel] || 0))[0];
};
