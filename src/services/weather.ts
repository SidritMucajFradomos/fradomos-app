export const WEATHER_API_BASE = 'https://api.weatherapi.com/v1';
export const WEATHER_API_KEY = 'e5e29c4936df4fff87b160026253006';
export const WEATHER_DEFAULT_CITY = 'Shkoder';

export type CurrentWeather = {
  tempC: number;
  conditionText: string;
  iconName:
    | 'sunny-outline'
    | 'cloud-outline' 
    | 'rainy-outline'
    | 'thunderstorm-outline'
    | 'snow-outline'
    | 'partly-sunny-outline';
};

const mapConditionToIcon = (conditionText: string): CurrentWeather['iconName'] => {
  const condition = conditionText.toLowerCase();
  if (condition.includes('sunny') || condition.includes('clear')) return 'sunny-outline';
  if (condition.includes('cloud') || condition.includes('overcast')) return 'cloud-outline';
  if (condition.includes('rain') || condition.includes('drizzle')) return 'rainy-outline';
  if (condition.includes('storm') || condition.includes('thunder')) return 'thunderstorm-outline';
  if (condition.includes('snow') || condition.includes('sleet')) return 'snow-outline';
  if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) return 'cloud-outline';
  return 'partly-sunny-outline';
};

// Small helper to enforce a timeout on fetch
const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 7000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

export async function getCurrentWeather(city: string = WEATHER_DEFAULT_CITY): Promise<CurrentWeather> {
  const url = `${WEATHER_API_BASE}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`;
  // Use timeout-enabled fetch to avoid hanging forever
  const res = await fetchWithTimeout(url).catch(() => {
    throw new Error('Failed to fetch weather');
  });
  if (!res.ok) {
    throw new Error('Failed to fetch weather');
  }
  const data = await res.json();
  const tempC = Math.round(data.current?.temp_c ?? 0);
  const conditionText = data.current?.condition?.text || '';
  const iconName = mapConditionToIcon(conditionText);

  return { tempC, conditionText, iconName };
}
