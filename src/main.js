import { SITES, TRADITIONS } from './sites.js';
import { Globe } from './globe.js';
import { StreetWalker } from './streetWalk.js';
import { INFO_VERIFIED, fetchWeather, haversineKm, getUserPosition } from './visitorInfo.js';

const $ = (id) => document.getElementById(id);
const KEY_STORE = 'tirtha.googleKey';

const globe = new Globe($('globe'));
const walker = new StreetWalker(globe, {
  onExit: () => {
    $('walkHud').classList.add('hidden');
    document.body.classList.remove('walking');
    if (current) globe.flyToSite(current, { duration: 2 });
  },
  onStatus: (s) => ($('walkMode').textContent = s),
});

let current = null;
let viewer = null;
let tour = null;
let you = null;
const filters = new Set(Object.keys(TRADITIONS));

function toast(msg, ms = 4000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.add('hidden'), ms);
}

// ------------------------------------------------------------ intro

function fmtKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
function fmtAlt(m) {
  if (m > 3000) return `${(m / 1000).toFixed(1)} km altitude`;
  return `${Math.round(m)} m altitude`;
}

globe.onHud = ({ alt, dist }) => {
  const hud = $('globeHud');
  if (hud.classList.contains('hidden')) return;
  $('hudAlt').textContent = fmtAlt(alt);
  $('hudDist').textContent = dist == null ? 'Pick a shrine' : `${fmtKm(dist / 1000)} to shrine`;
  $('hudScale').textContent = 'Rings: 500 m · 2 km';
};

async function begin() {
  $('intro').classList.add('gone');
  setTimeout(() => $('intro').classList.add('hidden'), 1200);
  await globe.flyIndia();
  $('topbar').classList.remove('hidden');
  $('sitesPanel').classList.remove('hidden');
  $('globeHud').classList.remove('hidden');
  getUserPosition()
    .then((p) => {
      you = p;
      if (current) showInfo(current);
    })
    .catch(() => {});
}
$('btnBegin').onclick = async () => {
  await begin();
  toast('Click a pin for timings, how to reach, and live weather');
};
const linked = SITES.find((s) => s.id === location.hash.slice(1));
if (linked) begin().then(() => selectSite(linked));

// ------------------------------------------------------------ site list

function renderFilters() {
  const box = $('filters');
  box.innerHTML = '';
  Object.entries(TRADITIONS).forEach(([name, t]) => {
    const b = document.createElement('button');
    b.textContent = `${t.glyph} ${name}`;
    b.classList.toggle('active', filters.has(name));
    b.style.borderColor = filters.has(name) ? t.color : '';
    b.onclick = () => {
      if (filters.has(name) && filters.size > 1) filters.delete(name);
      else filters.add(name);
      renderFilters();
      renderList();
    };
    box.appendChild(b);
  });
}

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const list = $('siteList');
  list.innerHTML = '';
  const visible = new Set();
  SITES.filter((s) => filters.has(s.tradition))
    .filter((s) => !q || [s.name, s.place, s.deity, s.tradition].join(' ').toLowerCase().includes(q))
    .forEach((s) => {
      visible.add(s.id);
      const li = document.createElement('li');
      li.classList.toggle('active', current?.id === s.id);
      const tr = TRADITIONS[s.tradition];
      li.innerHTML = `<span class="dot" style="background:${tr.color}">${tr.glyph}</span><div><div class="t">${s.name}</div><div class="s">${s.place}</div></div>`;
      li.onclick = () => selectSite(s);
      list.appendChild(li);
    });
  globe.setFilter(visible);
}
$('search').addEventListener('input', renderList);
renderFilters();
renderList();

// ------------------------------------------------------------ selection

