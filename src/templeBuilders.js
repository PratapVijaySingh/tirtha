import * as THREE from 'three';
import { RITUALS } from './sites.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const SQ2 = Math.SQRT2;

export const STYLE_LABELS = {
  nagara: 'Nagara style · North Indian curvilinear shikhara',
  dravida: 'Dravida style · Stepped vimana & gopurams',
  kalinga: 'Kalinga style · Rekha deula & pidha halls',
  gurudwara: 'Sikh architecture · Gilded sanctum in the sarovar',
  dargah: 'Indo-Islamic · Marble domes & arches',
  mahabodhi: 'Gupta-era brick tower · Buddhist',
};

const PALETTES = {
  sandstone: { base: 0xc8915d, trim: 0xa9743f, dark: 0x5e3f24 },
  pink: { base: 0xe2ab90, trim: 0xc98d72, dark: 0x6e4536 },
  stone: { base: 0x939089, trim: 0x77736c, dark: 0x44413d },
  white: { base: 0xfaf0dc, trim: 0xe2d4ba, dark: 0x8a857a },
  granite: { base: 0xb59c7a, trim: 0x977f60, dark: 0x54432f },
  painted: { base: 0xeadcc2, trim: 0xc23b2a, dark: 0x2b4a8f },
};

const BRIGHT = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#3a86ff', '#ff006e', '#8ac926', '#ffbe0b', '#8338ec', '#fb5607', '#06d6a0', '#118ab2'];
const ROBES = ['#ff8c1a', '#ffffff', '#d62828', '#ffd166', '#3a86ff', '#8338ec', '#f15bb5', '#2a9d8f', '#f4f1de', '#e76f51'];

function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- textures

const texCache = {};
function canvasTexture(key, size, draw, srgb = true) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[key] = t);
}

function masonryTex() {
  return canvasTexture('masonry', 512, (ctx, s) => {
    const r = seeded('masonry');
    ctx.fillStyle = '#6d6d6d';
    ctx.fillRect(0, 0, s, s);
    const rows = 8, rh = s / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * rh;
      while (x < s) {
        const w = rh * (1.3 + r() * 1.4);
        const g = (180 + r() * 55) | 0;
        ctx.fillStyle = `rgb(${g},${g},${g - 6})`;
        ctx.fillRect(x + 2, y * rh + 2, w - 4, rh - 4);
        x += w;
      }
    }
    for (let i = 0; i < 9000; i++) {
      const g = (120 + r() * 120) | 0;
      ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
  });
}

function tileTex() {
  return canvasTexture('tile', 256, (ctx, s) => {
    const r = seeded('tile');
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const g = (200 + r() * 40) | 0;
        ctx.fillStyle = `rgb(${g},${g - 4},${g - 12})`;
        ctx.fillRect(x * 64, y * 64, 64, 64);
      }
    ctx.strokeStyle = 'rgba(70,60,50,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(s, i * 64); ctx.stroke();
    }
  });
}

function checkerMarbleTex() {
  return canvasTexture('checker', 256, (ctx, s) => {
    const n = 8, c = s / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#f4f1ea' : '#cfc8bb';
        ctx.fillRect(x * c, y * c, c, c);
      }
  });
}

function groundTex() {
  return canvasTexture('ground', 512, (ctx, s) => {
    const r = seeded('ground');
    ctx.fillStyle = '#b4b4b4';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26000; i++) {
      const g = (130 + r() * 125) | 0;
      ctx.fillStyle = `rgba(${g},${g},${g},0.25)`;
      const z = 1 + r() * 4;
      ctx.fillRect(r() * s, r() * s, z, z);
    }
  });
}

function archTex() {
  return canvasTexture('arch', 256, (ctx, s) => {
    ctx.fillStyle = '#f2efe8';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#3a2e22';
    const w = s / 4;
    for (let i = 0; i < 4; i++) {
      const cx = i * w + w / 2;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.28, s * 0.85);
      ctx.lineTo(cx - w * 0.28, s * 0.42);
      ctx.quadraticCurveTo(cx - w * 0.28, s * 0.2, cx, s * 0.14);
      ctx.quadraticCurveTo(cx + w * 0.28, s * 0.2, cx + w * 0.28, s * 0.42);
      ctx.lineTo(cx + w * 0.28, s * 0.85);
      ctx.fill();
    }
  });
}

export function waterNormalTex() {
  const t = canvasTexture('waterN', 256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    const H = (x, y) => {
      const a = (2 * Math.PI) / s;
      return Math.sin(x * a * 3 + Math.sin(y * a * 2) * 1.5) * 0.5 + Math.sin(y * a * 5 + x * a * 2) * 0.35 + Math.sin((x + y) * a * 7) * 0.15;
    };
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1);
        const n = new THREE.Vector3(-dx * 2.5, -dy * 2.5, 1).normalize();
        const i = (y * s + x) * 4;
        img.data[i] = (n.x * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }, false);
  t.repeat.set(10, 10);
  return t;
}

// ---------------------------------------------------------------- materials

function makeMats(paletteName) {
  const P = PALETTES[paletteName] || PALETTES.sandstone;
  const stone = (color, rep = 2, rough = 0.86) => {
    const map = masonryTex().clone();
    map.repeat.set(rep, rep);
    map.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale: 1.4, roughness: rough });
  };
  const paints = {};
  const waterN = waterNormalTex();
  return {
    P,
    stone,
    base: stone(P.base, 2),
    trim: stone(P.trim, 3),
    dark: new THREE.MeshStandardMaterial({ color: P.dark, roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffbf4a, metalness: 1, roughness: 0.52, envMapIntensity: 1.6 }),
    copper: new THREE.MeshStandardMaterial({ color: 0x7d8a99, metalness: 0.9, roughness: 0.35 }),
    marble: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.32 }),
    marbleArches: (() => {
      const m = archTex().clone(); m.repeat.set(3, 1); m.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: m, roughness: 0.45 });
    })(),
    checker: (() => {
      const m = checkerMarbleTex().clone(); m.repeat.set(40, 40); m.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: m, roughness: 0.28 });
    })(),
    tile: (rep) => {
      const m = tileTex().clone(); m.repeat.set(rep, rep); m.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: m, color: P.base, roughness: 0.8 });
    },
    door: new THREE.MeshStandardMaterial({ color: 0x0d0703, emissive: 0xff8c2a, emissiveIntensity: 0.12, roughness: 1 }),
    saffron: new THREE.MeshStandardMaterial({ color: 0xff7a12, roughness: 0.7, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.5, metalness: 0.1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.55, metalness: 0.7 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3f7a2e, roughness: 0.9, flatShading: true }),
    water: new THREE.MeshStandardMaterial({ color: 0x1d4f5c, roughness: 0.08, metalness: 0.2, normalMap: waterN, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.6 }),
    paint: (hex) => paints[hex] || (paints[hex] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 })),
  };
}

// ---------------------------------------------------------------- primitives

function shade(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  m.position.set(x, y + h / 2, z);
  return m;
}
function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
  m.position.set(x, y + h / 2, z);
  return m;
}
function sqFrustum(halfBottom, halfTop, h, mat, y = 0) {
  const g = new THREE.CylinderGeometry(halfTop * SQ2, halfBottom * SQ2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  const m = shade(new THREE.Mesh(g.toNonIndexed(), mat));
  m.geometry.computeVertexNormals();
  m.position.y = y + h / 2;
  return m;
}
function dome(r, mat, { seg = 24, squash = 1, y = 0, x = 0, z = 0 } = {}) {
  const m = shade(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), mat));
  m.scale.y = squash;
  m.position.set(x, y, z);
  return m;
}
function lathe(points, seg, mat) {
  return shade(new THREE.Mesh(new THREE.LatheGeometry(points, seg), mat));
}

function part(name, desc, ...objs) {
  const g = new THREE.Group();
  g.userData.part = { name, desc };
  objs.flat().forEach((o) => o && g.add(o));
  return g;
}

function amalaka(r, mat) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 12;
    pts.push(V2(Math.max(0.01, Math.cos(a) * r), (Math.sin(a) + 1) * r * 0.32));
  }
  const g = new THREE.LatheGeometry(pts, 64);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const k = 1 + 0.09 * Math.abs(Math.cos(Math.atan2(z, x) * 12));
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  g.computeVertexNormals();
  return shade(new THREE.Mesh(g, mat));
}

function kalasha(h, mat) {
  const prof = [[0, 0], [0.3, 0], [0.38, 0.12], [0.44, 0.3], [0.36, 0.48], [0.16, 0.57], [0.22, 0.63], [0.12, 0.7], [0.15, 0.77], [0.05, 0.94], [0, 1]];
  return lathe(prof.map(([r, y]) => V2(r * h, y * h)), 24, mat);
}

function flag(ctx, w, h, mat, poleH, x, y, z) {
  const g = new THREE.Group();
  const pole = cyl(0.06 * h, 0.08 * h, poleH, 8, ctx.M.iron, 0, 0, 0);
  const geo = new THREE.PlaneGeometry(w, h, 18, 6);
  geo.translate(w / 2, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 - 0.65 * (p.getX(i) / w)));
  const base = p.array.slice();
  const cloth = new THREE.Mesh(geo, mat);
  cloth.castShadow = true;
  cloth.position.set(0, poleH - h * 0.6, 0);
  cloth.userData.noCollide = true;
  g.add(pole, cloth);
  g.position.set(x, y, z);
  const phase = ctx.rnd() * 10;
  ctx.animators.push((t) => {
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3], k = bx / w;
      p.setZ(i, Math.sin(bx * 1.6 - t * 5 + phase) * 0.22 * k * w * 0.35);
      p.setY(i, base[i * 3 + 1] - k * k * h * 0.12);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return g;
}

function instanced(geo, mat, matrices, colors) {
  const m = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
  if (colors) colors.forEach((c, i) => m.setColorAt(i, new THREE.Color(c)));
  m.castShadow = m.receiveShadow = true;
  m.instanceMatrix.needsUpdate = true;
  return m;
}
const mat4 = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

function pillarField(positions, h, r, mat, capMat) {
  const shaft = new THREE.CylinderGeometry(r * 0.85, r, h, 8);
  shaft.translate(0, h / 2, 0);
  const cap = new THREE.BoxGeometry(r * 3, r * 1.2, r * 3);
  cap.translate(0, h - r * 0.6, 0);
  const base = new THREE.BoxGeometry(r * 2.6, r * 1.4, r * 2.6);
  base.translate(0, r * 0.7, 0);
  const ms = positions.map(([x, y, z]) => mat4(x, y, z));
  return [instanced(shaft, mat, ms), instanced(cap, capMat || mat, ms), instanced(base, capMat || mat, ms)];
}

function perimeter(w, d, step, y = 0) {
  const pts = [];
  const nx = Math.max(1, Math.round(w / step)), nz = Math.max(1, Math.round(d / step));
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + (i * w) / nx; pts.push([x, y, -d / 2], [x, y, d / 2]); }
  for (let j = 1; j < nz; j++) { const z = -d / 2 + (j * d) / nz; pts.push([-w / 2, y, z], [w / 2, y, z]); }
  return pts;
}

