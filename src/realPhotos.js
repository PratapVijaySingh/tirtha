const SKIP = /map|flag|logo|icon|coin|stamp|diagram|route|empire|svg|coat of arms|locator/i;

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function nameTokens(site) {
  return site.name
    .replace(/\(.*?\)/g, ' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
}

function relevantTitle(title, site) {
  const t = title.toLowerCase();
  if (SKIP.test(t)) return false;
  const tokens = nameTokens(site).filter((w) => !['temple', 'mandir', 'church', 'shrine', 'basilica'].includes(w));
  if (tokens.length && !tokens.some((w) => t.includes(w))) return false;
  const tail = t.split(',').pop().trim();
  const place = site.place.toLowerCase();
  if (t.includes(',') && tail.length > 3 && !place.includes(tail) && !tokens.includes(tail)) return false;
  return true;
}

function photoDate(meta) {
  const raw = meta?.DateTimeOriginal?.value || meta?.DateTime?.value || '';
  const day = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith('0000')) return null;
  const parsed = new Date(`${day}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return { iso: day, label: parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), time: parsed.getTime() };
}

function isRaster(title, mime) {
  if (mime && !/^image\/(jpeg|png|webp)$/.test(mime)) return false;
  return /\.(jpe?g|png|webp)$/i.test(title);
}

async function wikiFiles(site) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(site.wiki)}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return (data.items || [])
    .filter((item) => item.type === 'image' && item.title && isRaster(item.title) && relevantTitle(item.title, site))
    .map((item) => ({ title: item.title, caption: stripHtml(item.caption?.html) }));
}

async function commonsFiles(site) {
  const city = site.place.split(',')[0];
  const q = `${site.name.replace(/\(.*?\)/g, '')} ${city}`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=16&gsrsearch=${encodeURIComponent(q)}&prop=info`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return Object.values(data.query?.pages || {})
    .filter((p) => p.title && isRaster(p.title) && relevantTitle(p.title, site))
    .map((p) => ({ title: p.title, caption: '' }));
}

async function imageInfo(titles) {
  if (!titles.length) return [];
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent(titles.join('|'))}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return Object.values(data.query?.pages || {}).map((p) => {
    const info = p.imageinfo?.[0];
    if (!info || !isRaster(p.title, info.mime)) return null;
    const meta = info.extmetadata || {};
    const when = photoDate(meta);
    return {
      title: (p.title || '').replace(/^File:/, ''),
      url: info.thumburl || info.url,
      full: info.descriptionurl,
      when,
      caption: stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value || ''),
      artist: stripHtml(meta.Artist?.value || ''),
      license: stripHtml(meta.LicenseShortName?.value || ''),
    };
  }).filter(Boolean);
}

export async function loadRealPhotos(site) {
  const listed = await Promise.all([wikiFiles(site), commonsFiles(site)]);
  const byTitle = new Map();
  listed.flat().forEach((item) => {
    if (!byTitle.has(item.title)) byTitle.set(item.title, item.caption);
  });
  const titles = [...byTitle.keys()].slice(0, 24);
  const photos = await imageInfo(titles);
  photos.forEach((p) => {
    const extra = byTitle.get(`File:${p.title}`) || byTitle.get(p.title);
    if (extra && !p.caption) p.caption = extra;
  });
  photos.sort((a, b) => (b.when?.time || 0) - (a.when?.time || 0));
  return photos;
}

export function realPhotoNote(photo) {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!photo?.when) {
    return `The photographer did not record a date. Today is ${today}. This is a real public photograph, not a live camera.`;
  }
  return `Photographed ${photo.when.label}. Today is ${today}. This is the public record of the real shrine, not a live camera from today. Cameras are usually forbidden inside the sanctum.`;
}
