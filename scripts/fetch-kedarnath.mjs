import { writeFile } from 'node:fs/promises';
import { build } from './fetch-osm-roads.mjs';

const site = { id: 'kedarnath', lat: 30.7352, lon: 79.0669 };
const q = '[out:json][timeout:25];way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|trunk_link|primary_link|secondary_link|tertiary_link)$"](30.58,78.99,30.75,79.09);out geom;';
const urls = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
let ways = null;
let last;
for (const url of urls) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(40000),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TirthaPilgrimageAtlas/1.0 (offline road packs for public shrine atlas)',
      },
      body: `data=${encodeURIComponent(q)}`,
    });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    const json = await res.json();
    ways = json.elements || [];
    console.log(url, 'ways', ways.length);
    break;
  } catch (e) {
    last = e;
    console.log(url, e.message);
  }
}
if (!ways) throw last;
const pack = build(site, ways, 16000);
await writeFile(new URL('../public/maps/kedarnath.json', import.meta.url), JSON.stringify(pack));
console.log(pack.nodes.length, 'nodes', pack.edges.length, 'edges');