function stepRoof(w, d, levels, h, mat, y) {
  const g = new THREE.Group();
  for (let i = 0; i < levels; i++) {
    const k = 1 - i / (levels + 0.6);
    g.add(box(w * k, h / levels * 0.8, d * k, mat, 0, y + (i * h) / levels));
  }
  return g;
}

function tree(ctx, x, z, s = 1, mat) {
  const { M, rnd } = ctx;
  const g = new THREE.Group();
  g.add(cyl(0.35 * s, 0.55 * s, 4 * s, 7, M.bark));
  const leaf = mat || M.leaf;
  const n = 5 + ((rnd() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const r = (1.6 + rnd() * 1.6) * s;
    const m = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf));
    const a = rnd() * Math.PI * 2, d = rnd() * 2.2 * s;
    m.position.set(Math.cos(a) * d, 4.2 * s + rnd() * 2.6 * s, Math.sin(a) * d);
    g.add(m);
  }
  g.position.set(x, 0, z);
  g.traverse((o) => (o.userData.noCollide = true));
  return g;
}

function nandi(ctx, s, x, y, z, rotY = 0) {
  const { M } = ctx;
  const g = new THREE.Group();
  const mat = M.black;
  g.add(box(1.4 * s, 0.5 * s, 2.6 * s, M.base, 0, 0, 0));
  const body = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.62 * s, 1.3 * s, 6, 12), mat));
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.5 * s + 0.62 * s, 0);
  const hump = shade(new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 12, 10), mat));
  hump.position.set(0, 1.55 * s, 0.55 * s);
  const head = box(0.55 * s, 0.8 * s, 0.75 * s, mat, 0, 1.25 * s, 1.35 * s);
  head.rotation.x = 0.35;
  const hornG = new THREE.ConeGeometry(0.08 * s, 0.45 * s, 6);
  const h1 = shade(new THREE.Mesh(hornG, mat)); h1.position.set(0.22 * s, 2.15 * s, 1.35 * s); h1.rotation.z = -0.4;
  const h2 = shade(new THREE.Mesh(hornG, mat)); h2.position.set(-0.22 * s, 2.15 * s, 1.35 * s); h2.rotation.z = 0.4;
  const garland = shade(new THREE.Mesh(new THREE.TorusGeometry(0.42 * s, 0.07 * s, 6, 16), M.paint(0xff9f1c)));
  garland.position.set(0, 1.25 * s, 1.0 * s);
  garland.rotation.x = 1.2;
  g.add(body, hump, head, h1, h2, garland);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return part('Nandi', 'Shiva\'s bull, seated facing the sanctum and gazing at the lingam. Devotees whisper their wishes into his ear so he can carry them to Shiva.', g);
}

function deepaStambha(ctx, h, x, z) {
  const { M } = ctx;
  const g = new THREE.Group();
  g.add(box(2, 0.8, 2, M.trim));
  g.add(cyl(0.35, 0.6, h, 10, M.dark, 0, 0.8));
  const tiers = Math.round(h / 1.1);
  for (let i = 1; i < tiers; i++) {
    const y = 0.8 + i * 1.05;
    const ring = cyl(0.75 - i * 0.02, 0.75 - i * 0.02, 0.12, 12, M.dark, 0, y);
    g.add(ring);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + i * 0.4;
      ctx.lamps.push(new THREE.Vector3(x + Math.cos(a) * 0.75, y + 0.2, z + Math.sin(a) * 0.75));
    }
  }
  g.add(kalasha(1.2, M.gold).translateY(h + 0.8));
  g.position.set(x, 0, z);
  return part('Deepa Stambha', 'Lamp pillar whose many niches are filled with oil lamps on festivals such as Kartik Purnima and Diwali, turning it into a column of light.', g);
}

// ---------------------------------------------------------------- environment

function prakara(ctx, w, d, gates, mat, h = 4.5, t = 1.2, gapW = 10) {
  const g = new THREE.Group();
  const side = (len, gate, place) => {
    if (!gate) return [place(len, 0)];
    const seg = (len - gapW) / 2;
    return [place(seg, -(gapW + seg) / 2), place(seg, (gapW + seg) / 2)];
  };
  side(w, gates.includes('E'), (l, o) => box(l, h, t, mat, o, 0, d / 2)).forEach((m) => g.add(m));
  side(w, gates.includes('W'), (l, o) => box(l, h, t, mat, o, 0, -d / 2)).forEach((m) => g.add(m));
  side(d, gates.includes('N'), (l, o) => box(t, h, l, mat, -w / 2, 0, o)).forEach((m) => g.add(m));
  side(d, gates.includes('S'), (l, o) => box(t, h, l, mat, w / 2, 0, o)).forEach((m) => g.add(m));
  const merlons = [];
  perimeter(w, d, 2.2, h).forEach(([x, y, z]) => merlons.push(mat4(x, y, z)));
  const mg = new THREE.BoxGeometry(0.9, 0.7, 0.9);
  mg.translate(0, 0.35, 0);
  g.add(instanced(mg, mat, merlons));
  return part('Prakara (enclosure wall)', 'The compound wall that separates the sacred precinct from the busy streets outside. Pilgrims leave their footwear at its gates.', g);
}

function backdrop(ctx, kind) {
  const { rnd, M } = ctx;
  const g = new THREE.Group();
  if (kind === 'himalaya' || kind === 'hills') {
    const snow = kind === 'himalaya';
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * (0.75 + rnd() * 1.5);
      const dist = 900 + rnd() * 1100;
      const r = 320 + rnd() * 420, h = snow ? 700 + rnd() * 900 : 120 + rnd() * 160;
      const geo = new THREE.ConeGeometry(r, h, 10, 8);
      const p = geo.attributes.position;
      const col = [];
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k) + h / 2;
        const n = 1 + (rnd() - 0.5) * 0.25;
        p.setXYZ(k, p.getX(k) * n, p.getY(k) * (1 + (rnd() - 0.5) * 0.05), p.getZ(k) * n);
        const t = y / h;
        const c = snow
          ? t > 0.38 + rnd() * 0.12 ? new THREE.Color(0xf4f7fb) : new THREE.Color(0x6b6660).lerp(new THREE.Color(0x56603f), Math.max(0, 1 - t * 2.5))
          : new THREE.Color(0x4d7a35).lerp(new THREE.Color(0x76904c), t);
        col.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      if (!snow) m.scale.y = 0.6;
      m.position.set(Math.sin(a) * dist, (h / 2) * (snow ? 1 : 0.6) - 5, Math.cos(a) * dist);
      g.add(m);
    }
  }
  if (kind === 'sea') {
    const seaTex = waterNormalTex().clone();
    seaTex.repeat.set(260, 100);
    seaTex.needsUpdate = true;
    const seaMat = M.water.clone();
    seaMat.normalMap = seaTex;
    seaMat.color.set(0x245a6e);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 3000), seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.25, -1650);
    g.add(sea);
    ctx.animators.push((t) => seaTex.offset.set(t * 0.03, t * 0.02));
  }
  g.traverse((o) => (o.userData.noCollide = true));
  return g;
}

function groundPlane(ctx, color) {
  const t = groundTex().clone();
  t.repeat.set(300, 300);
  t.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color, map: t, roughness: 1, envMapIntensity: 0.4 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.05;
  m.receiveShadow = true;
  m.userData.ground = true;
  return m;
}

function courtyard(ctx, w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ctx.M.tile(Math.max(w, d) / 4));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  m.receiveShadow = true;
  m.userData.ground = true;
  return m;
}

function rectPath(cx, cz, hx, hz, y) {
  const per = 4 * (hx + hz);
  return (u, lane) => {
    const ex = hx + lane, ez = hz + lane;
    let s = (u % 1) * per;
    const L = [2 * hz, 2 * hx, 2 * hz, 2 * hx].map((v) => (v * (ex + ez)) / (hx + hz));
    const total = L.reduce((a, b) => a + b);
    s = (s / per) * total;
    if (s < L[0]) return new THREE.Vector3(cx + ex, y, cz - ez + s);
    s -= L[0];
    if (s < L[1]) return new THREE.Vector3(cx + ex - s, y, cz + ez);
    s -= L[1];
    if (s < L[2]) return new THREE.Vector3(cx - ex, y, cz + ez - s);
    s -= L[2];
    return new THREE.Vector3(cx - ex + s, y, cz - ez);
  };
}

function devotees(ctx, count, path, colors = ROBES) {
  const { rnd } = ctx;
  const geo = new THREE.CapsuleGeometry(0.23, 1.0, 3, 8);
  geo.translate(0, 0.73, 0);
  const head = new THREE.SphereGeometry(0.16, 10, 8);
  head.translate(0, 1.62, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), count);
  const heads = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.7 }), count);
  const people = [];
  for (let i = 0; i < count; i++) {
    people.push({ u: rnd(), speed: 0.004 + rnd() * 0.004, lane: (rnd() - 0.5) * 3, phase: rnd() * 6, s: 0.85 + rnd() * 0.3 });
    mesh.setColorAt(i, new THREE.Color(colors[(rnd() * colors.length) | 0]));
  }
  mesh.castShadow = heads.castShadow = true;
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const update = (t) => {
    people.forEach((p, i) => {
      const pos = path(p.u + t * p.speed, p.lane);
      pos.y += Math.abs(Math.sin(t * 5 + p.phase)) * 0.05;
      sc.setScalar(p.s);
      mx.compose(pos, q, sc);
      mesh.setMatrixAt(i, mx);
      heads.setMatrixAt(i, mx);
    });
    mesh.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  };
  update(0);
  ctx.animators.push(update);
  const copy = (RITUALS[ctx.site.tradition] || RITUALS.Hindu).pilgrims;
  const g = part(copy[0], copy[1], mesh, heads);
  g.traverse((o) => (o.userData.noCollide = true));
  return g;
}

// ---------------------------------------------------------------- NAGARA

function nagaraShikharaGeo(half, h, { taper = 0.72, curve = 2.3 } = {}) {
  const pts = [];
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let r = half * SQ2 * (1 - taper * Math.pow(t, curve));
    if (i % 4 === 1 || i % 4 === 2) r *= 1.035;
    pts.push(V2(r, t * h));
  }
  pts.push(V2(0.01, h));
  const g = new THREE.LatheGeometry(pts, 4);
  g.rotateY(Math.PI / 4);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

function miniSpire(ctx, half, h, mat, x, y, z) {
  const g = new THREE.Group();
  g.add(shade(new THREE.Mesh(nagaraShikharaGeo(half, h), mat)));
  const am = amalaka(half * 0.5, ctx.M.trim);
  am.position.y = h * 0.98;
  g.add(am);
  g.add(kalasha(half * 0.55, ctx.M.gold).translateY(h * 0.98 + half * 0.32));
  g.position.set(x, y, z);
  return g;
}

