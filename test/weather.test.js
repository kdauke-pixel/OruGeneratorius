import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeather, formatWeather, resolveCountry, describeWeather } from '../src/weather.js';

const location = { name: 'Vilnius', country_code: 'LT', latitude: 54.68, longitude: 25.28, feature_code: 'PPLC' };
const weather = { timezone: 'Europe/Vilnius', current: { temperature_2m: 7, apparent_temperature: 5, relative_humidity_2m: 80, wind_speed_10m: 3, weather_code: 3, time: '2026-11-13T12:00' } };
function mockFetch(responses, calls = []) {
  return async (url, options) => {
    calls.push({ url: new URL(url), options });
    assert.ok(responses.length, 'Netikėta papildoma API užklausa');
    const { body, status = 200 } = responses.shift();
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

test('atpažįsta šalis ir vietinę sostinę', () => {
  for (const name of ['Lietuva', ' Lithuania ', 'lt']) assert.equal(resolveCountry(name).code, 'LT');
  assert.equal(resolveCountry('LT').capital, 'Vilnius');
  assert.equal(resolveCountry('Sveicarija').code, 'CH');
  assert.throws(() => resolveCountry('Atlantida'), /Šalis neatpažinta/);
});

test('miesto orai gaunami be jokių raktų, teisingais vienetais', async () => {
  const calls = [];
  const result = await getWeather('Lietuva', 'Vilnius', { fetchImpl: mockFetch([
    { body: { results: [location] } }, { body: weather },
  ], calls) });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.searchParams.get('name'), 'Vilnius');
  assert.equal(calls[0].url.searchParams.get('countryCode'), 'LT');
  assert.equal(calls[1].url.searchParams.get('latitude'), '54.68');
  assert.equal(calls[1].url.searchParams.get('wind_speed_unit'), 'ms');
  assert.equal(calls[1].url.searchParams.get('timezone'), 'auto');
  assert.equal(calls[1].url.searchParams.has('apikey'), false);
  assert.equal(result.useCapital, false);
  assert.match(formatWeather(result), /7.0 °C/);
  assert.match(formatWeather(result), /2026-11-13 12:00 \(Europe\/Vilnius\)/);
  assert.match(formatWeather(result), /Open-Meteo/);
});

test('tik šalis: vietinė sostinė, dvi užklausos be REST Countries', async () => {
  const calls = [];
  const result = await getWeather('LT', '', { fetchImpl: mockFetch([
    { body: { results: [location, { ...location, name: 'Vilnius rajonas', feature_code: 'ADM2' }] } }, { body: weather },
  ], calls) });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.searchParams.get('name'), 'Vilnius');
  assert.match(formatWeather(result), /sostinės orai/);
});

test('be sostinės prašo nurodyti miestą', async () => {
  await assert.rejects(getWeather('AQ', '', { fetchImpl: () => assert.fail() }), /sostinė nenurodyta/);
});

test('nerastas miestas arba kitos šalies rezultatas nesukuria orų', async () => {
  for (const body of [{}, { results: [{ ...location, country_code: 'US' }] }]) {
    await assert.rejects(getWeather('LT', 'Vilnius', { fetchImpl: mockFetch([{ body }]) }), /nerastas/);
  }
});

test('tikslus miesto pavadinimas turi pirmenybę prieš panašų', async () => {
  const result = await getWeather('LT', 'Vilnius', { fetchImpl: mockFetch([
    { body: { results: [location, { ...location, name: 'Vilnius rajonas' }] } }, { body: weather },
  ]) });
  assert.equal(result.city, 'Vilnius');
});

test('dviprasmiškas miestas prašo regiono', async () => {
  await assert.rejects(getWeather('LT', 'Vilnius', { fetchImpl: mockFetch([
    { body: { results: [location, { ...location, latitude: 55, admin1: 'Regionas' }] } },
  ]) }), /keli miestai/);
});

test('miestas atskiriamas nuo parkų, oro uostų ir rajonų net išvertus pavadinimą', async () => {
  const place = { ...location, name: 'Portlandas', country_code: 'US', feature_code: 'PPLA2', admin1: 'Oregonas' };
  const result = await getWeather('US', 'Portland,Oregon', { fetchImpl: mockFetch([
    { body: { results: [place, { ...place, name: 'Portland Heights', feature_code: 'PPLX' }, { ...place, name: 'Portland Airport', feature_code: 'AIRP' }] } },
    { body: weather },
  ]) });
  assert.equal(result.city, 'Portlandas');
});

test('apdoroja HTTP, limito ir tinklo klaidas', async () => {
  for (const [status, pattern] of [[500, /HTTP 500/], [429, /limitas/]]) {
    await assert.rejects(getWeather('LT', 'Vilnius', { fetchImpl: mockFetch([{ status }]) }), pattern);
  }
  await assert.rejects(getWeather('LT', 'Vilnius', { fetchImpl: async () => { throw new Error('fetch failed'); } }), /ryšio klaida/);
});

test('atmeta nepilnus orus ir netinkamą vietovių atsakymą', async () => {
  await assert.rejects(getWeather('LT', 'Vilnius', { fetchImpl: mockFetch([
    { body: { results: [location] } }, { body: {} },
  ]) }), /trūksta orų duomenų/);
  await assert.rejects(getWeather('LT', 'Vilnius', { fetchImpl: mockFetch([{ body: { results: {} } }]) }), /netinkamas vietovės/);
});

test('WMO sąlygos išverstos į lietuvių kalbą', () => {
  assert.equal(describeWeather(0), 'giedra');
  assert.equal(describeWeather(95), 'perkūnija');
  assert.match(describeWeather(999), /999/);
});
