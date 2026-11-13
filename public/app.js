const form = document.querySelector('#weather-form');
const button = form.querySelector('button');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const write = (id, text) => { document.getElementById(id).textContent = text; };

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = 'Ieškoma…';
  status.className = '';
  status.textContent = 'Gaunami orų duomenys…';
  result.hidden = true;
  try {
    const params = new URLSearchParams(new FormData(form));
    const response = await fetch(`/api/weather?${params}`, { signal: AbortSignal.timeout(25000) });
    const weather = await response.json();
    if (!response.ok) throw new Error(weather.error || 'Nepavyko gauti orų.');
    const current = weather.data.current;
    write('place', `${weather.city}, ${weather.country.name}`);
    document.querySelector('#capital').hidden = !weather.useCapital;
    write('temperature', `${current.temperature_2m.toFixed(1)} °C`);
    write('description', weather.description);
    write('feels', `${current.apparent_temperature.toFixed(1)} °C`);
    write('humidity', `${current.relative_humidity_2m} %`);
    write('wind', `${current.wind_speed_10m} m/s`);
    write('time', `Duomenų laikas vietovėje: ${current.time.replace('T', ' ')} (${weather.data.timezone})`);
    result.hidden = false;
    status.textContent = 'Orų duomenys gauti.';
  } catch (error) {
    status.className = 'error';
    status.textContent = error.name === 'TimeoutError' || error instanceof TypeError
      ? 'Nepavyko prisijungti. Patikrink, ar serveris veikia ir yra interneto ryšys.'
      : error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Rodyti orus';
  }
});