function nagaraShrine(ctx, o) {
  const { M } = ctx;
  const { sc, H, cluster = 1, gold = false, bodyMat = M.base, plinthH } = o;
  const g = new THREE.Group();
  const half = 5 * sc, bodyH = 8 * sc;
  const shMat = gold ? M.gold : M.base;
  const body = new THREE.Group();
  body.add(box(half * 2, bodyH, half * 2, bodyMat, 0, plinthH, 0));
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => body.add(box(1.2 * sc, bodyH, 1.2 * sc, M.trim, sx * half, plinthH, sz * half))));
  for (let k = 0; k < 4; k++) {
    const rib = box(half * 0.9, bodyH * 0.9, 0.6 * sc, M.trim, 0, plinthH, half + 0.2 * sc);
    const pivot = new THREE.Group();
    pivot.add(rib);
    pivot.rotation.y = (k * Math.PI) / 2;
    if (k !== 0) body.add(pivot);
  }
  body.add(box(half * 2.15, 0.7 * sc, half * 2.15, M.trim, 0, plinthH + bodyH - 0.7 * sc, 0));
  const door = box(2.6 * sc, 4.6 * sc, 0.4 * sc, M.door, 0, plinthH, half + 0.1 * sc);
  door.userData.noCollide = false;
  const frame = box(3.6 * sc, 5.4 * sc, 0.3 * sc, gold ? M.gold : M.trim, 0, plinthH, half + 0.05 * sc);
  ctx.lights.push(new THREE.Vector3(0, plinthH + 2 * sc, half + 1.2 * sc));
  ctx.lamps.push(new THREE.Vector3(-1.6 * sc, plinthH + 0.3, half + 0.6 * sc), new THREE.Vector3(1.6 * sc, plinthH + 0.3, half + 0.6 * sc));
  g.add(part('Garbhagriha (sanctum)', 'The "womb chamber": a small, dim sanctum that holds the main deity. The tower rises directly above it to mark the axis between earth and heaven. Darshan, seeing and being seen by the deity, happens here.', body, frame, door));

  const y0 = plinthH + bodyH;
  const shHalf = half * 1.08;
  const amR = shHalf * 0.42;
  const kalH = 2.6 * sc;
  const shH = Math.max(6 * sc, H - y0 - amR * 0.64 - kalH);
  const tower = shade(new THREE.Mesh(nagaraShikharaGeo(shHalf, shH), shMat));
  tower.position.y = y0;
  const spires = [];
  if (cluster >= 1) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      spires.push(miniSpire(ctx, shHalf * 0.46, shH * 0.55, shMat, Math.sin(a) * shHalf * 0.78, y0, Math.cos(a) * shHalf * 0.78));
    }
  }
  if (cluster >= 2) {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      spires.push(miniSpire(ctx, shHalf * 0.34, shH * 0.38, shMat, Math.sin(a) * shHalf * 1.05, y0, Math.cos(a) * shHalf * 1.05));
    }
  }
  if (cluster >= 3) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      spires.push(miniSpire(ctx, shHalf * 0.36, shH * 0.36, shMat, Math.sin(a) * shHalf * 0.62, y0 + shH * 0.32, Math.cos(a) * shHalf * 0.62));
    }
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      spires.push(miniSpire(ctx, shHalf * 0.22, shH * 0.24, shMat, Math.sin(a) * shHalf * 1.2, y0, Math.cos(a) * shHalf * 1.2));
    }
  }
  g.add(part('Shikhara', 'The curved "mountain peak" tower of Nagara temples. It stands for Mount Meru, the centre of the universe, and its banded courses (bhumis) climb toward the heavens.' + (gold ? ' This one is clad in gold.' : ''), tower));
  if (spires.length)
    g.add(part('Urushringas', `${spires.length} miniature spires leaning against the main tower. Each repeats the shikhara at a smaller scale, so the temple reads as a range of peaks.`, spires));

  const am = amalaka(amR, M.trim);
  am.position.y = y0 + shH - 0.2 * sc;
  g.add(part('Amalaka', 'The ribbed stone disc that crowns the shikhara, named after the amla fruit. It represents the sun and the threshold of the heavens.', am));
  const kal = kalasha(kalH, M.gold);
  kal.position.y = y0 + shH + amR * 0.6;
  g.add(part('Kalasha', 'The sacred pot finial at the summit. It symbolises abundance and the vessel of amrita, the nectar of immortality.', kal));
  const top = y0 + shH + amR * 0.6 + kalH;
  const fw = (o.bigFlag ? 9 : 4.5) * sc, fh = (o.bigFlag ? 4 : 2.2) * sc;
  g.add(part('Dhvaja (flag)', o.bigFlag ? 'Dwarkadhish\'s huge flag, said to be 52 yards long, is replaced up to five times a day by families who wait years for the honour.' : 'The temple flag. Hoisting a new dhvaja is a major act of devotion and marks the temple as a living shrine.', flag(ctx, fw, fh, M.saffron, 6 * sc, 0, top - 1 * sc, 0)));
  return { group: g, half, top };
}

function buildNagara(ctx) {
  const { site, M } = ctx;
  const t = site.temple;
  const H = t.height || 30;
  const sc = H / 30;
  const plinthH = (t.highPlinth ? 4.5 : 1.8) * sc;
  const root = new THREE.Group();
  const bodyMat = t.palette === 'painted' ? M.paint(0xe9dcc3) : M.base;

  const shrine = nagaraShrine(ctx, { sc, H, cluster: t.cluster ?? 1, gold: t.gold, bodyMat, plinthH, bigFlag: t.bigFlag });
  root.add(shrine.group);
  const half = shrine.half;

  const mandapas = [];
  let z = half;
  const nM = t.mandapas || 1;
  const levels = t.storeys ? Math.min(5, t.storeys) : 1;
  const antar = box(7 * sc, 6.5 * sc, 2.2 * sc, M.base, 0, plinthH, z + 1.1 * sc);
  z += 2.2 * sc;
  for (let i = 0; i < nM; i++) {
    const w = (14 - i * 0.8) * sc, d = 11 * sc;
    const cz = z + d / 2;
    const g = new THREE.Group();
    const lh = 4.6 * sc;
    for (let L = 0; L < levels; L++) {
      const k = 1 - L * 0.06;
      const y = plinthH + L * lh;
      g.add(box(w * k, 0.45 * sc, d * k, M.trim, 0, y, cz));
      g.add(...pillarField(perimeter(w * k - 1.2 * sc, d * k - 1.2 * sc, 2.6 * sc, y + 0.45 * sc).map(([x, yy, zz]) => [x, yy, zz + cz]), lh - 1.1 * sc, 0.32 * sc, M.base, M.trim));
      g.add(box(w * k + 0.6 * sc, 0.65 * sc, d * k + 0.6 * sc, M.trim, 0, y + lh - 0.65 * sc, cz));
      if (L === 0) {
        g.add(box(w * 0.9, 1.1 * sc, 0.5 * sc, M.base, 0, y + 0.45 * sc, cz - d / 2 + 0.6 * sc));
        [-1, 1].forEach((s) => g.add(box(0.5 * sc, 1.1 * sc, d * 0.8, M.base, s * (w / 2 - 0.4 * sc), y + 0.45 * sc, cz)));
      }
    }
    const ry = plinthH + levels * lh;
    if (t.domes) {
      g.add(cyl(w * 0.34, w * 0.36, 1.2 * sc, 24, M.trim, 0, ry, cz));
      g.add(dome(w * 0.34, M.base, { y: ry + 1.2 * sc, z: cz, squash: 0.95 }));
      g.add(kalasha(1.8 * sc, M.gold).translateY(ry + 1.2 * sc + w * 0.32).translateZ(cz));
    } else {
      const roof = stepRoof(w, d, 6, 5.5 * sc, M.base, ry);
      roof.position.z = cz;
      g.add(roof);
      const a = amalaka(1.6 * sc, M.trim);
      a.position.set(0, ry + 5.2 * sc, cz);
      g.add(a, kalasha(1.6 * sc, M.gold).translateY(ry + 6.1 * sc).translateZ(cz));
    }
    const names = ['Gudha Mandapa', 'Nritya Mandapa', 'Ranga Mandapa', 'Kirtan Mandapa', 'Prarthana Mandapa'];
    mandapas.push(part(i === 0 && levels > 1 ? `Mandapa (${levels} storeys)` : names[i] || 'Mandapa', i === 0
      ? 'The pillared assembly hall where devotees gather to sing bhajans, listen to discourses and wait for darshan. Its pyramidal roof steps down from the main tower.'
      : 'One of a series of pillared halls along the axis. Each one takes the pilgrim another step from the outside world toward the sanctum.', g));
    z += d + 0.8 * sc;
  }
  root.add(part('Antarala', 'The vestibule linking the hall to the sanctum. It is the threshold where the devotee pauses before darshan.', antar));
  root.add(...mandapas);
  const front = z + 2 * sc;
  const back = -half - 3 * sc;
  const plW = 22 * sc, plL = front - back;
  const plCz = (front + back) / 2;
  const jag = new THREE.Group();
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const k = i * 1.4 * sc;
    jag.add(box(plW - k, plinthH / steps, plL - k, M.trim, 0, (i * plinthH) / steps, plCz));
  }
  for (let i = 0; i < 6; i++) jag.add(box(6 * sc, ((i + 1) * plinthH) / 6, 0.7 * sc, M.trim, 0, 0, front + (6 - i) * 0.7 * sc - 0.35 * sc));
  root.add(part('Jagati (terrace)', 'The raised platform on which the temple stands. It lifts the sacred above the profane, and pilgrims walk around its edge in pradakshina.', jag));
  for (let i = 0; i < 24; i++) {
    const u = i / 24;
    const p = rectPath(0, plCz, plW / 2 - 0.4, plL / 2 - 0.4, plinthH + 0.1)(u, 0);
    ctx.lamps.push(p);
  }

  const W = Math.max(80, plW + 56), D = plL + 60;
  const cz = plCz;
  const extras = [];
  if (t.shiva) extras.push(nandi(ctx, 1.1 * sc, 0, 0, front + 6 * sc, Math.PI));
  extras.push(deepaStambha(ctx, 9 * sc, 9 * sc, front + 9 * sc));
  if (t.jainCluster) {
    const minis = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.15 + (i / 9) * Math.PI * 1.7;
      const r = Math.min(W, D) * 0.4;
      const s = nagaraShrine(ctx, { sc: sc * 0.33, H: H * 0.36, cluster: 1, gold: false, bodyMat: M.base, plinthH: 0.8 });
      s.group.position.set(Math.sin(a) * r, 0, cz - Math.cos(a) * r);
      s.group.rotation.y = Math.atan2(-s.group.position.x, cz - s.group.position.z);
      minis.push(s.group);
    }
    extras.push(part('Tonk shrines', 'Palitana\'s 860+ shrines are grouped in walled tonks. Every one houses a marble tirthankara, carved with great precision.', minis));
  }
  if (t.cave) {
    const rock = new THREE.MeshStandardMaterial({ color: 0x7a6e5d, roughness: 1, flatShading: true });
    const m = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(70, 2), rock));
    m.scale.set(1.4, 1, 0.8);
    m.position.set(0, 10, back - 62);
    const cave = box(4, 3.4, 4, M.door, 0, plinthH, back - 6);
    extras.push(part('Holy cave (Trikuta)', 'The cave on Trikuta mountain. Pilgrims crawl through a narrow passage to reach the three pindis that represent Maha Kali, Maha Lakshmi and Maha Saraswati.', m, cave));
  }
  root.add(...extras);

  return {
    root, height: H, focus: new THREE.Vector3(0, H * 0.38, plCz), radius: Math.max(plL, H) * 1.25,
    bounds: { w: W, d: D, cz }, gates: ['E'],
    path: rectPath(0, plCz, plW / 2 + 3, plL / 2 + 3, 0),
    backdrop: t.himalaya ? 'himalaya' : t.sea ? 'sea' : site.elev > 600 ? 'hills' : null,
    ground: t.himalaya ? 0x7a705c : t.sea ? 0xd4bd92 : 0xa39062,
  };
}

