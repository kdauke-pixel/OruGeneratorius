# Orų generatorius

Vietinis puslapis naršyklėje su Node.js serveriu: įvedus šalį ir miestą pateikiami dabartiniai tos vietovės orų modelių duomenys. Įvedus tik šalį, pateikiami **jos sostinės orai**, o ne šalies vidurkis.

Naudojama **Open-Meteo**: nereikia registracijos, API rakto ar mokėjimo kortelės. Nemokama prieiga skirta nekomerciniam naudojimui, taikomi [tiekėjo limitai ir sąlygos](https://open-meteo.com/en/pricing). Komerciniam naudojimui reikalingas atitinkamas planas.

## Kaip paleisti

Reikia Node.js **22.9 arba naujesnio** ir interneto ryšio.

1. Atidarykite šį projekto aplanką VS Code.
2. Atidarykite **Terminal → New Terminal**.
3. Pirmą kartą įdiekite priklausomybes:

   ```powershell
   npm.cmd install
   ```

4. Paleiskite:

   ```powershell
   npm.cmd start
   ```

5. Naršyklėje atidarykite **http://localhost:3000**.
6. Puslapyje įveskite šalį, pvz., `Lietuva`, ir miestą, pvz., `Kaunas`, tada spauskite **Rodyti orus**. Palikus miestą tuščią bus rodomi sostinės orai.

Palikite terminalą atidarytą, kol naudojatės puslapiu. Sustabdyti serverį: **Ctrl+C**. Puslapis veikia tik šiame kompiuteryje; orų gavimui reikia interneto.

Jei norite naudoti ankstesnę terminalo versiją:

```powershell
npm.cmd run cli -- LT Vilnius
npm.cmd run cli -- Lietuva
```

PowerShell naudojama `npm.cmd`, kad nereikėtų keisti scenarijų vykdymo politikos. Kitose aplinkose tinka `npm start`.

**`.env` kurti ar pildyti nereikia.** Seniau naudoti OpenWeather ir REST Countries raktai nebenaudojami. `.env.example` paliktas su paaiškinimu porininkui; `.env` ir toliau ignoruojamas Git.

## Paieška ir rezultatai

Šalis atpažįstama pagal lietuvišką / anglišką pavadinimą arba ISO kodą (`LT`). Lietuviškas raides galima keisti lotyniškomis. Miestų pavadinimai priklauso nuo GeoNames duomenų; jei neranda lietuviško, bandykite anglišką. Jei yra keli miestai tuo pačiu pavadinimu, miesto laukelyje pridėkite regioną po kablelio, pvz., `Portland,Oregon`.

Sostinės nustatomos iš vietinio `countries-list` paketo, papildomos API paskyros nereikia. Jei šalis neturi nurodytos sostinės, įveskite miestą. Kai valstybė turi kelias sostines, naudojama pakete nurodyta.

Rodoma temperatūra ir jutiminė temperatūra °C, sąlygos lietuviškai, drėgmė, vėjo greitis m/s ir duomenų laikas pasirinktoje vietovėje. Tai orų modelių duomenys, ne tiesioginis konkrečios meteorologijos stoties matavimas. Ryšio klaidos pateikiamos lietuviškai; užklausos laukimo limitas — 10 sekundžių.

## Patikra

```powershell
npm.cmd test
```

Testai naudoja imituotus API atsakymus; internetas ir raktai nereikalingi.

## Kėlimas į GitHub

`.gitignore` ignoruoja `node_modules/`, `.env`, kitus `.env.*` failus, žurnalus ir kūrimo rezultatus. `.env.example`, `package.json` ir `package-lock.json` keliami į Git. Porininkas, parsisiuntęs projektą, vykdo `npm.cmd ci` ir `npm.cmd start`.

Prieš commit patikrinkite:

```powershell
git status --short
git check-ignore --no-index .env .env.local node_modules/example.js
```

`.gitignore` nepašalina jau sekamų failų ar paslapčių iš Git istorijos. Jei raktas buvo publikuotas, jį reikia atšaukti pas tiekėją.

## Šaltiniai

- [Open-Meteo orų API](https://open-meteo.com/en/docs), duomenys pagal CC BY 4.0.
- [Open-Meteo vietovių API](https://open-meteo.com/en/docs/geocoding-api), vietovių duomenys iš [GeoNames](https://www.geonames.org/).
- [countries-list](https://github.com/annexare/Countries), šalių ir sostinių sąrašas pagal MIT licenciją.