async function loadWikiImage(site) {
  const el = $('infoImage');
  el.style.backgroundImage = '';
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(site.wiki)}`);
    if (!r.ok) return;
    const d = await r.json();
    const src = d.thumbnail?.source || d.originalimage?.source;
    if (src && current?.id === site.id) el.style.backgroundImage = `url("${src}")`;
  } catch {
    /* offline: keep gradient placeholder */
  }
}

function nearbyHtml(site) {
  const others = SITES.filter((s) => s.id !== site.id)
    .map((s) => ({ s, km: haversineKm(site.lat, site.lon, s.lat, s.lon) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);
  return others
    .map(({ s, km }) => `<button class="nearby-btn" data-id="${s.id}"><b>${s.name}</b><span>${fmtKm(km)} away · ${s.place}</span></button>`)
    .join('');
}

function visitHtml(site) {
  const v = site.visitor;
  if (!v) {
    return `<div class="visit-block"><h4>Known facts</h4><ul>${site.facts.map((f) => `<li>${f}</li>`).join('')}</ul></div>`;
  }
  const elev = v.elevation_m ?? site.elev;
  const trek = v.trek
    ? `<div class="visit-block"><h4>Trek / approach</h4><p>${v.trek.km} km from ${v.trek.from}. ${v.trek.notes || ''}</p></div>`
    : '';
  const rules = (v.rules || []).map((r) => `<li>${r}</li>`).join('');
  const festivals = (v.festivals || []).map((f) => `<li><b>${f.name}</b> — ${f.when}</li>`).join('');
  const tips = (v.tips || []).slice(0, 4).map((t) => `<li>${t}</li>`).join('');
  const r = v.reach || {};
  return `
    <div class="visit-block"><h4>Before you go</h4>
      <p><b>Hours:</b> ${v.timings}</p>
      <p><b>Closed / pauses:</b> ${v.closures}</p>
      <p><b>Entry:</b> ${v.entry}</p>
      <p><b>Dress:</b> ${v.dress_code}</p>
      <p><b>Best season:</b> ${v.best_time}</p>
      <p><b>Typical visit:</b> ${v.avg_visit_time}</p>
    </div>
    <div class="visit-block"><h4>How to reach</h4>
      <p>✈ ${r.airport?.name || '—'} (${r.airport?.code || ''}) · ${r.airport?.km != null ? r.airport.km + ' km' : ''}</p>
      <p>🚂 ${r.railway?.name || '—'} · ${r.railway?.km != null ? r.railway.km + ' km' : ''}</p>
      <p>${r.road || ''}</p>
      <p>${r.local || ''}</p>
      ${elev ? `<p>Elevation ${elev.toLocaleString()} m</p>` : ''}
    </div>
    ${trek}
    <div class="visit-block"><h4>Rules</h4><ul>${rules}</ul></div>
    <div class="visit-block"><h4>Festivals (2026)</h4><ul>${festivals}</ul></div>
    <div class="visit-block"><h4>Tips</h4><ul>${tips}</ul></div>
    <div class="visit-block"><h4>Nearby in this atlas</h4>${nearbyHtml(site)}</div>
  `;
}

function liveChips(site, weather) {
  const bits = [];
  if (you) bits.push(`<span class="chip">📍 ${fmtKm(haversineKm(you.lat, you.lon, site.lat, site.lon))} from you</span>`);
  const elev = site.elev;
  if (elev) bits.push(`<span class="chip">⛰ ${elev.toLocaleString()} m</span>`);
  const trek = site.visitor?.trek;
  if (trek) bits.push(`<span class="chip">🥾 ${trek.km} km trek</span>`);
  if (weather) bits.push(`<span class="chip">${weather.icon} ${weather.temp}°C · ${weather.text}</span>`);
  else bits.push(`<span class="chip" id="wxPending">Live weather…</span>`);
  return bits.join('');
}

function showInfo(site) {
  const tr = TRADITIONS[site.tradition];
  const v = site.visitor;
  $('infoTradition').textContent = `${tr.glyph} ${site.tradition}`;
  $('infoTradition').style.background = tr.color;
  $('infoName').textContent = v?.name || site.name;
  $('infoPlace').textContent = v?.location || site.place;
  $('infoDeity').textContent = `Deity / focus: ${site.deity}`;
  $('infoSummary').textContent = site.summary;
  $('infoLive').innerHTML = liveChips(site);
  $('infoVisit').innerHTML = visitHtml(site);
  $('infoVisit').querySelectorAll('.nearby-btn').forEach((b) => {
    b.onclick = () => {
      const next = SITES.find((s) => s.id === b.dataset.id);
      if (next) selectSite(next);
    };
  });
  const official = v?.official_site || `https://en.wikipedia.org/wiki/${site.wiki}`;
  const book = v?.booking?.url || official;
  $('linkOfficial').href = official;
  $('linkBook').href = book;
  $('linkBook').textContent = v?.booking?.name ? `${v.booking.name.split('(')[0].trim()} ↗` : 'Book / register ↗';
  $('linkStreetView').href = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${site.lat},${site.lon}`;
  $('linkMaps').href = `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lon}`;
  $('linkWiki').href = `https://en.wikipedia.org/wiki/${site.wiki}`;
  $('infoDisclaimer').textContent = `Confirm hours and tickets on the official site before you travel. Visitor facts last checked ${INFO_VERIFIED}.`;
  $('infoPanel').classList.remove('hidden');
  loadWikiImage(site);
  loadWeather(site);
}

let wxGen = 0;
async function loadWeather(site) {
  const gen = ++wxGen;
  try {
    const w = await fetchWeather(site.lat, site.lon);
    if (gen !== wxGen || current?.id !== site.id) return;
    $('infoLive').innerHTML = liveChips(site, w);
    if ($('infoVisit').querySelector('[data-weather]')) return;
    const d0 = w.days[0];
    const extra = document.createElement('div');
    extra.className = 'visit-block';
    extra.dataset.weather = '1';
    extra.innerHTML = `<h4>Weather now (Open-Meteo)</h4>
      <p>${w.icon} ${w.temp}°C, feels ${w.feels}°C · ${w.text} · wind ${w.wind} km/h · humidity ${w.humidity}%</p>
      <p>Today ${d0.min}–${d0.max}°C, rain chance ${d0.rain}%. Sunrise ${d0.sunrise}, sunset ${d0.sunset} (IST).</p>`;
    const first = $('infoVisit').querySelector('.visit-block');
    if (first) $('infoVisit').insertBefore(extra, first);
  } catch {
    const pending = $('wxPending');
    if (pending) pending.textContent = 'Weather unavailable';
  }
}