// ---------------------------------------------------------------- DRAVIDA

function kuta(ctx, s, mat, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.add(box(s, s * 0.6, s, mat));
  const d = dome(s * 0.62, mat, { seg: 4, y: s * 0.6 });
  d.rotation.y = Math.PI / 4;
  g.add(d);
  g.position.set(x, y, z);
  g.rotation.y = ry;
  return g;
}
function shala(ctx, s, mat, x, y, z, ry) {
  const g = new THREE.Group();
  g.add(box(s * 1.6, s * 0.55, s * 0.9, mat));
  const v = shade(new THREE.Mesh(new THREE.CylinderGeometry(s * 0.45, s * 0.45, s * 1.6, 12, 1, false, 0, Math.PI), mat));
  v.rotation.z = Math.PI / 2;
  v.position.y = s * 0.55;
  g.add(v);
  g.position.set(x, y, z);
  g.rotation.y = ry;
  return g;
}

function vimana(ctx, o) {
  const { M } = ctx;
  const { base, tiers, tall, gold } = o;
  const g = new THREE.Group();
  const towerMat = gold ? M.gold : M.base;
  const adh = box(base + 3, 2.2, base + 3, M.trim);
  const wallH = tall ? 15 : 7.5;
  const bhitti = new THREE.Group();
  bhitti.add(box(base, wallH, base, M.base, 0, 2.2));
  for (let f = 0; f < 4; f++) {
    const piv = new THREE.Group();
    for (let i = -2; i <= 2; i++) piv.add(box(base * 0.08, wallH, 0.7, M.trim, (i * base) / 5.2, 2.2, base / 2 + 0.2));
    piv.rotation.y = (f * Math.PI) / 2;
    bhitti.add(piv);
  }
  const door = box(2.6, 4.4, 0.4, M.door, 0, 2.2, base / 2 + 0.6);
  ctx.lights.push(new THREE.Vector3(0, 4, base / 2 + 2));
  g.add(part('Garbhagriha (sanctum)', 'The granite sanctum holding the main deity. Only priests enter it; devotees receive darshan from the doorway as the camphor flame is waved.', adh, bhitti, door));

  const tg = new THREE.Group();
  let y = 2.2 + wallH;
  const tierH = tall ? 3.4 : 2.6;
  const dec = tall ? 0.052 : 0.17;
  let w = base * 0.96;
  for (let i = 0; i < tiers; i++) {
    w = base * 0.96 * (1 - i * dec);
    tg.add(box(w + 1, tierH * 0.18, w + 1, M.trim, 0, y));
    tg.add(box(w, tierH * 0.55, w, towerMat, 0, y + tierH * 0.18));
    const ky = y + tierH * 0.73;
    const k = Math.max(0.9, w * 0.12);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => tg.add(kuta(ctx, k, towerMat, (sx * (w - k)) / 2, ky, (sz * (w - k)) / 2))));
    for (let f = 0; f < 4; f++) {
      const a = (f * Math.PI) / 2;
      tg.add(shala(ctx, k, towerMat, Math.sin(a) * (w - k) / 2, ky, Math.cos(a) * (w - k) / 2, a + Math.PI / 2));
    }
    y += tierH;
  }
  const gr = Math.max(1.6, w * 0.34);
  tg.add(box(w * 0.8, 1, w * 0.8, towerMat, 0, y));
  const griva = cyl(gr, gr, 2.4, 8, towerMat, 0, y + 1);
  const sh = dome(gr * 1.55, towerMat, { seg: 8, y: y + 3.4, squash: 1.1 });
  sh.rotation.y = Math.PI / 8;
  const st = kalasha(gr * 1.1, M.gold);
  st.position.y = y + 3.4 + gr * 1.6;
  g.add(part(gold ? 'Ananda Nilayam vimana' : 'Vimana', gold
    ? 'The gilded vimana above the sanctum, which shines across the hills. Its gold plating has been renewed over centuries by kings and devotees.'
    : `The pyramidal tower over the sanctum, rising in ${tiers} storeys (talas) of miniature pavilions (kutas and shalas). It is a palace for the god, stacked toward the sky.`, tg));
  g.add(part('Shikhara & stupi', tall
    ? 'The octagonal domed capstone, said to weigh about 80 tonnes and hauled up a long earthen ramp. The stupi (finial) on top is gilded.'
    : 'The crowning dome of the vimana with its gilded stupi finial. Its octagonal shape marks the sanctum as dedicated to Shiva or Vishnu.', griva, sh, st));
  return { group: g, top: y + 3.4 + gr * 2.7 };
}

function gopuram(ctx, o) {
  const { M, rnd } = ctx;
  const { w, d, tiers, painted, name } = o;
  const g = new THREE.Group();
  const baseH = painted ? 10 : 8;
  const gap = 5;
  g.add(box((w - gap) / 2, baseH, d, M.trim, -(w + gap) / 4, 0, 0));
  g.add(box((w - gap) / 2, baseH, d, M.trim, (w + gap) / 4, 0, 0));
  g.add(box(gap, baseH * 0.25, d, M.trim, 0, baseH * 0.75, 0));
  let y = baseH;
  const th = painted ? 4.4 : 3.6;
  const figMs = [], figCs = [];
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * (0.55 / tiers)), td = d * (1 - i * (0.4 / tiers));
    const tierMat = painted ? M.paint(new THREE.Color().setHSL((i * 0.13 + 0.05) % 1, 0.45, 0.72).getHex()) : M.base;
    g.add(box(tw + 0.8, th * 0.18, td + 0.8, painted ? M.paint(0xf2e6c9) : M.trim, 0, y));
    g.add(box(tw, th * 0.82, td, tierMat, 0, y + th * 0.18));
    if (painted) {
      const n = Math.floor(tw / 1.1);
      for (let k = 0; k < n; k++) {
        const x = -tw / 2 + 0.55 + k * (tw - 1.1) / Math.max(1, n - 1);
        [-1, 1].forEach((s) => {
          figMs.push(mat4(x, y + th * 0.22, s * (td / 2 + 0.2), 0.6, 1.2 + rnd() * 1.1, 0.4));
          figCs.push(BRIGHT[(rnd() * BRIGHT.length) | 0]);
        });
      }
    }
    y += th;
  }
  if (figMs.length) {
    const fg = new THREE.BoxGeometry(1, 1, 1);
    fg.translate(0, 0.5, 0);
    g.add(instanced(fg, new THREE.MeshStandardMaterial({ roughness: 0.6 }), figMs, figCs));
  }
  const topW = w * 0.45;
  const vault = shade(new THREE.Mesh(new THREE.CylinderGeometry(d * 0.22, d * 0.22, topW, 16, 1, false, 0, Math.PI), painted ? M.paint(0xe76f51) : M.base));
  vault.rotation.z = Math.PI / 2;
  vault.position.y = y;
  g.add(vault);
  const nK = painted ? 9 : 7;
  for (let k = 0; k < nK; k++) g.add(kalasha(1.5, M.gold).translateX(-topW / 2 + 0.6 + (k * (topW - 1.2)) / (nK - 1)).translateY(y + d * 0.2));
  return part(name || 'Gopuram', painted
    ? 'A monumental gateway tower covered with hundreds of painted stucco figures of gods, goddesses, demons and sages, repainted every 12 years for the kumbhabhishekam.'
    : 'Gateway tower of the enclosure. In later Dravida temples gopurams grew taller than the vimana itself and became landmarks visible across the city.', g);
}

