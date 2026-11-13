import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getWeather, describeWeather } from './weather.js';

export function createWeatherServer(weatherLookup = getWeather) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const sendJson = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    if (request.method !== 'GET') return sendJson(405, { error: 'Šis veiksmas nepalaikomas.' });
    if (url.pathname === '/api/weather') {
      const country = (url.searchParams.get('country') ?? '').trim();
      const city = (url.searchParams.get('city') ?? '').trim();
      if (!country || country.length > 100 || city.length > 150) {
        return sendJson(400, { error: 'Įveskite šalį. Šalies ir miesto pavadinimai turi būti iki 100 ir 150 simbolių.' });
      }
      try {
        const result = await weatherLookup(country, city);
        return sendJson(200, { ...result, description: describeWeather(result.data.current.weather_code) });
      } catch (error) {
        return sendJson(400, { error: error.message });
      }
    }
    // Pateikiami tik vieši puslapio failai, .env ir projekto kodas nepasiekiami.
    const files = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] };
    const file = files[url.pathname];
    if (!file) return sendJson(404, { error: 'Puslapis nerastas.' });
    try {
      const content = await readFile(new URL(`../public/${file[0]}`, import.meta.url));
      response.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
      response.end(content);
    } catch {
      sendJson(500, { error: 'Nepavyko atidaryti puslapio.' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Klaida: PORT turi būti skaičius nuo 1 iki 65535.');
    process.exitCode = 1;
  } else {
    const server = createWeatherServer();
    server.on('error', (error) => {
      console.error(error.code === 'EADDRINUSE'
        ? `Prievadas ${port} užimtas. Sustabdykite ankstesnę programą (Ctrl+C) arba .env faile pakeiskite PORT.`
        : `Nepavyko paleisti serverio: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => console.log(`Orų puslapis: http://localhost:${port}\nPalikite terminalą atidarytą. Sustabdyti: Ctrl+C.`));
  }
}
