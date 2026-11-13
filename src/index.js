import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { getWeather, formatWeather } from './weather.js';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Naudojimas: npm start -- "šalis" ["miestas"]\nPavyzdžiai: npm start -- Lietuva; npm start -- LT Vilnius\nBe argumentų programa paprašys įvesti šalį ir miestą.\nĮvedus tik šalį rodomi jos sostinės orai.');
} else {
  let readline;
  try {
    if (args.length > 2) throw new Error('Per daug argumentų. Pavadinimus su tarpais rašykite kabutėse. Pagalba: npm start -- --help');
    let [country, city = ''] = args;
    if (!args.length) {
      readline = createInterface({ input: stdin, output: stdout });
      country = await readline.question('Šalis (pvz., Lietuva arba LT): ');
      city = await readline.question('Miestas (Enter — sostinės orai): ');
    }
    console.log(formatWeather(await getWeather(country, city)));
  } catch (error) {
    console.error(`Klaida: ${error.code === 'ABORT_ERR' ? 'Įvedimas nutrauktas.' : error.message}`);
    process.exitCode = 1;
  } finally {
    readline?.close();
  }
}