function buildDravida(ctx) {
  const { site, M, rnd } = ctx;
  const t = site.temple;
  const tall = !!t.tall;
  const base = tall ? 26 : 14;
  const root = new THREE.Group();
  const v = vimana(ctx, { base, tiers: t.tiers || 3, tall, gold: t.goldVimana });
  root.add(v.group);

  let z = base / 2 + 1.5;
  const halls = [];
  const ad = 7, aw = base * 0.55;
  const ardha = new THREE.Group();
  ardha.add(box(aw, 1.4, ad, M.trim, 0, 0, z + ad / 2));
  ardha.add(box(aw, 6, ad, M.base, 0, 1.4, z + ad / 2));
  ardha.add(box(aw + 0.8, 0.7, ad + 0.8, M.trim, 0, 7.4, z + ad / 2));
  halls.push(part('Ardha Mandapa', 'The antechamber in front of the sanctum. Its pillars carry carvings of the deity\'s many forms and dancing celestials.', ardha));
  z += ad;
  const mw = base * (tall ? 0.95 : 1.4), md = tall ? 22 : 18;
  const maha = new THREE.Group();
  maha.add(box(mw, 1.2, md, M.trim, 0, 0, z + md / 2));
  const grid = [];
  for (let x = -mw / 2 + 1.5; x <= mw / 2 - 1.4; x += 2.6) for (let zz = z + 1.5; zz <= z + md - 1.4; zz += 2.6) grid.push([x, 1.2, zz]);
  maha.add(...pillarField(grid, 5.2, 0.35, M.base, M.trim));
  maha.add(box(mw + 1, 0.8, md + 1, M.trim, 0, 6.4, z + md / 2));
  perimeter(mw, md, 3, 7.2).forEach(([x, yy, zz]) => maha.add(kuta(ctx, 0.9, M.base, x, yy, zz + z + md / 2)));
  halls.push(part('Maha Mandapa', `A great pillared hall (${grid.length} pillars here) for music, dance and festival gatherings. Every pillar is carved; some temples have "musical pillars" that ring when tapped.`, maha));
  z += md;
  root.add(...halls);

  const front = z;
  const ds = new THREE.Group();
  ds.add(box(2.2, 1.2, 2.2, M.trim));
  ds.add(cyl(0.32, 0.4, 13, 12, M.gold, 0, 1.2));
  for (let i = 0; i < 3; i++) ds.add(box(1.6 - i * 0.3, 0.25, 0.6, M.gold, 0, 13.4 + i * 0.3));
  ds.position.set(0, 0, front + 6);
  root.add(part('Dhvajastambha', 'The gilded flagstaff that links earth and heaven. During the annual Brahmotsavam the festival flag is hoisted here to call the gods to attend.', ds));
  const bali = box(1.8, 1, 1.8, M.trim, 0, 0, front + 9);
  root.add(part('Balipitha', 'The altar of offerings, where devotees symbolically sacrifice their ego and desires before entering.', bali));

  if (t.shiva) {
    const s = tall ? 2.2 : 1.2;
    const nz = front + 16;
    const pav = new THREE.Group();
    [-1, 1].forEach((a) => [-1, 1].forEach((b) => pav.add(box(0.8, 7 * s * 0.6, 0.8, M.base, a * 3.2 * s * 0.7, 0.8, nz + b * 3.4 * s * 0.7))));
    pav.add(box(5.5 * s * 0.75, 0.6, 6 * s * 0.75, M.trim, 0, 0.2, nz));
    pav.add(box(6 * s * 0.75, 0.9, 6.5 * s * 0.75, M.base, 0, 0.8 + 7 * s * 0.6, nz));
    root.add(pav, nandi(ctx, s, 0, 0.8, nz, Math.PI));
  }

  const W = tall ? 130 : 110;
  const D = Math.max(tall ? 170 : 140, front + 60);
  const cz = (front - base) / 2 - 2;
  const gates = ['E'];
  if ((t.gopurams || 1) >= 2) gates.push('W');
  if ((t.gopurams || 1) >= 4) gates.push('N', 'S');
  const pk = prakara(ctx, W, D, gates, M.trim, 6, 1.6, 6);
  pk.position.z = cz;
  root.add(pk);
  const painted = !!t.painted;
  const gw = painted ? 28 : 20, gd = painted ? 13 : 10, gt = painted ? 9 : 5;
  const names = { E: 'East Gopuram (Raja Gopuram)', W: 'West Gopuram', N: 'North Gopuram', S: 'South Gopuram' };
  gates.forEach((gname) => {
    const gp = gopuram(ctx, { w: gw, d: gd, tiers: gt + (gname === 'S' && painted ? 1 : 0), painted, name: names[gname] });
    if (gname === 'E') gp.position.set(0, 0, cz + D / 2);
    if (gname === 'W') gp.position.set(0, 0, cz - D / 2);
    if (gname === 'N') { gp.position.set(-W / 2, 0, cz); gp.rotation.y = Math.PI / 2; }
    if (gname === 'S') { gp.position.set(W / 2, 0, cz); gp.rotation.y = Math.PI / 2; }
    root.add(gp);
  });

  if (t.tank) {
    const tg = new THREE.Group();
    const s = 26, x0 = -W / 2 + s / 2 + 8, z0 = cz + 10;
    for (let i = 0; i < 6; i++) {
      const k = s - i * 2, h = 0.4 * (6 - i);
      [[0, k / 2], [0, -k / 2]].forEach(([dx, dz]) => tg.add(box(k, h, 1, M.trim, x0 + dx, 0, z0 + dz)));
      [[k / 2, 0], [-k / 2, 0]].forEach(([dx, dz]) => tg.add(box(1, h, k, M.trim, x0 + dx, 0, z0 + dz)));
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(s - 11, s - 11), M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x0, 0.15, z0);
    tg.add(water);
    const lotus = new THREE.Group();
    lotus.add(cyl(0.15, 0.15, 2.6, 8, M.gold, 0, 0.15));
    for (let k = 0; k < 10; k++) {
      const p = shade(new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), M.gold));
      p.scale.set(0.45, 0.2, 1);
      const a = (k / 10) * Math.PI * 2;
      p.position.set(Math.sin(a) * 0.8, 2.9, Math.cos(a) * 0.8);
      p.rotation.y = a;
      p.rotation.x = -0.5;
      lotus.add(p);
    }
    lotus.position.set(x0, 0, z0);
    tg.add(lotus);
    root.add(part('Potramarai Kulam (Golden Lotus tank)', 'The sacred tank where, legend says, Indra bathed and found a golden lotus. Pilgrims walk its colonnade, and the Tamil Sangam poets once had their works judged here.', tg));
  }

  if (t.corridor) {
    const cw = W - 14, cd = D - 14;
    const outer = perimeter(cw, cd, 3, 0).map(([x, y, zz]) => [x, y, zz + cz]);
    const inner = perimeter(cw - 9, cd - 9, 3, 0).map(([x, y, zz]) => [x, y, zz + cz]);
    const g = new THREE.Group();
    g.add(...pillarField([...outer, ...inner], 6.5, 0.4, M.base, M.paint(0xd9b48f)));
    [[0, cd / 2 - 2.25, cw, 5.5], [0, -cd / 2 + 2.25, cw, 5.5]].forEach(([x, zz, ww, dd]) => g.add(box(ww + 1, 0.6, dd, M.trim, x, 6.5, zz + cz)));
    [[cw / 2 - 2.25, 0], [-cw / 2 + 2.25, 0]].forEach(([x]) => g.add(box(5.5, 0.6, cd, M.trim, x, 6.5, cz)));
    root.add(part('Third Prakaram corridor', 'India\'s longest temple corridor: about 1,200 m of colonnades with more than 1,200 carved granite pillars. Pilgrims bathe at 22 theerthams before darshan.', g));
  }

  for (let i = 0; i < 10; i++) {
    const x = (rnd() > 0.5 ? 1 : -1) * (W / 2 - 10 - rnd() * 14);
    const zz = cz + (rnd() - 0.5) * (D - 30);
    if (!t.tank || x > 0) root.add(tree(ctx, x, zz, 1 + rnd() * 0.4));
  }
  for (let i = 0; i < 20; i++) ctx.lamps.push(new THREE.Vector3(-aw / 2 + (i % 10) * (aw / 9), 1.45, base / 2 + 1.6 + Math.floor(i / 10) * ad));

  return {
    root, height: v.top, focus: new THREE.Vector3(0, v.top * 0.35, (front - base / 2) / 2), radius: Math.max(W, D) * 0.5,
    bounds: { w: W, d: D, cz }, gates,
    path: rectPath(0, (front - base / 2) / 2, Math.max(base, mw) / 2 + 3, (front + base / 2) / 2 + 3, 0),
    backdrop: t.sea ? 'sea' : site.elev > 600 ? 'hills' : null,
    ground: t.sea ? 0xcdb68e : 0x8f7e55,
    skipCourtyardWall: true,
  };
}

// ---------------------------------------------------------------- KALINGA

function pidhaRoof(ctx, half, tiers, tierH, mat, y) {
  const { M } = ctx;
  const g = new THREE.Group();
  let hb = half, yy = y;
  const per = Math.ceil(tiers / 2);
  for (let i = 0; i < tiers; i++) {
    const ht = hb * 0.9;
    g.add(sqFrustum(hb, ht, tierH * 0.75, mat, yy));
    g.add(box(ht * 1.9, tierH * 0.25, ht * 1.9, M.trim, 0, yy + tierH * 0.75));
    yy += tierH;
    hb = ht * 0.97;
    if ((i + 1) % per === 0 && i < tiers - 1) {
      g.add(box(hb * 1.4, tierH * 0.7, hb * 1.4, M.trim, 0, yy));
      yy += tierH * 0.7;
    }
  }
  const bell = lathe([V2(hb * 0.9, 0), V2(hb * 0.95, hb * 0.25), V2(hb * 0.6, hb * 0.6), V2(hb * 0.25, hb * 0.75), V2(0.01, hb * 0.8)], 20, mat);
  bell.position.y = yy;
  g.add(bell);
  const am = amalaka(hb * 0.45, M.trim);
  am.position.y = yy + hb * 0.72;
  g.add(am);
  g.add(kalasha(hb * 0.55, M.gold).translateY(yy + hb * 0.72 + hb * 0.28));
  return { group: g, top: yy + hb * 1.6 };
}

function chariotWheel(ctx, r, mat) {
  const g = new THREE.Group();
  const rim = shade(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.11, 8, 32), mat));
  g.add(rim);
  const hub = shade(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, r * 0.35, 16), mat));
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < 16; i++) {
    const sp = shade(new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? r * 0.06 : r * 0.13, r, r * 0.1), mat));
    sp.rotation.z = (i / 16) * Math.PI * 2;
    sp.position.set(Math.sin(-sp.rotation.z) * r * 0.5, Math.cos(sp.rotation.z) * r * 0.5, 0);
    g.add(sp);
  }
  return g;
}

function horse(ctx, s, mat) {
  const g = new THREE.Group();
  const body = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * s, 1.6 * s, 4, 10), mat));
  body.rotation.x = Math.PI / 2 - 0.35;
  body.position.y = 2.1 * s;
  const neck = box(0.5 * s, 1.5 * s, 0.6 * s, mat, 0, 2.3 * s, 1.15 * s);
  neck.rotation.x = 0.5;
  const head = box(0.42 * s, 0.5 * s, 1.0 * s, mat, 0, 3.55 * s, 1.75 * s);
  g.add(body, neck, head);
  [[-0.3, 0.7, 0.2], [0.3, 0.7, -0.3], [-0.3, -0.7, 0], [0.3, -0.7, 0]].forEach(([x, z, rx]) => {
    const l = box(0.22 * s, 1.6 * s, 0.22 * s, mat, x * s, 0, z * s);
    l.rotation.x = rx;
    g.add(l);
  });
  return g;
}

