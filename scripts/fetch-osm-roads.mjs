import { writeFile, mkdir, readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/sites.js', import.meta.url), 'utf8');
const SITES = [...source.matchAll(/id:\s*'([^']+)'[\s\S]*?lat:\s*([\d.]+),\s*lon:\s*([\d.]+)/g)].map((m) => ({
  id: m[1],
  lat: Number(m[2]),
  lon: Number(m[3]),
}));

const RADIUS = 7000;
const OUT = new URL('../public/maps/', import.meta.url);
const HIGHWAYS = /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$/;
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function keyOf(lat, lon) {
  return `${Math.round(lat * 1e5) / 1e5},${Math.round(lon * 1e5) / 1e5}`;
}

function km(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLon = (bLon - aLon) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function onewayOf(tags) {
  const v = tags.oneway;
  if (v === 'yes' || v === '1') return 1;
  if (v === '-1' || v === 'reverse') return 2;
  if (tags.junction === 'roundabout') return 1;
  return 0;
}

function build(site, ways, radius = RADIUS) {
  const names = [];
  const nameId = new Map();
  const nodes = [];
  const index = new Map();
  const edges = [];
  const seen = new Set();

  const nodeIndex = (lat, lon) => {
    const k = keyOf(lat, lon);
    let i = index.get(k);
    if (i == null) {
      i = nodes.length;
      index.set(k, i);
      const [la, lo] = k.split(',').map(Number);
      nodes.push([la, lo]);
    }
    return i;
  };

  for (const way of ways) {
    const tags = way.tags || {};
    if (!HIGHWAYS.test(tags.highway || '')) continue;
    if (tags.access === 'private' || tags.access === 'no') continue;
    const geom = way.geometry;
    if (!geom || geom.length < 2) continue;
    const near = (metres) => geom.some((p) => km(site.lat, site.lon, p.lat, p.lon) <= metres / 1000);
    if (tags.highway === 'service' && !near(400)) continue;
    if (radius <= 7000 && (tags.highway === 'residential' || tags.highway === 'living_street' || tags.highway === 'unclassified') && !near(1800)) continue;
    let name = tags.ref || tags.name || '';
    if (name.length > 48) name = name.slice(0, 48);
    let ni = nameId.get(name);
    if (ni == null) {
      ni = names.length;
      nameId.set(name, ni);
      names.push(name);
    }
    const ow = onewayOf(tags);
    for (let i = 1; i < geom.length; i++) {
      const a = nodeIndex(geom[i - 1].lat, geom[i - 1].lon);
      const b = nodeIndex(geom[i].lat, geom[i].lon);
      if (a === b) continue;
      const sig = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      edges.push([a, b, ow, ni]);
    }
  }
  return { credit: '© OpenStreetMap contributors', radius, names, nodes, edges };
}

export { build };

async function query(site) {
  const radius = site.id === 'kedarnath' ? 18000 : RADIUS;
  const q = process.env.MAJOR === '1' || site.id === 'kedarnath'
    ? `[out:json][timeout:60];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](around:${radius},${site.lat},${site.lon});out geom;`
    : `[out:json][timeout:90];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](around:${RADIUS},${site.lat},${site.lon});way["highway"~"^(unclassified|residential|living_street)$"](around:1800,${site.lat},${site.lon});way["highway"="service"](around:400,${site.lat},${site.lon}););out geom;`;
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const url = ENDPOINTS[(attempt - 1) % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(100000),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TirthaPilgrimageAtlas/1.0 (offline road packs for public shrine atlas)',
        },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (res.status === 429 || res.status === 504) {
        last = new Error(`${res.status}`);
        await new Promise((r) => setTimeout(r, 15000 * attempt));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return json.elements || [];
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
  throw last;
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/fetch-osm-roads.mjs');
if (invoked) {
const wanted = process.argv.slice(2);
const sites = wanted.length ? SITES.filter((s) => wanted.includes(s.id)) : SITES;
if (wanted.length && sites.length !== wanted.length) {
  console.error(`Unknown shrine: ${wanted.filter((id) => !SITES.some((s) => s.id === id)).join(', ')}`);
  process.exit(1);
}
if (!wanted.length && SITES.length !== 31) {
  console.error(`Expected 31 shrines, found ${SITES.length}`);
  process.exit(1);
}
await mkdir(OUT, { recursive: true });
for (const site of sites) {
  const dest = new URL(`${site.id}.json`, OUT);
  try {
    const existing = JSON.parse(await readFile(dest, 'utf8'));
    if (existing.credit) {
      process.stdout.write(`${site.id} already saved (${existing.nodes.length} nodes)\n`);
      continue;
    }
  } catch { /* download this shrine */ }
  process.stdout.write(`${site.id} `);
  try {
    const ways = await query(site);
    const pack = build(site, ways);
    await writeFile(dest, JSON.stringify(pack));
    process.stdout.write(pack.nodes.length ? `${pack.nodes.length} nodes, ${pack.edges.length} edges\n` : 'no drivable roads\n');
  } catch (e) {
    process.stdout.write(`FAILED ${e.message}\n`);
  }
  await new Promise((r) => setTimeout(r, 8000));
}
}