function endWalk() {
  walker.stop(true);
  $('walkHud').classList.add('hidden');
  document.body.classList.remove('walking');
}

async function selectSite(site, { orbit = true, fromTour = false } = {}) {
  if (!fromTour) stopTour();
  endWalk();
  current = site;
  history.replaceState(null, '', `#${site.id}`);
  globe.select(site);
  showInfo(site);
  renderList();
  return globe.flyToSite(site, { orbit });
}
globe.onSelect = (s) => selectSite(s);

$('infoClose').onclick = () => {
  $('infoPanel').classList.add('hidden');
  globe.select(null);
  current = null;
  renderList();
};
$('actOrbit').onclick = () => current && selectSite(current);
$('actWalk').onclick = async () => {
  if (!current) return;
  stopTour();
  globe.stopOrbit();
  const h = await globe.groundHeight(current);
  $('walkHud').classList.remove('hidden');
  document.body.classList.add('walking');
  if (!globe.tileset) toast('Low satellite flyover at real height. For street-level 3D buildings, add a Google Map Tiles key in ⚙.', 6500);
  walker.start(current, h);
};
$('walkExit').onclick = () => walker.stop();

// ------------------------------------------------------------ temple viewer

$('actTemple').onclick = async () => {
  if (!current) return;
  stopTour();
  endWalk();
  globe.stopOrbit();
  $('templeView').classList.remove('hidden');
  $('globeHud').classList.add('hidden');
  if (!viewer) {
    const { TempleViewer } = await import('./templeViewer.js');
    viewer = new TempleViewer($('templeCanvas'), {
      tradition: $('tvTradition'), name: $('tvName'), style: $('tvStyle'), part: $('tvPart'),
      pradakshina: $('tvPradakshina'), walk: $('tvWalk'), aarti: $('tvAarti'), time: $('tvTime'),
      reset: $('tvReset'), hint: $('tvHint'), tooltip: $('tvTooltip'),
    });
  }
  globe.viewer.useDefaultRenderLoop = false;
  viewer.open(current);
};
$('tvClose').onclick = () => {
  viewer?.close();
  $('templeView').classList.add('hidden');
  $('globeHud').classList.remove('hidden');
  globe.viewer.useDefaultRenderLoop = true;
};

// ------------------------------------------------------------ top bar

$('btnSites').onclick = () => $('sitesPanel').classList.toggle('hidden');
$('btnIndia').onclick = () => {
  stopTour();
  endWalk();
  globe.flyIndia(2.5);
};
$('btnEarth').onclick = () => {
  stopTour();
  endWalk();
  globe.flyEarth();
};

function stopTour() {
  if (!tour) return;
  tour.stopped = true;
  tour = null;
  $('btnTour').textContent = '▶ Yatra tour';
}
$('btnTour').onclick = async () => {
  if (tour) return stopTour();
  const me = (tour = { stopped: false });
  $('btnTour').textContent = '■ Stop tour';
  const list = SITES.filter((s) => filters.has(s.tradition));
  let i = Math.max(0, list.indexOf(current) + 1);
  while (!me.stopped) {
    const s = list[i % list.length];
    await selectSite(s, { fromTour: true });
    for (let k = 0; k < 80 && !me.stopped; k++) await new Promise((r) => setTimeout(r, 100));
    i++;
  }
};

// ------------------------------------------------------------ photoreal settings

async function loadPhotoreal(key) {
  try {
    toast('Loading Google Photorealistic 3D Tiles…');
    await globe.enablePhotoreal(key);
    toast('Photorealistic 3D enabled. Fly to a shrine and walk its streets.');
    if (current) globe.flyToSite(current);
  } catch (e) {
    console.error(e);
    globe.disablePhotoreal();
    toast('Could not load 3D tiles. Check that the key is valid and the Map Tiles API is enabled.', 7000);
  }
}
$('btnSettings').onclick = () => {
  $('googleKey').value = localStorage.getItem(KEY_STORE) || '';
  $('settings').showModal();
};
$('settings').addEventListener('close', () => {
  const v = $('settings').returnValue;
  if (v === 'save') {
    const key = $('googleKey').value.trim();
    if (!key) return;
    localStorage.setItem(KEY_STORE, key);
    loadPhotoreal(key);
  } else if (v === 'clear') {
    localStorage.removeItem(KEY_STORE);
    globe.disablePhotoreal();
    toast('Back to satellite imagery.');
  }
});
const savedKey = localStorage.getItem(KEY_STORE) || import.meta.env.VITE_GOOGLE_MAPS_KEY;
if (savedKey) loadPhotoreal(savedKey);