function buildKalinga(ctx) {
  const { site, M } = ctx;
  const t = site.temple;
  const H = t.height || 50;
  const root = new THREE.Group();
  const chariot = !!t.chariot;
  const plinthH = chariot ? 4.5 : 1.6;
  const half = chariot ? 11 : H * 0.17;
  const deulaH = chariot ? 0 : H;

  const deula = new THREE.Group();
  const badaH = chariot ? 13 : H * 0.26;
  deula.add(box(half * 2, badaH, half * 2, M.base, 0, plinthH));
  for (let f = 0; f < 4; f++) {
    const piv = new THREE.Group();
    piv.add(box(half * 0.7, badaH, 0.9, M.trim, 0, plinthH, half + 0.3));
    [-1, 1].forEach((s) => piv.add(box(half * 0.35, badaH, 0.5, M.trim, s * half * 0.68, plinthH, half + 0.15)));
    piv.rotation.y = (f * Math.PI) / 2;
    deula.add(piv);
  }
  let topY = plinthH + badaH;
  if (t.ruinedDeula) {
    for (let i = 0; i < 26; i++) {
      const s = 1 + ctx.rnd() * 2.2;
      const b = box(s, s * 0.6, s, M.trim, (ctx.rnd() - 0.5) * half * 1.6, topY - 0.2 + ctx.rnd() * 1.4, (ctx.rnd() - 0.5) * half * 1.6);
      b.rotation.y = ctx.rnd() * 3;
      deula.add(b);
    }
    root.add(part('Ruined deula', 'The main sanctum tower, once about 70 m tall, collapsed by the 19th century. Only its base and some of its sculpture remain.', deula));
  } else {
    const gH = deulaH - badaH - plinthH - half * 0.9;
    let gandi;
    if (t.beehive) {
      const pts = [];
      for (let i = 0; i <= 30; i++) {
        const s = (i / 30) * 0.95;
        pts.push(V2(half * 1.15 * Math.pow(1 - s * s, 0.55) + 0.05, s * gH));
      }
      const geo = new THREE.LatheGeometry(pts, 48);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const k = 1 + 0.07 * Math.abs(Math.cos(Math.atan2(z, x) * 8));
        p.setXYZ(i, x * k, p.getY(i), z * k);
      }
      geo.computeVertexNormals();
      gandi = shade(new THREE.Mesh(geo, M.base));
      gandi.position.y = topY;
      topY += gH * 0.95;
    } else {
      gandi = shade(new THREE.Mesh(nagaraShikharaGeo(half * 0.96, gH, { taper: 0.62, curve: 3.0 }), M.base));
      gandi.position.y = topY;
      topY += gH;
    }
    deula.add(gandi);
    root.add(part(t.beehive ? 'Nilachal shikhara' : 'Rekha Deula', t.beehive
      ? 'The beehive-shaped tower typical of Kamakhya\'s Nilachal style. Below it, the sanctum holds no idol, only a natural rock cleft fed by a spring.'
      : `The sanctum tower, rising about ${Math.round(H)} m. Its vertical ribs (pagas) sweep up into a curve, and inside sit the wooden deities of Jagannath, Balabhadra and Subhadra.`, deula));
    const am = amalaka(half * 0.55, M.trim);
    am.position.y = topY;
    const kal = kalasha(half * 0.5, t.gold ? M.gold : M.trim);
    kal.position.y = topY + half * 0.3;
    root.add(part('Amalaka & Kalasha', 'Ribbed crowning stone and sacred pot finial at the summit of the deula.', am, kal));
    topY += half * 0.8;
    if (t.chakra) {
      const ch = new THREE.Group();
      const R = H * 0.032;
      ch.add(shade(new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.12, 8, 32), M.copper)));
      for (let i = 0; i < 8; i++) {
        const sp = box(R * 0.12, R * 2, R * 0.1, M.copper, 0, -R, 0);
        const piv = new THREE.Group();
        piv.add(sp);
        piv.rotation.z = (i / 8) * Math.PI;
        ch.add(piv);
      }
      ch.position.y = topY + R;
      root.add(part('Nila Chakra', 'The eight-spoked "blue wheel" of ashtadhatu (an eight-metal alloy), about 3.5 m across. It is said to face you from wherever you stand in Puri.', ch));
      root.add(part('Patitapavana flag', 'Every evening a priest climbs the 65 m tower without a harness to change this flag. Unexplained by any rule of wind, it is said to fly against the breeze.', flag(ctx, 5, 2.4, M.saffron, 6, 0, topY + R * 2, 0)));
    } else {
      root.add(part('Flag', 'The temple banner is renewed daily by the sevayats (temple servants).', flag(ctx, 3.5, 1.8, M.paint(0xd62828), 5, 0, topY, 0)));
    }
  }

  let z = half + 1;
  const hallSpecs = chariot
    ? [{ half: 15, tiers: 6, tierH: 2.7, name: 'Jagamohana (audience hall)', desc: 'The surviving 39 m porch, sealed with sand in 1903 to stop it collapsing. Its three pidha tiers carry sculptures of musicians and dancers.' }]
    : [
      { half: half * 0.92, tiers: 6, tierH: H * 0.032, name: 'Jagamohana', desc: 'The "hall of the audience", topped by a stepped pyramidal pidha roof. Devotees view the deities from here.' },
      { half: half * 0.8, tiers: 4, tierH: H * 0.026, name: 'Natamandira', desc: 'The dance hall, where temple dancers (maharis) once performed Odissi for the deities.' },
      { half: half * 0.68, tiers: 3, tierH: H * 0.024, name: 'Bhoga Mandapa', desc: 'The hall of offerings. The temple kitchen, among the largest in the world, cooks Mahaprasad in clay pots over wood fires for tens of thousands daily.' },
    ].slice(0, t.halls || 1);
  hallSpecs.forEach((h) => {
    const g = new THREE.Group();
    const bodyH = h.half * (chariot ? 1.0 : 0.85);
    const cz = z + h.half;
    g.add(box(h.half * 2, bodyH, h.half * 2, M.base, 0, plinthH, cz));
    g.add(box(3, bodyH * 0.55, 0.4, M.door, 0, plinthH, cz + h.half + 0.1));
    const roof = pidhaRoof(ctx, h.half * 1.02, h.tiers, h.tierH, M.base, plinthH + bodyH);
    roof.group.position.z = cz;
    g.add(roof.group);
    if (chariot) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const fig = box(0.9, 2.4, 0.9, M.trim, Math.cos(a) * h.half * 0.72, plinthH + bodyH + h.tierH * 2.2, cz + Math.sin(a) * h.half * 0.72);
        g.add(fig);
      }
    }
    root.add(part(h.name, h.desc, g));
    z += h.half * 2 + 0.5;
  });
  const front = z;
  const back = -half - (chariot ? 2 : 3);
  const plL = front - back + 2, plW = Math.max(half * 2, (hallSpecs[0]?.half || half) * 2) + (chariot ? 3 : 6);
  const plCz = (front + back) / 2;
  const plinth = new THREE.Group();
  plinth.add(box(plW, plinthH, plL, M.trim, 0, 0, plCz));
  for (let i = 0; i < 6; i++) plinth.add(box(8, ((i + 1) * plinthH) / 6, 1, M.trim, 0, 0, front + 1 + (6 - i) - 0.5));
  root.add(part(chariot ? 'Chariot plinth' : 'Pitha (platform)', chariot
    ? 'The whole temple is built as Surya\'s chariot. Its plinth is carved with elephants, dancers and scenes of daily life from 13th-century Odisha.'
    : 'Raised platform carrying the temple axis from sanctum to offering hall.', plinth));

  if (chariot) {
    const wheels = new THREE.Group();
    const n = 12;
    for (let i = 0; i < n; i++) {
      const zz = back + 2.5 + (i * (plL - 6)) / (n - 1);
      [-1, 1].forEach((s) => {
        const w = chariotWheel(ctx, 1.55, M.trim);
        w.rotation.y = Math.PI / 2;
        w.position.set(s * (plW / 2 + 0.25), 1.7, zz);
        wheels.add(w);
      });
    }
    root.add(part('24 Sundial wheels', 'Twenty-four carved wheels about 3 m across, one for each fortnight of the year. The shadow of a spoke on the wheel tells the time of day to within minutes.', wheels));
    const horses = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const hz = horse(ctx, 1.15, M.trim);
      hz.position.set(-7.5 + i * 2.5, 0, front + 10 + (i % 2) * 1.5);
      horses.add(hz);
    }
    root.add(part('Seven horses of Surya', 'Seven horses pull the Sun god\'s chariot. They stand for the seven days of the week and the seven colours of light.', horses));
  }

  for (let i = 0; i < 28; i++) ctx.lamps.push(rectPath(0, plCz, plW / 2 - 0.3, plL / 2 - 0.3, plinthH + 0.1)(i / 28, 0));
  ctx.lights.push(new THREE.Vector3(0, plinthH + 2, front - 1));
  const W = Math.max(110, plW + 60), D = plL + 70;
  return {
    root, height: Math.max(topY, plinthH + 30), focus: new THREE.Vector3(0, Math.max(topY, 30) * 0.35, plCz), radius: Math.max(plL, topY) * 0.95,
    bounds: { w: W, d: D, cz: plCz }, gates: ['E'],
    path: rectPath(0, plCz, plW / 2 + 3.5, plL / 2 + 3.5, 0),
    backdrop: t.sea ? 'sea' : null,
    ground: t.sea ? 0xd4bf98 : 0x84835a,
  };
}

// ---------------------------------------------------------------- GURUDWARA

function chhatri(ctx, r, h, mat, domeMat, x, y, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    g.add(cyl(r * 0.08, r * 0.08, h, 6, mat, Math.cos(a) * r * 0.75, 0, Math.sin(a) * r * 0.75));
  }
  g.add(box(r * 1.9, r * 0.18, r * 1.9, mat, 0, h));
  g.add(onion(r * 0.85, r * 1.5, domeMat, h + r * 0.18));
  g.position.set(x, y, z);
  return g;
}

function onion(r, h, mat, y = 0, fluted = 0) {
  const pts = [V2(r * 0.85, 0), V2(r * 1.0, h * 0.18), V2(r * 1.05, h * 0.35), V2(r * 0.9, h * 0.55), V2(r * 0.55, h * 0.75), V2(r * 0.18, h * 0.9), V2(r * 0.08, h), V2(0.01, h * 1.05)];
  const geo = new THREE.LatheGeometry(pts, 40);
  if (fluted) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const k = 1 + fluted * Math.abs(Math.cos(Math.atan2(z, x) * 8));
      p.setXYZ(i, x * k, p.getY(i), z * k);
    }
  }
  geo.computeVertexNormals();
  const m = shade(new THREE.Mesh(geo, mat));
  m.position.y = y;
  return m;
}

