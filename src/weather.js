import { countries } from 'countries-list';

const namesLt = new Intl.DisplayNames(['lt'], { type: 'region' });
const namesEn = new Intl.DisplayNames(['en'], { type: 'region' });
const normalize = (text) => text.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function resolveCountry(input) {
  const value = normalize(input);
  const code = Object.keys(countries).find((code) => [code, namesLt.of(code), namesEn.of(code), countries[code].name].some((name) => normalize(name) === value));
  if (!code) throw new Error('Šalis neatpažinta. Įveskite lietuvišką / anglišką pavadinimą arba ISO kodą, pvz., Lietuva, Lithuania, LT.');
  return { code, name: namesLt.of(code), capital: countries[code].capital };
}

async function requestJson(url, fetchImpl) {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
    if (response.status === 429) throw new Error('Open-Meteo: viršytas užklausų limitas. Pabandykite vėliau.');
    if (!response.ok) throw new Error(`Open-Meteo: nepavyko gauti duomenų (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.error) throw new Error('Open-Meteo: nepavyko apdoroti užklausos. Patikrinkite vietovę.');
    return result;
  } catch (error) {
    if (error.message.startsWith('Open-Meteo:')) throw error;
    throw new Error('Open-Meteo: ryšio klaida arba netinkamas atsakymas. Patikrinkite internetą ir bandykite dar kartą.');
  }
}

export async function getWeather(countryInput, cityInput = '', { fetchImpl = fetch } = {}) {
  const country = resolveCountry(countryInput);
  const useCapital = !cityInput.trim();
  const city = cityInput.trim() || country.capital;
  if (!city) throw new Error('Šios šalies sostinė nenurodyta. Pakartokite paiešką įvesdami miestą.');

  const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geoUrl.search = new URLSearchParams({ name: city, countryCode: country.code, count: '100', language: 'en', format: 'json' });
  const geo = await requestJson(geoUrl, fetchImpl);
  if (geo.results !== undefined && !Array.isArray(geo.results)) throw new Error('Open-Meteo: netinkamas vietovės atsakymas.');
  // API grąžina ir parkus, oro uostus bei rajonus — ieškome gyvenviečių.
  let matches = (geo.results ?? []).filter((location) =>
    location.country_code === country.code && /^(PPL|PPLA[1-5]?|PPLC|PPLG)$/.test(location.feature_code),
  );
  // Sostinę parenkame pagal GeoNames PPLC kodą; kitais atvejais tikslų pavadinimą.
  const capitals = useCapital ? matches.filter((location) => location.feature_code === 'PPLC') : [];
  const exact = matches.filter((location) => normalize(location.name) === normalize(city.split(',')[0]));
  matches = capitals.length ? capitals : exact.length ? exact : matches;
  if (!matches.length) throw new Error(`Miestas „${city}“ šalyje „${country.name}“ nerastas. Patikrinkite pavadinimą (galite bandyti angliškai).`);
  if (matches.length > 1) {
    const regions = [...new Set(matches.map((location) => location.admin1).filter(Boolean))].join(', ');
    throw new Error(`Rasti keli miestai tuo pačiu pavadinimu. Pridėkite regioną po kablelio, pvz., „${city.split(',')[0]},${matches[0].admin1 ?? 'regionas'}“. Regionai: ${regions || 'nenurodyti'}.`);
  }
  const location = matches[0];
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) throw new Error('Open-Meteo: negautos vietovės koordinatės.');
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.search = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    temperature_unit: 'celsius', wind_speed_unit: 'ms', timezone: 'auto', forecast_days: '1',
  });
  const data = await requestJson(weatherUrl, fetchImpl);
  const current = data.current;
  if (!current || ![current.temperature_2m, current.apparent_temperature, current.relative_humidity_2m, current.wind_speed_10m, current.weather_code].every(Number.isFinite) || typeof current.time !== 'string' || typeof data.timezone !== 'string') {
    throw new Error('Open-Meteo: atsakyme trūksta orų duomenų.');
  }
  return { country, city: location.name, useCapital, data };
}

export function describeWeather(code) {
  const descriptions = {
    0: 'giedra', 1: 'daugiausia giedra', 2: 'dalinai debesuota', 3: 'debesuota',
    45: 'rūkas', 48: 'šerkšnojantis rūkas',
    51: 'silpna dulksna', 53: 'dulksna', 55: 'smarki dulksna', 56: 'silpna lijundra', 57: 'smarki lijundra',
    61: 'silpnas lietus', 63: 'lietus', 65: 'smarkus lietus', 66: 'silpnas šąlantis lietus', 67: 'smarkus šąlantis lietus',
    71: 'silpnas sniegas', 73: 'sniegas', 75: 'smarkus sniegas', 77: 'sniego kruopos',
    80: 'silpna liūtis', 81: 'liūtis', 82: 'smarki liūtis', 85: 'silpnos sniego liūtys', 86: 'smarkios sniego liūtys',
    95: 'perkūnija', 96: 'perkūnija su silpna kruša', 99: 'perkūnija su smarkia kruša',
  };
  return descriptions[code] ?? `nežinomos sąlygos (WMO kodas ${code})`;
}

export function formatWeather({ country, city, useCapital, data }) {
  const current = data.current;
  return [
    `\n${country.name} — ${city}${useCapital ? ' (šalies sostinės orai)' : ''}`,
    `Sąlygos: ${describeWeather(current.weather_code)}`,
    `Temperatūra: ${current.temperature_2m.toFixed(1)} °C`,
    `Jutiminė temperatūra: ${current.apparent_temperature.toFixed(1)} °C`,
    `Drėgmė: ${current.relative_humidity_2m} %`,
    `Vėjas: ${current.wind_speed_10m} m/s`,
    `Duomenų laikas vietovėje: ${current.time.replace('T', ' ')} (${data.timezone})`,
    'Orų modelių duomenys: Open-Meteo (https://open-meteo.com/)',
    'Vietovių duomenys: GeoNames (https://www.geonames.org/)',
  ].join('\n');
}
