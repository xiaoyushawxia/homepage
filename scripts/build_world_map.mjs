/*
 * build_world_map.mjs — regenerates the assets behind the "Visitors" section.
 *
 * Outputs
 *   assets/data/world-map.json   pre-projected world geometry, plus one
 *                                pre-projected point and ISO code per country
 *   assets/flags/<iso2>.png      80x60 flag for the ranking list
 *
 * This is a one-off tool, not part of the daily stats workflow, so its
 * dependencies deliberately live outside scripts/package.json:
 *
 *   npm install world-atlas@2 world-countries topojson-client topojson-simplify d3-geo flag-icons sharp
 *   node build_world_map.mjs
 *
 * Flags come from flag-icons (MIT), map geometry from Natural Earth via
 * world-atlas (public domain).
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { feature, mesh } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import worldCountries from 'world-countries/countries.json' with { type: 'json' };

const OUT_DATA = process.env.OUT_DATA || '../assets/data/world-map.json';
const OUT_FLAGS = process.env.OUT_FLAGS || '../assets/flags';
const WIDTH = 1000, HEIGHT = 480;

/* ---------------------------------------------------------------- geometry */

let topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'));
topo.objects.countries.geometries =
  topo.objects.countries.geometries.filter(g => g.id !== '010');      // drop Antarctica

topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.30));   // sub-pixel coastline detail is wasted bytes

const land = feature(topo, topo.objects.countries);
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);

const projection = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], land);
const toPath = geoPath(projection);
const round = d => d.replace(/-?\d+(\.\d+)?/g, m => Math.round(+m));

const landPath = round(toPath(land));
const borderPath = round(toPath(borders));

/* Crop the viewBox to the drawn geometry so the card has no dead margin. */
const coords = [...landPath.matchAll(/(-?\d+),(-?\d+)/g)];
const xs = coords.map(m => +m[1]), ys = coords.map(m => +m[2]);
const pad = 6;
const viewBox = [
  Math.min(...xs) - pad, Math.min(...ys) - pad,
  Math.max(...xs) - Math.min(...xs) + pad * 2,
  Math.max(...ys) - Math.min(...ys) + pad * 2,
].join(' ');

/* ------------------------------------------------------- country lookup */

/*
 * points[name] = [x, y, iso2]
 *
 * Keyed by every spelling a Google Analytics report might use: the common
 * name, the official name, the ISO code and the alternative spellings that
 * world-countries records (this is what makes "Turkey" find "Türkiye").
 */
const points = {};
const add = (name, value) => {
  const key = String(name || '').trim();
  if (key.length >= 2 && !points[key]) points[key] = value;
};

for (const country of worldCountries) {
  const [lat, lon] = country.latlng;
  const xy = projection([lon, lat]);
  if (!xy) continue;

  const entry = [Math.round(xy[0]), Math.round(xy[1]), country.cca2.toLowerCase()];
  add(country.name.common, entry);
  add(country.cca2, entry);
  add(country.name.official, entry);
  for (const alt of country.altSpellings || []) {
    if (String(alt).length >= 4) add(alt, entry);
  }
}

/* Spellings Google Analytics emits that no dataset lists as an alternative. */
const GA_SPELLINGS = {
  'Czech Republic': 'Czechia',
  'Turkey': 'Türkiye',
  'Myanmar (Burma)': 'Myanmar',
  'Congo - Kinshasa': 'DR Congo',
  'Congo - Brazzaville': 'Republic of the Congo',
  'Macao': 'Macau',
  'Macao SAR China': 'Macau',
  'Hong Kong SAR China': 'Hong Kong',
  'Cape Verde': 'Cabo Verde',
  'Swaziland': 'Eswatini',
  'Macedonia': 'North Macedonia',
  'U.S. Virgin Islands': 'United States Virgin Islands',
};
for (const [ga, known] of Object.entries(GA_SPELLINGS)) {
  if (points[known]) add(ga, points[known]);
}

fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true });
fs.writeFileSync(OUT_DATA, JSON.stringify({
  width: WIDTH, height: HEIGHT, viewBox, land: landPath, borders: borderPath, points,
}));

/* ------------------------------------------------------------------ flags */

const FLAG_SRC = 'node_modules/flag-icons/flags/4x3';
fs.mkdirSync(OUT_FLAGS, { recursive: true });

const wanted = new Set(Object.values(points).map(p => p[2]));
let written = 0, bytes = 0;

for (const file of fs.readdirSync(FLAG_SRC)) {
  const code = file.replace('.svg', '');
  if (!file.endsWith('.svg') || !wanted.has(code)) continue;

  const target = path.join(OUT_FLAGS, code + '.png');
  await sharp(path.join(FLAG_SRC, file), { density: 300 })
    .resize(80, 60, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: true })
    .toFile(target);

  written += 1;
  bytes += fs.statSync(target).size;
}

console.log('viewBox        :', viewBox);
console.log('lookup keys    :', Object.keys(points).length);
console.log('world-map.json :', Math.round(fs.statSync(OUT_DATA).size / 1024) + ' KB');
console.log('flags written  :', written, '(' + Math.round(bytes / 1024) + ' KB total)');