function buildGurudwara(ctx) {
  const { M, rnd } = ctx;
  const root = new THREE.Group();
  const S = 150, deck = 0.6, walkW = 26;

  const water = new THREE.Mesh(new THREE.PlaneGeometry(S, S), M.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.2;
  const rimG = new THREE.Group();
  [[0, S / 2 + walkW / 2, S + walkW * 2, walkW], [0, -S / 2 - walkW / 2, S + walkW * 2, walkW]].forEach(([x, z, w, d]) => rimG.add(box(w, deck, d, M.checker, x, 0, z)));
  [[S / 2 + walkW / 2, 0], [-S / 2 - walkW / 2, 0]].forEach(([x]) => rimG.add(box(walkW, deck, S, M.checker, x, 0, 0)));
  root.add(part('Amrit Sarovar', 'The "pool of nectar" dug by Guru Ram Das in 1577; the city of Amritsar takes its name from it. Pilgrims bathe here and fish glide among the reflections of gold.', water));
  root.add(part('Parikrama', 'The marble walkway around the sarovar. Pilgrims walk it barefoot and clockwise, many reciting Gurbani, at every hour of the day and night.', rimG));

  const plat = box(26, 1.2, 26, M.marble, 0, -0.4, 0);
  const lower = box(18, 4, 18, M.marbleArches, 0, 0.8);
  const goldStorey = box(18.4, 4.6, 18.4, M.gold, 0, 4.8);
  const parapet = box(19.2, 0.9, 19.2, M.gold, 0, 9.4);
  const upper = box(11, 5, 11, M.gold, 0, 10.3);
  const corners = [];
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => corners.push(chhatri(ctx, 1.4, 2.6, M.gold, M.gold, a * 8.2, 10.3, b * 8.2))));
  const dm = onion(5.6, 8.5, M.gold, 15.3, 0.06);
  const petals = new THREE.Group();
  for (let k = 0; k < 16; k++) {
    const p = shade(new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), M.gold));
    const a = (k / 16) * Math.PI * 2;
    p.scale.set(0.45, 0.9, 0.25);
    p.position.set(Math.sin(a) * 5.2, 15.8, Math.cos(a) * 5.2);
    p.rotation.y = a;
    p.rotation.x = 0.35;
    petals.add(p);
  }
  const fin = kalasha(2.6, M.gold);
  fin.position.y = 24;
  const umb = shade(new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 16), M.gold));
  umb.position.y = 26.9;
  ctx.lights.push(new THREE.Vector3(0, 3, 10), new THREE.Vector3(0, 3, -10));
  for (let i = 0; i < 32; i++) ctx.lamps.push(rectPath(0, 0, 12.6, 12.6, 0.85)(i / 32, 0));
  root.add(part('Harmandir Sahib (Darbar Sahib)', 'The sanctum where the Guru Granth Sahib is installed each morning. The lower storey is white marble with pietra dura inlay. Maharaja Ranjit Singh had the upper storeys covered in gilded copper in the 1830s.', plat, lower, goldStorey, parapet, upper, corners));
  root.add(part('Inverted-lotus dome', 'The gilded fluted dome shaped like an inverted lotus: living in the world while staying unstained by it, as the lotus rises clean from muddy water.', dm, petals, fin, umb));

  const causeway = new THREE.Group();
  const cL = S / 2 - 13;
  causeway.add(box(7, deck + 0.4, cL, M.marble, 0, -0.4, 13 + cL / 2));
  for (let i = 0; i <= 10; i++) {
    const zz = 13 + (i * cL) / 10;
    [-1, 1].forEach((s) => {
      causeway.add(cyl(0.1, 0.12, 3.2, 8, M.gold, s * 3.2, deck, zz));
      ctx.lamps.push(new THREE.Vector3(s * 3.2, deck + 3.35, zz));
    });
  }
  root.add(part('Guru\'s Bridge', 'A 60 m marble causeway from the Darshani Deori to the sanctum, lined with gilded lamps. It symbolises the soul\'s journey after death.', causeway));

  const gz = S / 2 + 7;
  const dd = new THREE.Group();
  dd.add(box(26, 9, 12, M.marbleArches, 0, deck, gz));
  dd.add(box(26.5, 3.5, 12.5, M.gold, 0, deck + 9, gz));
  dd.add(onion(3.2, 5, M.gold, deck + 12.5).translateZ(gz));
  [-1, 1].forEach((s) => dd.add(chhatri(ctx, 1.2, 2.2, M.gold, M.gold, s * 11, deck + 12.5, gz)));
  root.add(part('Darshani Deori', 'The ornate gateway onto the causeway, with silver doors. It is the first darshan of the Harmandir as pilgrims enter.', dd));

  const at = new THREE.Group();
  const az = S / 2 + walkW;
  for (let i = 0; i < 5; i++) at.add(box(28 - i * 1.5, 4, 16 - i, i < 3 ? M.marbleArches : M.gold, 0, deck + i * 4, az));
  at.add(onion(4.5, 7, M.gold, deck + 20).translateZ(az));
  root.add(part('Akal Takht', 'The "Throne of the Timeless One", founded by Guru Hargobind in 1606 and the highest seat of Sikh temporal authority. It faces the Harmandir.', at));

  const ns = [];
  [18, 23].forEach((x, i) => ns.push(flag(ctx, 5, 2.6, M.saffron, 30 + i * 2, x, deck, az - 11)));
  root.add(part('Nishan Sahibs', 'Twin saffron flags for miri and piri, temporal and spiritual sovereignty, the two swords of Guru Hargobind.', ns));

  const bldg = new THREE.Group();
  const outer = S / 2 + walkW;
  [[0, -outer - 6, S + walkW * 2 + 24, 12], [0, outer + 6, S + walkW * 2 + 24, 12]].forEach(([x, z, w, d], i) => {
    if (i === 1) {
      bldg.add(box((w - 30) / 2, 10, d, M.marbleArches, -w / 2 + (w - 30) / 4, 0, z));
      bldg.add(box((w - 30) / 2, 10, d, M.marbleArches, w / 2 - (w - 30) / 4, 0, z));
    } else bldg.add(box(w, 10, d, M.marbleArches, x, 0, z));
  });
  [[outer + 6, 0], [-outer - 6, 0]].forEach(([x]) => {
    const b = box(S + walkW * 2, 10, 12, M.marbleArches, x, 0, 0);
    b.rotation.y = Math.PI / 2;
    bldg.add(b);
  });
  perimeter(S + walkW * 2 + 12, S + walkW * 2 + 12, 22, 10).forEach(([x, y, z]) => bldg.add(chhatri(ctx, 1, 1.8, M.marble, M.gold, x, y, z)));
  root.add(part('Bungas & Langar halls', 'The buildings around the parikrama hold rest houses, the museum and the Guru Ram Das Langar, which serves free meals to over 50,000 people a day, all seated together on the floor.', bldg));

  const ber = tree(ctx, -S / 2 - 12, -S / 2 - 10, 1.4);
  root.add(part('Dukh Bhanjani Ber', 'The jujube tree beside which, the story goes, a disabled man was healed after dipping in the pool. Pilgrims still bathe at the spot.', ber));
  ctx.lights.push(new THREE.Vector3(0, deck + 4, gz - 8));

  return {
    root, height: 27, focus: new THREE.Vector3(0, 8, 8), radius: 120,
    bounds: { w: S + walkW * 2, d: S + walkW * 2, cz: 0, floorY: deck },
    path: rectPath(0, 0, S / 2 + walkW / 2, S / 2 + walkW / 2, deck),
    walkStart: new THREE.Vector3(32, deck, S / 2 + 12),
    noWall: true, noCourtyard: true,
    ground: 0x8e8a6a,
  };
}

// ---------------------------------------------------------------- DARGAH

function buildDargah(ctx) {
  const { M } = ctx;
  const root = new THREE.Group();
  const tomb = new THREE.Group();
  tomb.add(box(20, 1.2, 20, M.marble));
  tomb.add(box(16, 9, 16, M.marbleArches, 0, 1.2));
  tomb.add(box(16.8, 0.7, 16.8, M.marble, 0, 10.2));
  perimeter(16, 16, 2, 10.9).forEach(([x, y, z]) => tomb.add(box(0.5, 0.9, 0.5, M.marble, x, y, z)));
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => tomb.add(chhatri(ctx, 1.4, 2.6, M.marble, M.marble, a * 7.2, 10.9, b * 7.2))));
  tomb.add(cyl(5.2, 5.4, 2.4, 32, M.marble, 0, 10.9));
  ctx.lights.push(new THREE.Vector3(0, 3, 10));
  root.add(part('Mazar Sharif', 'The tomb of Khwaja Moinuddin Chishti (1141–1236), "Gharib Nawaz", the benefactor of the poor. Devotees of every faith offer chadars of flowers and cloth.', tomb));
  const dm = onion(5.4, 10, M.marble, 13.3);
  const crown = kalasha(3, M.gold);
  crown.position.y = 23.5;
  root.add(part('Dome & golden crown', 'The white marble dome with its gilded crown, added under Nawab Haider Ali Khan of Rampur. It catches the sunrise first in the old city.', dm, crown));

  const gz = 48;
  const gate = new THREE.Group();
  const archShape = (outerW, outerH, inW, spring, apex) => {
    const s = new THREE.Shape();
    s.moveTo(-outerW, 0);
    s.lineTo(-inW, 0);
    s.lineTo(-inW, spring);
    s.quadraticCurveTo(-inW, spring + (apex - spring) * 0.7, 0, apex);
    s.quadraticCurveTo(inW, spring + (apex - spring) * 0.7, inW, spring);
    s.lineTo(inW, 0);
    s.lineTo(outerW, 0);
    if (outerH) {
      s.lineTo(outerW, outerH);
      s.lineTo(-outerW, outerH);
    } else {
      s.lineTo(outerW, spring + 2);
      s.quadraticCurveTo(outerW, apex + 1, 0, apex + 3.5);
      s.quadraticCurveTo(-outerW, apex + 1, -outerW, spring + 2);
    }
    s.lineTo(-outerW, 0);
    return s;
  };
  const gateGeo = new THREE.ExtrudeGeometry(archShape(13, 26, 4.5, 11, 19), { depth: 8, bevelEnabled: false });
  gateGeo.translate(0, 0, gz - 4);
  gate.add(shade(new THREE.Mesh(gateGeo, M.paint(0xeee6d4))));
  const frameGeo = new THREE.ExtrudeGeometry(archShape(7, 0, 4.5, 11, 19), { depth: 0.3, bevelEnabled: false });
  frameGeo.translate(0, 0, gz + 4);
  gate.add(shade(new THREE.Mesh(frameGeo, M.paint(0xc9a46a))));
  gate.add(box(26.6, 1.2, 8.6, M.paint(0xc9a46a), 0, 26, gz));
  perimeter(26, 8, 2.2, 27.2).forEach(([x, y, z]) => gate.add(box(0.6, 1, 0.6, M.paint(0xeee6d4), x, y, z + gz)));
  [-1, 1].forEach((s) => {
    gate.add(cyl(1.4, 1.6, 6, 12, M.paint(0xe9e2d0), s * 10, 26, gz));
    gate.add(dome(1.6, M.gold, { y: 32, x: s * 10, z: gz }));
  });
  root.add(part('Buland Darwaza', 'The 85-foot main gate built by Sultan Mahmud Khilji. Flags are raised on it to begin the Urs festival marking the saint\'s death anniversary.', gate));

  const degs = new THREE.Group();
  [[-16, 22, 1.6], [16, 22, 1.2]].forEach(([x, z, s]) => {
    const hearth = box(5 * s, 1.6, 5 * s, M.paint(0x8a4b2a), x, 0, z);
    const pot = lathe([V2(0.01, 0), V2(1.4 * s, 0.1), V2(2.1 * s, 1.0 * s), V2(2.0 * s, 2.0 * s), V2(1.7 * s, 2.4 * s), V2(1.85 * s, 2.55 * s)], 28, M.iron);
    pot.position.set(x, 1.6, z);
    degs.add(hearth, pot);
  });
  root.add(part('Degs (giant cauldrons)', 'Two enormous cauldrons gifted by Akbar and Jahangir. The bigger one cooks about 4,800 kg of sweet rice (tabarruk) at a time, shared with everyone as blessed food.', degs));

  const masjid = new THREE.Group();
  masjid.add(box(34, 9, 10, M.marbleArches, -30, 0, -10));
  [-40, -30, -20].forEach((x) => masjid.add(dome(3.4, M.marble, { x, y: 9, z: -10 })));
  [-48, -12].forEach((x) => {
    masjid.add(cyl(0.9, 1.1, 18, 12, M.marble, x, 0, -10));
    masjid.add(dome(1.2, M.gold, { x, y: 18, z: -10 }));
  });
  masjid.position.x = 0;
  root.add(part('Akbari Masjid', 'Mosque built by Emperor Akbar, who walked barefoot from Agra to Ajmer to give thanks for the birth of his son Jahangir.', masjid));
  for (let i = 0; i < 24; i++) ctx.lamps.push(rectPath(0, 0, 9.6, 9.6, 1.25)(i / 24, 0));
  const W = 120, D = 120;
  return {
    root, height: 26, focus: new THREE.Vector3(0, 9, 8), radius: 70,
    bounds: { w: W, d: D, cz: 4 }, gates: ['E'],
    path: rectPath(0, 0, 12, 12, 0),
    ground: 0x9b8461,
    gateOffset: gz,
  };
}

// ---------------------------------------------------------------- MAHABODHI

function brickTower(ctx, half, h, mat, trimMat) {
  const g = new THREE.Group();
  const N = 11;
  let y = 0;
  for (let i = 0; i < N; i++) {
    const hb = half * (1 - 0.62 * (i / N)), ht = half * (1 - 0.62 * ((i + 1) / N));
    const th = h / N;
    g.add(sqFrustum(hb, ht, th * 0.85, mat, y));
    g.add(sqFrustum(ht * 1.06, ht * 1.02, th * 0.15, trimMat, y + th * 0.85));
    y += th;
  }
  return { group: g, topHalf: half * 0.38, top: y };
}

