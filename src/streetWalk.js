const C = window.Cesium;
const R = 6378137;

export class StreetWalker {
  constructor(globe, { onExit, onStatus }) {
    this.globe = globe;
    this.viewer = globe.viewer;
    this.onExit = onExit;
    this.onStatus = onStatus;
    this.keys = new Set();
    this.active = false;
    this.speedMul = 1;
    this._tick = () => this.tick();
    this._down = (e) => {
      if (!this.active) return;
      this.drag = { x: e.clientX, y: e.clientY };
      this.viewer.canvas.style.cursor = 'grabbing';
    };
    this._move = (e) => {
      if (!this.active || !this.drag) return;
      this.heading += (e.clientX - this.drag.x) * 0.0035;
      this.pitch = C.Math.clamp(this.pitch - (e.clientY - this.drag.y) * 0.0035, -1.35, 1.2);
      this.drag = { x: e.clientX, y: e.clientY };
    };
    this._up = () => {
      this.drag = null;
      if (this.active) this.viewer.canvas.style.cursor = 'grab';
    };
    this._wheel = (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.speedMul = C.Math.clamp(this.speedMul * (e.deltaY > 0 ? 0.85 : 1.18), 0.2, 12);
      this.status();
    };
    this._key = (e) => {
      if (!this.active || e.target instanceof HTMLInputElement) return;
      if (e.type === 'keydown') {
        if (e.code === 'Escape') return this.stop();
        this.keys.add(e.code);
      } else this.keys.delete(e.code);
    };
  }

  async start(site, groundHint) {
    if (this.active) this.stop(true);
    const photoreal = !!this.globe.tileset;
    this.photoreal = photoreal;
    this.site = site;
    const bearing = C.Math.toRadians(site.approach ?? 180);
    const dist = photoreal ? 85 : 260;
    const lat0 = C.Math.toRadians(site.lat), lon0 = C.Math.toRadians(site.lon);
    this.lat = lat0 + (Math.cos(bearing) * dist) / R;
    this.lon = lon0 + (Math.sin(bearing) * dist) / (R * Math.cos(lat0));
    this.heading = bearing + Math.PI;
    this.pitch = photoreal ? C.Math.toRadians(4) : C.Math.toRadians(-28);
    this.eye = photoreal ? 1.75 : 140;
    this.ground = Number.isFinite(groundHint) ? groundHint : (site.elev || 0);
    this.groundValid = false;
    this.speedMul = 1;
    this.frame = 0;

    this.globe.stopOrbit();
    this.globe.spin = false;
    const ssc = this.viewer.scene.screenSpaceCameraController;
    ssc.enableInputs = false;
    await new Promise((resolve) =>
      this.viewer.camera.flyTo({
        destination: C.Cartesian3.fromRadians(this.lon, this.lat, this.ground + this.eye + (photoreal ? 30 : 0)),
        orientation: { heading: this.heading, pitch: this.pitch, roll: 0 },
        duration: 2.6,
        complete: resolve,
        cancel: resolve,
      }),
    );
    this.active = true;
    this.last = performance.now();
    const c = this.viewer.canvas;
    c.style.cursor = 'grab';
    c.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    c.addEventListener('wheel', this._wheel, { passive: false });
    window.addEventListener('keydown', this._key);
    window.addEventListener('keyup', this._key);
    this.viewer.scene.preUpdate.addEventListener(this._tick);
    this.status();
  }

  stop(silent = false) {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    const c = this.viewer.canvas;
    c.style.cursor = '';
    c.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    c.removeEventListener('wheel', this._wheel);
    window.removeEventListener('keydown', this._key);
    window.removeEventListener('keyup', this._key);
    this.viewer.scene.preUpdate.removeEventListener(this._tick);
    this.viewer.scene.screenSpaceCameraController.enableInputs = true;
    if (!silent && this.onExit) this.onExit();
  }

  status() {
    const mode = this.photoreal ? 'Photorealistic 3D' : 'Satellite (add a Google key in ⚙ for 3D streets)';
    this.onStatus?.(`${mode} · speed ×${this.speedMul.toFixed(1)}`);
  }

  sample(lon, lat) {
    const sampled = this.viewer.scene.sampleHeight(new C.Cartographic(lon, lat));
    if (Number.isFinite(sampled)) return sampled;
    const globeH = this.viewer.scene.globe.getHeight(new C.Cartographic(lon, lat));
    if (Number.isFinite(globeH)) return globeH;
    return this.photoreal ? undefined : (this.site.elev || 0);
  }

  tick() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const k = this.keys;
    const run = k.has('ShiftLeft') || k.has('ShiftRight');
    const base = this.photoreal ? 4.5 : 40;
    const speed = base * (run ? 3.5 : 1) * this.speedMul * dt;
    let f = 0, s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyQ')) this.eye = Math.min(400, this.eye + speed * 1.5);
    if (k.has('KeyE')) this.eye = Math.max(this.photoreal ? 1.6 : 5, this.eye - speed * 1.5);

    let lat = this.lat, lon = this.lon;
    if (f || s) {
      const len = Math.hypot(f, s);
      const h = this.heading;
      const dN = ((Math.cos(h) * f - Math.sin(h) * s) / len) * speed;
      const dE = ((Math.sin(h) * f + Math.cos(h) * s) / len) * speed;
      lat += dN / R;
      lon += dE / (R * Math.cos(lat));
    }
    const moved = lat !== this.lat || lon !== this.lon;
    if (moved || this.frame++ % 6 === 0) {
      const g = this.sample(lon, lat);
      if (g !== undefined) {
        const blocked = this.photoreal && this.groundValid && this.eye < 6 && g - this.ground > 2.2;
        if (!blocked) {
          this.lat = lat;
          this.lon = lon;
          this.ground = this.groundValid ? this.ground + (g - this.ground) * Math.min(1, dt * 10) : g;
          this.groundValid = true;
        }
      } else if (moved) {
        this.lat = lat;
        this.lon = lon;
      }
    }
    this.viewer.camera.setView({
      destination: C.Cartesian3.fromRadians(this.lon, this.lat, this.ground + this.eye),
      orientation: { heading: this.heading, pitch: this.pitch, roll: 0 },
    });
  }
}
