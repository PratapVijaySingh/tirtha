import a from './data/visitor-a.json';
import b from './data/visitor-b.json';
import c from './data/visitor-c.json';
import d from './data/visitor-d.json';
import e from './data/visitor-e.json';

export const INFO_VERIFIED = 'October 2026';

export const VISITOR_INFO = Object.fromEntries([...a, ...b, ...c, ...d, ...e].map((v) => [v.id, v]));

const WMO = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Dense drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '🌨️'], 80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Heavy snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Thunderstorm, hail', '⛈️'],
};

const AQI_BANDS = [
  [50, 'Good', 'good'],
  [100, 'Moderate', 'mod'],
  [150, 'Unhealthy for sensitive groups', 'usg'],
  [200, 'Unhealthy', 'bad'],
  [300, 'Very unhealthy', 'worse'],
  [1000, 'Hazardous', 'hazard'],
];
const UV_BANDS = [
  [2, 'low'],
  [5, 'moderate'],
  [7, 'high'],
  [10, 'very high'],
  [99, 'extreme'],
];

function bandOf(n, table) {
  return table.find(([max]) => n <= max) || table[table.length - 1];
}

const liveCache = new Map();
function remember(key, loader) {
  const hit = liveCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return Promise.resolve(hit.value);
  return loader().then((value) => {
    liveCache.set(key, { at: Date.now(), value });
    return value;
  });
}

function spotKey(kind, lat, lon) {
  return `${kind}:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function fetchWeather(lat, lon) {
  return remember(spotKey('wx', lat, lon), () => loadWeatherNow(lat, lon));
}

async function loadWeatherNow(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FKolkata&forecast_days=3`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`weather ${r.status}`);
  const j = await r.json();
  const [text, icon] = WMO[j.current.weather_code] || ['—', '🌡️'];
  return {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    humidity: j.current.relative_humidity_2m,
    wind: Math.round(j.current.wind_speed_10m),
    text, icon,
    days: j.daily.time.map((t, i) => ({
      date: t,
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rain: j.daily.precipitation_probability_max[i],
      sunrise: j.daily.sunrise[i].slice(11),
      sunset: j.daily.sunset[i].slice(11),
    })),
  };
}

export async function fetchAir(lat, lon) {
  return remember(spotKey('air', lat, lon), () => loadAirNow(lat, lon));
}

async function loadAirNow(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,uv_index&timezone=Asia%2FKolkata`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`air ${r.status}`);
  const c = (await r.json()).current || {};
  if (c.us_aqi == null) throw new Error('air missing');
  const aqi = Math.round(c.us_aqi);
  const [, band, tone] = bandOf(aqi, AQI_BANDS);
  const uv = c.uv_index == null ? null : Math.round(c.uv_index);
  return {
    aqi,
    band,
    tone,
    pm25: c.pm2_5 == null ? null : Math.round(c.pm2_5),
    pm10: c.pm10 == null ? null : Math.round(c.pm10),
    uv: uv == null ? null : { uv, band: bandOf(uv, UV_BANDS)[1] },
  };
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let userPos = null;
const geoOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 };

export function getUserPosition() {
  if (userPos) return Promise.resolve(userPos);
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not available in this browser'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve((userPos = { lat: p.coords.latitude, lon: p.coords.longitude })),
      (e) => reject(e),
      geoOptions,
    );
  });
}

export function watchUserPosition(onPos) {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    (p) => {
      userPos = { lat: p.coords.latitude, lon: p.coords.longitude };
      onPos(userPos);
    },
    () => {},
    geoOptions,
  );
  return () => navigator.geolocation.clearWatch(id);
}