function buildMahabodhi(ctx) {
  const { M, rnd } = ctx;
  const root = new THREE.Group();
  const brick = M.stone(0xd4ad7c, 3);
  const trim = M.stone(0xb08e64, 3);
  const plinth = new THREE.Group();
  plinth.add(box(30, 2.4, 30, trim));
  plinth.add(box(18, 9, 18, brick, 0, 2.4));
  plinth.add(box(4, 6, 1, M.door, 0, 2.4, 9.1));
  ctx.lights.push(new THREE.Vector3(0, 4, 11));
  root.add(part('Sanctum & gilded Buddha', 'Inside sits a 10th-century gilded Buddha in the bhumisparsha mudra, touching the earth to witness his enlightenment.', plinth));

  const main = brickTower(ctx, 8, 40, brick, trim);
  main.group.position.y = 11.4;
  const am = amalaka(main.topHalf * 1.1, trim);
  am.position.y = 11.4 + main.top;
  const st = new THREE.Group();
  st.add(dome(1.8, trim, { y: 11.4 + main.top + 1 }));
  for (let i = 0; i < 4; i++) st.add(cyl(1.4 - i * 0.3, 1.4 - i * 0.3, 0.25, 16, M.gold, 0, 11.4 + main.top + 2.8 + i * 0.7));
  st.add(cyl(0.08, 0.15, 3, 8, M.gold, 0, 11.4 + main.top + 5.6));
  root.add(part('Mahabodhi tower', 'The 55 m pyramidal tower, one of the oldest brick temples in India. The first shrine was built by Emperor Ashoka around 260 BCE, and the present form dates from the 5th–6th centuries.', main.group));
  root.add(part('Amalaka & chhatra', 'A ribbed amalaka topped by a small stupa and stacked parasols (chhatras), Buddhist emblems of honour and protection.', am, st));

  const corners = [];
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => {
    const t = brickTower(ctx, 2.6, 13, brick, trim);
    t.group.position.set(a * 11.5, 2.4, b * 11.5);
    corners.push(t.group);
    const k = amalaka(1.1, trim);
    k.position.set(a * 11.5, 15.4, b * 11.5);
    corners.push(k);
  }));
  root.add(part('Corner towers', 'Four smaller replicas of the main tower at the corners of the plinth, a pattern later copied in temples across Asia.', corners));

  const tg = tree(ctx, 0, -32, 2.3, new THREE.MeshStandardMaterial({ color: 0x4b8a2f, roughness: 0.85, flatShading: true }));
  root.add(part('Bodhi tree', 'A descendant of the sacred fig under which Siddhartha Gautama attained enlightenment about 2,600 years ago. Pilgrims meditate in its shade and treasure its fallen heart-shaped leaves.', tg));
  const vaj = new THREE.Group();
  vaj.add(box(4.4, 0.8, 2.8, M.paint(0x9b3d2b), 0, 0, -24));
  perimeter(7, 5, 0.9, 0).forEach(([x, y, z]) => vaj.add(box(0.25, 1.4, 0.25, trim, x, y, z - 24)));
  root.add(part('Vajrasana (Diamond Throne)', 'The red sandstone slab placed by Ashoka to mark the exact spot where the Buddha sat. Ancient texts call it the navel of the Earth.', vaj));

  const flags = [];
  const fcolors = ['#2b6cff', '#ffffff', '#e63946', '#2a9d8f', '#ffd166'];
  for (let line = 0; line < 6; line++) {
    const a = (line / 6) * Math.PI * 2;
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      flags.push({ m: mat4(Math.cos(a) * t * 14, 9 - t * 7 + Math.sin(t * Math.PI) * -1.5, -32 + Math.sin(a) * t * 14, 0.7, 0.9, 0.05, -a), c: fcolors[i % 5] });
    }
  }
  const fgeo = new THREE.BoxGeometry(1, 1, 1);
  const fm = instanced(fgeo, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), flags.map((f) => f.m), flags.map((f) => f.c));
  fm.userData.noCollide = true;
  root.add(part('Prayer flags', 'Coloured flags strung from the Bodhi tree by Tibetan and Himalayan pilgrims. The wind carries their printed mantras across the world.', fm));

  const rail = [];
  perimeter(44, 44, 1.2, 0).forEach(([x, y, z]) => rail.push(mat4(x, y, z)));
  const rg = new THREE.BoxGeometry(0.35, 1.8, 0.35);
  rg.translate(0, 0.9, 0);
  const railing = new THREE.Group();
  railing.add(instanced(rg, trim, rail));
  [[0, 22, 44, 0.3], [0, -22, 44, 0.3]].forEach(([x, z, w, d]) => [0.5, 1.3].forEach((y) => railing.add(box(w, 0.25, d + 0.1, trim, x, y, z))));
  [[22, 0], [-22, 0]].forEach(([x]) => [0.5, 1.3].forEach((y) => railing.add(box(0.4, 0.25, 44, trim, x, y, 0))));
  root.add(part('Stone railing (vedika)', 'Carved railings around the temple, parts of which date to the Shunga period (~150 BCE). They show lotuses, yakshis and early scenes of the Buddha\'s life.', railing));

  const stupas = [];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 26 + rnd() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z < -20 && Math.abs(x) < 16) continue;
    if (Math.abs(x - 42) < 13 && Math.abs(z - 8) < 13) continue;
    const s = 0.6 + rnd() * 0.8;
    const g = new THREE.Group();
    g.add(box(2 * s, 0.8 * s, 2 * s, trim));
    g.add(dome(0.95 * s, brick, { y: 0.8 * s }));
    g.add(cyl(0.12 * s, 0.12 * s, 1.4 * s, 6, trim, 0, 1.7 * s));
    g.position.set(x, 0, z);
    stupas.push(g);
  }
  root.add(part('Votive stupas', 'Hundreds of small stupas offered by pilgrims and kings over 2,000 years, each a reminder of the Buddha\'s presence.', stupas));

  const pond = new THREE.Group();
  const px = 42, pz = 8;
  pond.add(box(22, 0.5, 22, trim, px, 0, pz));
  const w = new THREE.Mesh(new THREE.PlaneGeometry(19, 19), M.water);
  w.rotation.x = -Math.PI / 2;
  w.position.set(px, 0.52, pz);
  pond.add(w);
  const buddha = new THREE.Group();
  buddha.add(cyl(1.2, 1.4, 1.2, 16, trim));
  const body = shade(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M.gold));
  body.scale.set(1, 1.3, 0.8);
  body.position.y = 2.2;
  const head = shade(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), M.gold));
  head.position.y = 3.75;
  const hood = shade(new THREE.Mesh(new THREE.SphereGeometry(2, 16, 10, 0, Math.PI, 0, Math.PI / 2), M.black));
  hood.rotation.x = -Math.PI / 2;
  hood.position.set(0, 3.4, -0.6);
  buddha.add(body, head, hood);
  buddha.position.set(px, 0.5, pz);
  pond.add(buddha);
  root.add(part('Muchalinda Lotus Pond', 'Where the serpent king Muchalinda raised his hood over the meditating Buddha to shelter him from a week-long storm.', pond));
  for (let i = 0; i < 40; i++) ctx.lamps.push(rectPath(0, 0, 14.6, 14.6, 2.45)(i / 40, 0));

  return {
    root, height: 58, focus: new THREE.Vector3(0, 18, -4), radius: 75,
    bounds: { w: 120, d: 120, cz: -4 }, gates: ['E'],
    path: rectPath(0, 0, 18, 18, 0),
    ground: 0x8d8a55,
    robes: ['#8b1e1e', '#ff8c1a', '#b5342c', '#ffffff', '#ffd166', '#7a1f1f'],
  };
}

// ---------------------------------------------------------------- entry

const BUILDERS = { nagara: buildNagara, dravida: buildDravida, kalinga: buildKalinga, gurudwara: buildGurudwara, dargah: buildDargah, mahabodhi: buildMahabodhi };

export function buildTemple(site) {
  const t = site.temple;
  const ctx = {
    site, rnd: seeded(site.id),
    M: makeMats(t.palette || ({ dravida: 'granite', kalinga: 'sandstone' }[t.style] || 'sandstone')),
    animators: [], lamps: [], lights: [],
  };
  const res = (BUILDERS[t.style] || buildNagara)(ctx);
  const scene = new THREE.Group();
  scene.add(res.root);
  scene.add(groundPlane(ctx, res.ground ?? 0x8b8153));
  const { w, d, cz } = res.bounds;
  if (!res.noCourtyard) {
    const c = courtyard(ctx, w, d);
    c.position.z = cz;
    scene.add(c);
  }
  if (!res.noWall && !res.skipCourtyardWall) {
    const pk = prakara(ctx, w, d, res.gates || ['E'], ctx.M.trim);
    pk.position.z = cz;
    res.root.add(pk);
    const trees = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + ctx.rnd() * 0.3;
      const r = Math.max(w, d) / 2 + 14 + ctx.rnd() * 30;
      trees.add(tree(ctx, Math.cos(a) * r, cz + Math.sin(a) * r, 1 + ctx.rnd() * 0.6));
    }
    scene.add(trees);
  }
  if (res.backdrop === 'himalaya')
    scene.add(part('Himalaya', `The shrine sits at about ${site.elev.toLocaleString()} m among Himalayan peaks. Pilgrims trek for hours or days to reach it, and high shrines close under snow each winter.`, backdrop(ctx, 'himalaya')));
  else if (res.backdrop) scene.add(backdrop(ctx, res.backdrop));
  res.root.add(devotees(ctx, t.style === 'gurudwara' ? 160 : 90, res.path, res.robes));

  const lampGeo = new THREE.SphereGeometry(0.11, 8, 6);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8a1a, emissiveIntensity: 0.6 });
  const lampMesh = new THREE.InstancedMesh(lampGeo, lampMat, ctx.lamps.length);
  ctx.lamps.forEach((p, i) => lampMesh.setMatrixAt(i, mat4(p.x, p.y + 0.11, p.z)));
  lampMesh.userData.noCollide = true;
  const lampCopy = (RITUALS[site.tradition] || RITUALS.Hindu).lamps;
  res.root.add(part(lampCopy[0], lampCopy[1], lampMesh));

  scene.traverse((o) => {
    if (!o.userData.part) return;
    const cache = new Map();
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.userData.partRoot = o;
      const clone = (mt) => cache.get(mt) || (cache.set(mt, mt.clone()), cache.get(mt));
      m.material = Array.isArray(m.material) ? m.material.map(clone) : clone(m.material);
    });
  });

  return {
    object: scene, root: res.root,
    focus: res.focus, radius: res.radius, height: res.height,
    bounds: { ...res.bounds, floorY: res.bounds.floorY ?? 0 },
    walkStart: res.walkStart || new THREE.Vector3(0, 0, cz + d / 2 - 6),
    animators: ctx.animators, lampMesh, lightAnchors: ctx.lights.slice(0, 4),
    waterTex: waterNormalTex(),
    backdrop: res.backdrop,
    styleLabel: STYLE_LABELS[t.style] || '',
  };
}
