import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildTemple } from './templeBuilders.js';
import { TRADITIONS } from './sites.js';

const TIMES = {
  day: { label: '☀ Day', elev: 48, az: 135, sun: 3.2, sunColor: 0xfff0dc, hemi: 0.75, exposure: 0.5, lamps: 0.6, point: 0, stars: false, fog: 0xd9d6c8 },
  dusk: { label: '🌇 Dusk', elev: 3, az: 250, sun: 1.6, sunColor: 0xffa860, hemi: 0.32, exposure: 0.62, lamps: 3, point: 220, stars: false, fog: 0xd59a74 },
  night: { label: '🌙 Night', elev: -9, az: 250, sun: 0.7, sunColor: 0x9db4ff, hemi: 0.2, exposure: 0.85, lamps: 9, point: 700, stars: true, fog: 0x0a0f1c },
};
const ORDER = ['day', 'dusk', 'night'];

export class TempleViewer {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.3, 9000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 900;

    this.sky = new Sky();
    this.sky.scale.setScalar(20000);
    this.scene.add(this.sky);
    this.envScene = new THREE.Scene();
    const envSky = new Sky();
    envSky.scale.setScalar(20000);
    envSky.material = this.sky.material;
    this.envGround = new THREE.Mesh(new THREE.CircleGeometry(5000, 32), new THREE.MeshBasicMaterial({ color: 0x7a6447 }));
    this.envGround.rotation.x = -Math.PI / 2;
    this.envGround.position.y = -2;
    this.envScene.add(envSky, this.envGround);
    this.pmrem = new THREE.PMREMGenerator(r);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xd6e6ff, 0x6b5a45, 0.7);
    this.scene.add(this.hemi);
    this.scene.fog = new THREE.Fog(0xc9d6e2, 300, 2600);

    const starGeo = new THREE.BufferGeometry();
    const sp = [];
    for (let i = 0; i < 2500; i++) {
      const v = new THREE.Vector3().randomDirection();
      if (v.y < 0.05) v.y = Math.abs(v.y) + 0.05;
      v.multiplyScalar(8000);
      sp.push(v.x, v.y, v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
    this.scene.add(this.stars);

    this.pointLights = [0, 1, 2, 3].map(() => {
      const l = new THREE.PointLight(0xff9a3c, 0, 60, 2);
      this.scene.add(l);
      return l;
    });

    this.petals = this.makePetals();
    this.scene.add(this.petals.mesh);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;
    this.selected = null;
    this.tween = null;
    this.mode = 'orbit';
    this.keys = new Set();
    this.timeIdx = 0;
    this.clock = new THREE.Clock();

    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('keydown', (e) => this.isOpen && this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.isOpen && this.onKey(e, false));
    window.addEventListener('resize', () => this.isOpen && this.resize());
    this.controls.addEventListener('start', () => {
      if (this.mode === 'pradakshina') this.setMode('orbit');
      this.tween = null;
    });

    ui.pradakshina.onclick = () => this.setMode(this.mode === 'pradakshina' ? 'orbit' : 'pradakshina');
    ui.walk.onclick = () => this.setMode(this.mode === 'walk' ? 'orbit' : 'walk');
    ui.aarti.onclick = () => this.aarti();
    ui.time.onclick = () => this.setTime(ORDER[(this.timeIdx + 1) % 3]);
    ui.reset.onclick = () => { this.setMode('orbit'); this.resetView(true); };
  }

  open(site) {
    this.isOpen = true;
    if (this.temple) {
      this.scene.remove(this.temple.object);
      this.temple.object.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.dispose());
      });
    }
    this.site = site;
    this.temple = buildTemple(site);
    this.scene.add(this.temple.object);
    this.collidables = [];
    this.temple.object.traverse((o) => {
      if (o.isMesh && !o.userData.noCollide && !o.parent?.userData.noCollide) this.collidables.push(o);
    });

    const tr = TRADITIONS[site.tradition];
    this.ui.tradition.textContent = site.tradition;
    this.ui.tradition.style.background = tr.color;
    this.ui.name.textContent = site.name;
    this.ui.style.textContent = this.temple.styleLabel;
    this.showPart(null);

    const ext = Math.max(this.temple.bounds.w, this.temple.bounds.d);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -ext * 0.62;
    s.right = s.top = ext * 0.62;
    s.near = 1;
    s.far = 400 + ext * 1.5;
    s.updateProjectionMatrix();
    this.scene.fog.near = ext * 3;
    this.scene.fog.far = this.temple.backdrop === 'himalaya' ? 5000 : 3600;

    this.temple.lightAnchors.forEach((p, i) => this.pointLights[i].position.copy(p).add(new THREE.Vector3(0, 0.6, 0)));
    this.pointLights.forEach((l, i) => (l.visible = i < this.temple.lightAnchors.length));

    this.setMode('orbit');
    this.setTime(ORDER[this.timeIdx]);
    this.resize();
    this.resetView(false);
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  close() {
    this.isOpen = false;
    this.renderer.setAnimationLoop(null);
    this.setMode('orbit');
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  resetView(animate) {
    const { focus, radius } = this.temple;
    const pos = focus.clone().add(new THREE.Vector3(radius * 1.05, radius * 0.62, radius * 1.3));
    if (animate) this.flyTo(pos, focus);
    else {
      this.camera.position.copy(pos);
      this.controls.target.copy(focus);
      this.controls.update();
    }
  }

  flyTo(pos, target, dur = 1.2) {
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, s: 0, dur };
  }

  setTime(key) {
    const T = TIMES[key];
    this.timeIdx = ORDER.indexOf(key);
    this.ui.time.textContent = T.label;
    const u = this.sky.material.uniforms;
    u.turbidity.value = key === 'day' ? 5 : 9;
    u.rayleigh.value = key === 'night' ? 0.25 : key === 'dusk' ? 2.6 : 1.4;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.82;
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T.elev), THREE.MathUtils.degToRad(T.az));
    u.sunPosition.value.copy(sunDir);
    const lightDir = key === 'night' ? new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(60)) : sunDir.clone();
    if (key === 'dusk') lightDir.y = Math.max(lightDir.y, 0.12);
    const c = this.temple ? this.temple.focus : new THREE.Vector3();
    this.sun.position.copy(c).addScaledVector(lightDir.normalize(), 400);
    this.sun.target.position.copy(c);
    this.sun.intensity = T.sun;
    this.sun.color.set(T.sunColor);
    this.hemi.intensity = T.hemi;
    this.renderer.toneMappingExposure = T.exposure;
    this.stars.visible = T.stars;
    this.scene.fog.color.set(T.fog);
    this.envGround.material.color.set(key === 'night' ? 0x0c0a08 : key === 'dusk' ? 0x6a4428 : 0xb08a58);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = key === 'night' ? 0.12 : key === 'dusk' ? 0.45 : 0.6;
    this.baseLamp = T.lamps;
    this.basePoint = T.point;
    this.applyLamps(1);
  }

  applyLamps(k) {
    if (!this.temple) return;
    const lm = this.temple.lampMesh.material;
    lm.emissiveIntensity = this.baseLamp * k;
    this.pointLights.forEach((l) => (l.intensity = this.basePoint * k));
  }

  setMode(mode) {
    this.mode = mode;
    this.ui.tooltip.classList.add('hidden');
    this.ui.pradakshina.classList.toggle('active', mode === 'pradakshina');
    this.ui.walk.classList.toggle('active', mode === 'walk');
    this.controls.enabled = mode !== 'walk';
    this.ui.hint.textContent = mode === 'walk'
      ? 'W A S D to walk · drag to look · Shift to run · climb steps by walking into them · Esc to stop'
      : mode === 'pradakshina'
        ? 'Circling clockwise, keeping the shrine on your right · drag to stop'
        : 'Drag to orbit · Right-drag to pan · Scroll to zoom · Click to inspect';
    if (mode === 'walk' && this.temple) {
      const s = this.temple.walkStart;
      this.walk = { x: s.x, z: s.z, floor: s.y, yaw: 0, pitch: 0.05 };
      const f = this.temple.focus;
      this.walk.yaw = Math.atan2(-(f.x - s.x), -(f.z - s.z));
      this.tween = null;
    }
    if (mode === 'orbit' && this.prevMode === 'walk' && this.temple) this.resetView(true);
    if (mode === 'pradakshina' && this.temple) {
      const off = this.camera.position.clone().sub(this.temple.focus);
      this.prad = { angle: Math.atan2(off.z, off.x), r: Math.max(this.temple.radius * 0.75, 25) };
    }
    this.prevMode = mode;
  }

  onKey(e, down) {
    if (e.target instanceof HTMLInputElement) return;
    if (down && e.code === 'Escape') {
      if (this.mode !== 'orbit') this.setMode('orbit');
      return;
    }
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
  }

  pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.temple.object, true);
    for (const h of hits) {
      if (h.object.userData.partRoot) return h.object.userData.partRoot;
      if (h.object.userData.ground) return null;
    }
    return null;
  }

  onMove(e) {
    if (!this.isOpen) return;
    if (this.mode === 'walk' && this.drag) {
      this.walk.yaw -= (e.clientX - this.drag.x) * 0.004;
      this.walk.pitch = THREE.MathUtils.clamp(this.walk.pitch - (e.clientY - this.drag.y) * 0.004, -1.2, 1.2);
      this.drag = { x: e.clientX, y: e.clientY, moved: true };
      return;
    }
    if (this.drag) this.drag.moved = Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) > 4;
    const p = this.pick(e);
    if (p !== this.hovered) {
      if (this.hovered && this.hovered !== this.selected) this.highlight(this.hovered, 0);
      this.hovered = p;
      if (p && p !== this.selected) this.highlight(p, 0.35);
    }
    const tip = this.ui.tooltip;
    if (p && !this.drag) {
      tip.textContent = p.userData.part.name;
      tip.style.left = e.clientX + 'px';
      tip.style.top = e.clientY + 'px';
      tip.classList.remove('hidden');
      this.canvas.style.cursor = 'pointer';
    } else {
      tip.classList.add('hidden');
      this.canvas.style.cursor = this.mode === 'walk' ? 'grab' : '';
    }
  }

  onDown(e) {
    this.drag = { x: e.clientX, y: e.clientY, moved: false };
  }

  onUp(e) {
    if (!this.isOpen || !this.drag) return;
    const clicked = !this.drag.moved && e.target === this.canvas;
    this.drag = null;
    if (!clicked) return;
    const p = this.pick(e);
    if (this.selected) this.highlight(this.selected, 0);
    this.selected = p;
    this.showPart(p);
    if (!p) return;
    this.highlight(p, 0.6);
    if (this.mode === 'walk') return;
    const box = new THREE.Box3().setFromObject(p);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dir = this.camera.position.clone().sub(c).normalize();
    if (dir.y < 0.15) dir.y = 0.25;
    dir.normalize();
    const dist = THREE.MathUtils.clamp(size * 1.25, 8, 320);
    if (this.mode === 'pradakshina') this.setMode('orbit');
    this.flyTo(c.clone().addScaledVector(dir, dist), c);
  }

  highlight(p, k) {
    p.traverse((m) => {
      if (!m.isMesh || m === this.temple.lampMesh) return;
      [].concat(m.material).forEach((mt) => {
        if (!mt.emissive || mt.userData.keepEmissive) return;
        if (mt.userData.baseEmissive === undefined) {
          mt.userData.baseEmissive = mt.emissive.getHex();
          mt.userData.baseEI = mt.emissiveIntensity;
        }
        if (k > 0) {
          mt.emissive.set(0xff9a2e);
          mt.emissiveIntensity = k * 0.5;
        } else {
          mt.emissive.setHex(mt.userData.baseEmissive);
          mt.emissiveIntensity = mt.userData.baseEI;
        }
      });
    });
  }

  showPart(p) {
    this.ui.part.innerHTML = p
      ? `<b>${p.userData.part.name}</b><p>${p.userData.part.desc}</p>`
      : '<b>Click any part of the temple</b><p>Tower, sanctum, halls, gateways, flags, lamps and pilgrims each explain their meaning and history.</p>';
    if (p) this.ui.hud?.classList.remove('minimized');
  }

  // ------------------------------------------------------------ aarti

  aarti() {
    this.audio ||= new AudioContext();
    const ac = this.audio;
    if (ac.state === 'suspended') ac.resume();
    const master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    this.conch(ac, master, ac.currentTime);
    for (let i = 0; i < 7; i++) this.bell(ac, master, ac.currentTime + 2.2 + i * 0.9, i % 2 ? 1.12 : 1);
    this.petals.burst(this.temple.focus, this.temple.radius);
    this.aartiUntil = this.clock.elapsedTime + 11;
  }

  bell(ac, out, t, k = 1) {
    [1, 2.32, 4.25, 6.63, 9.38].forEach((p, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 520 * k * p;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35 / (i + 1), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4 / (1 + i * 0.6));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 4.5);
    });
  }

  conch(ac, out, t) {
    const o = ac.createOscillator();
    const o2 = ac.createOscillator();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    o.type = 'sawtooth';
    o2.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.linearRampToValueAtTime(233, t + 0.6);
    o2.frequency.value = 466;
    f.type = 'lowpass';
    f.frequency.value = 1100;
    f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.5);
    g.gain.setValueAtTime(0.22, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(f);
    o2.connect(f);
    f.connect(g).connect(out);
    o.start(t);
    o2.start(t);
    o.stop(t + 2.5);
    o2.stop(t + 2.5);
  }

  makePetals() {
    const N = 900;
    const geo = new THREE.PlaneGeometry(0.32, 0.22);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), N);
    const cols = ['#ff8f1f', '#ffb400', '#ff5e3a', '#d7263d', '#ffd166', '#ffffff'];
    const P = [];
    for (let i = 0; i < N; i++) {
      mesh.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      P.push({ p: new THREE.Vector3(0, -100, 0), v: 0, r: new THREE.Euler(), w: Math.random() * 6, life: 0 });
    }
    mesh.frustumCulled = false;
    mesh.userData.noCollide = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3();
    return {
      mesh,
      burst(center, radius) {
        const r = Math.min(40, radius * 0.5);
        P.forEach((p) => {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
          p.p.set(center.x + Math.cos(a) * d, 18 + Math.random() * 35, center.z + Math.sin(a) * d);
          p.v = 1.2 + Math.random() * 1.6;
          p.life = 16 + Math.random() * 4;
        });
      },
      update(dt, t) {
        P.forEach((p, i) => {
          if (p.life <= 0) {
            m.compose(zero, q, zero);
          } else {
            p.life -= dt;
            if (p.p.y > 0.05) {
              p.p.y -= p.v * dt;
              p.p.x += Math.sin(t * 1.3 + p.w) * dt * 0.8;
              p.p.z += Math.cos(t * 1.1 + p.w) * dt * 0.8;
              p.r.set(t * 2 + p.w, t * 1.5 + p.w, 0);
            } else p.r.set(-Math.PI / 2, 0, p.w);
            q.setFromEuler(p.r);
            m.compose(p.p, q, one.setScalar(Math.min(1, p.life)));
            one.set(1, 1, 1);
          }
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
    };
  }

  // ------------------------------------------------------------ loop

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    this.temple.animators.forEach((f) => f(t, dt));
    this.temple.waterTex.offset.set(t * 0.012, t * 0.008);
    this.petals.update(dt, t);

    if (this.aartiUntil && t < this.aartiUntil) {
      this.applyLamps(1.8 + Math.sin(t * 9) * 0.35 + Math.sin(t * 23) * 0.2);
    } else if (this.aartiUntil) {
      this.aartiUntil = 0;
      this.applyLamps(1);
    }

    if (this.mode === 'walk') this.stepWalk(dt);
    else {
      if (this.mode === 'pradakshina') {
        this.prad.angle += dt * 0.12;
        const f = this.temple.focus;
        this.camera.position.set(f.x + Math.cos(this.prad.angle) * this.prad.r, Math.max(6, f.y * 0.5), f.z + Math.sin(this.prad.angle) * this.prad.r);
        this.controls.target.copy(f);
      }
      if (this.tween) {
        const tw = this.tween;
        tw.s = Math.min(1, tw.s + dt / tw.dur);
        const e = tw.s < 0.5 ? 4 * tw.s ** 3 : 1 - (-2 * tw.s + 2) ** 3 / 2;
        this.camera.position.lerpVectors(tw.p0, tw.p1, e);
        this.controls.target.lerpVectors(tw.t0, tw.t1, e);
        if (tw.s >= 1) this.tween = null;
      }
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  stepWalk(dt) {
    const w = this.walk;
    const k = this.keys;
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 9 : 3.2) * dt;
    let f = 0, s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (f || s) {
      const len = Math.hypot(f, s);
      const dx = ((-Math.sin(w.yaw) * f + Math.cos(w.yaw) * s) / len) * speed;
      const dz = ((-Math.cos(w.yaw) * f - Math.sin(w.yaw) * s) / len) * speed;
      this.tryMove(w, dx, dz);
    }
    const eye = new THREE.Vector3(w.x, w.floor + 1.65, w.z);
    this.camera.position.copy(eye);
    const dir = new THREE.Vector3(-Math.sin(w.yaw) * Math.cos(w.pitch), Math.sin(w.pitch), -Math.cos(w.yaw) * Math.cos(w.pitch));
    this.camera.lookAt(eye.add(dir));
  }

  tryMove(w, dx, dz) {
    const nx = w.x + dx, nz = w.z + dz;
    const b = this.temple.bounds;
    if (Math.abs(nx) > b.w / 2 + 30 || Math.abs(nz - b.cz) > b.d / 2 + 30) return;
    const down = this.raycaster;
    down.set(new THREE.Vector3(nx, w.floor + 1.0, nz), new THREE.Vector3(0, -1, 0));
    down.far = 6;
    const hit = down.intersectObjects(this.collidables, false)[0];
    down.far = Infinity;
    const floor = hit ? hit.point.y : b.floorY ?? 0;
    if (floor - w.floor > 0.95) return;
    const fwd = new THREE.Vector3(dx, 0, dz).normalize();
    down.set(new THREE.Vector3(w.x, w.floor + 1.2, w.z), fwd);
    down.far = 0.6;
    const wall = down.intersectObjects(this.collidables, false)[0];
    down.far = Infinity;
    if (wall) return;
    w.x = nx;
    w.z = nz;
    w.floor += (Math.max(floor, -0.5) - w.floor) * 0.5;
  }
}
