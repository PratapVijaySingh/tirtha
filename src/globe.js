import { SITES, TRADITIONS } from './sites.js';

const C = window.Cesium;
const IMAGERY = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const LABELS = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer';
const ROADS = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer';

function pinImage(tradition, big = false) {
  const { color, glyph } = TRADITIONS[tradition];
  const s = big ? 1.35 : 1;
  const w = 56 * s, h = 76 * s;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.shadowColor = color;
  g.shadowBlur = 14 * s;
  const cx = w / 2, cy = 26 * s, r = 20 * s;
  g.beginPath();
  g.moveTo(cx, h - 4 * s);
  g.bezierCurveTo(cx - 6 * s, cy + r * 0.9, cx - r, cy + r * 0.6, cx - r, cy);
  g.arc(cx, cy, r, Math.PI, 0);
  g.bezierCurveTo(cx + r, cy + r * 0.6, cx + 6 * s, cy + r * 0.9, cx, h - 4 * s);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#fff3d6');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, '#5a2a05');
  g.fillStyle = grad;
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 2 * s;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  g.fillStyle = 'rgba(20,10,2,0.85)';
  g.fill();
  g.fillStyle = '#ffe2a8';
  g.font = `bold ${18 * s}px "Nirmala UI", "Segoe UI Symbol", "Noto Sans", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(glyph, cx, cy + 1);
  return c;
}

export class Globe {
  constructor(el) {
    this.viewer = new C.Viewer(el, {
      baseLayer: C.ImageryLayer.fromProviderAsync(C.ArcGisMapServerImageryProvider.fromUrl(IMAGERY, { enablePickFeatures: false })),
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
      infoBox: false, selectionIndicator: false, msaaSamples: 4,
    });
    const v = this.viewer;
    const scene = v.scene;
    v.imageryLayers.add(C.ImageryLayer.fromProviderAsync(C.ArcGisMapServerImageryProvider.fromUrl(ROADS, { enablePickFeatures: false }), { alpha: 0.55, minimumTerrainLevel: 12 }));
    v.imageryLayers.add(C.ImageryLayer.fromProviderAsync(C.ArcGisMapServerImageryProvider.fromUrl(LABELS, { enablePickFeatures: false }), { alpha: 0.9 }));
    scene.globe.enableLighting = true;
    scene.globe.dynamicAtmosphereLighting = true;
    scene.globe.showGroundAtmosphere = true;
    scene.globe.depthTestAgainstTerrain = false;
    scene.fog.enabled = true;
    scene.skyAtmosphere.show = true;
    scene.highDynamicRange = false;
    scene.postProcessStages.fxaa.enabled = true;
    v.clock.currentTime = C.JulianDate.fromIso8601('2026-10-21T06:30:00Z');
    v.clock.shouldAnimate = false;
    scene.screenSpaceCameraController.minimumZoomDistance = 8;
    scene.screenSpaceCameraController.maximumZoomDistance = 4.5e7;
    // World terrain looks correct from far away but smears satellite photos
    // at shrine scale, so we keep the ellipsoid and published elevations.

    this.entities = new Map();
    this.addPins();
    this.rings = [
      this.makeRing(500, '#ff9933', 0.18),
      this.makeRing(2000, '#f6c453', 0.08),
    ];
    this.ringLabels = [
      this.makeRingLabel('500 m walk', 500),
      this.makeRingLabel('2 km', 2000),
    ];

    this.spin = true;
    scene.preUpdate.addEventListener(() => {
      if (this.spin) v.camera.rotate(C.Cartesian3.UNIT_Z, -0.0009);
      if (this.orbit) this.stepOrbit();
      if (this.onHud) this.onHud(this.hudState());
    });
    v.camera.setView({ destination: C.Cartesian3.fromDegrees(20, 18, 2.6e7) });
    const stopAll = () => {
      this.spin = false;
      this.stopOrbit();
    };
    v.canvas.addEventListener('pointerdown', stopAll);
    v.canvas.addEventListener('wheel', stopAll, { passive: true });

    this.handler = new C.ScreenSpaceEventHandler(v.canvas);
    this.handler.setInputAction((m) => {
      const site = this.siteAt(m.endPosition);
      v.canvas.style.cursor = site ? 'pointer' : '';
      if (site !== this.hoverSite) {
        if (this.hoverSite && this.hoverSite !== this.selectedSite) this.setPinScale(this.hoverSite, 1);
        if (site) this.setPinScale(site, 1.25);
        this.hoverSite = site;
      }
    }, C.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.setInputAction((c) => {
      const site = this.siteAt(c.position);
      if (site && this.onSelect) this.onSelect(site);
    }, C.ScreenSpaceEventType.LEFT_CLICK);
  }

  makeRing(metres, color, alpha) {
    return this.viewer.entities.add({
      show: false,
      position: C.Cartesian3.fromDegrees(0, 0),
      ellipse: {
        semiMajorAxis: metres, semiMinorAxis: metres,
        material: C.Color.fromCssColorString(color).withAlpha(Math.min(0.06, alpha)),
        outline: true,
        outlineColor: C.Color.fromCssColorString(color).withAlpha(0.85),
        outlineWidth: 3,
        height: 0,
        heightReference: C.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }

  makeRingLabel(text, metres) {
    return this.viewer.entities.add({
      show: false,
      position: C.Cartesian3.fromDegrees(0, 0),
      label: {
        text,
        font: '600 12px Inter, sans-serif',
        fillColor: C.Color.fromCssColorString('#ffe2a8'),
        outlineColor: C.Color.BLACK.withAlpha(0.85),
        outlineWidth: 3,
        style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new C.NearFarScalar(800, 1, 12000, 0.4),
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, 18000),
      },
    });
  }

  async loadTerrain() {
    try {
      const terrain = await C.ArcGISTiledElevationTerrainProvider.fromUrl(
        'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
      );
      this.viewer.terrainProvider = terrain;
      this.hasTerrain = true;
    } catch (e) {
      console.warn('World elevation terrain unavailable', e);
      this.hasTerrain = false;
    }
  }

  addPins() {
    SITES.forEach((site) => {
      const e = this.viewer.entities.add({
        id: site.id,
        position: C.Cartesian3.fromDegrees(site.lon, site.lat),
        billboard: {
          image: pinImage(site.tradition),
          verticalOrigin: C.VerticalOrigin.BOTTOM,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
          scaleByDistance: new C.NearFarScalar(1.5e3, 1.0, 1.5e7, 0.45),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: site.name,
          font: '600 14px Inter, sans-serif',
          fillColor: C.Color.WHITE,
          outlineColor: C.Color.BLACK.withAlpha(0.85),
          outlineWidth: 4,
          style: C.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: C.VerticalOrigin.TOP,
          pixelOffset: new C.Cartesian2(0, 6),
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
          distanceDisplayCondition: new C.DistanceDisplayCondition(0, 3.2e6),
          scaleByDistance: new C.NearFarScalar(2e4, 1.05, 3.2e6, 0.7),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      e.site = site;
      this.entities.set(site.id, e);
    });
  }

  setPinScale(site, s) {
    const e = this.entities.get(site.id);
    if (e) e.billboard.scale = s;
  }

  siteAt(pos) {
    if (!pos) return null;
    const picked = this.viewer.scene.pick(pos);
    return picked?.id?.site || null;
  }

  setFilter(visibleIds) {
    this.entities.forEach((e, id) => (e.show = visibleIds.has(id)));
  }

  select(site) {
    if (this.selectedSite) this.setPinScale(this.selectedSite, 1);
    this.selectedSite = site;
    if (!site) {
      this.rings.forEach((r) => (r.show = false));
      this.ringLabels.forEach((r) => (r.show = false));
      return;
    }
    this.setPinScale(site, 1.35);
    const pos = C.Cartesian3.fromDegrees(site.lon, site.lat);
    this.rings.forEach((r) => {
      r.position = pos;
      r.show = true;
    });
    const east500 = C.Cartesian3.fromDegrees(site.lon + (500 / 111320) / Math.cos(site.lat * Math.PI / 180), site.lat);
    const east2k = C.Cartesian3.fromDegrees(site.lon + (2000 / 111320) / Math.cos(site.lat * Math.PI / 180), site.lat);
    this.ringLabels[0].position = east500;
    this.ringLabels[1].position = east2k;
    this.ringLabels.forEach((r) => (r.show = true));
  }

  hudState() {
    const cam = this.viewer.camera.positionCartographic;
    const alt = cam.height;
    let dist = null;
    if (this.selectedSite) {
      const shrine = C.Cartesian3.fromDegrees(this.selectedSite.lon, this.selectedSite.lat, this.selectedSite.elev || 0);
      dist = C.Cartesian3.distance(this.viewer.camera.positionWC, shrine);
    }
    return { alt, dist };
  }

  flyEarth() {
    this.stopOrbit();
    this.viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(78, 18, 2.4e7), duration: 3 });
  }

  flyIndia(duration = 4.5) {
    this.spin = false;
    this.stopOrbit();
    return new Promise((resolve) =>
      this.viewer.camera.flyTo({
        destination: C.Cartesian3.fromDegrees(80.2, 4.5, 3.1e6),
        orientation: { heading: 0, pitch: C.Math.toRadians(-62), roll: 0 },
        duration,
        easingFunction: C.EasingFunction.CUBIC_IN_OUT,
        complete: resolve,
        cancel: resolve,
      }),
    );
  }

  async groundHeight(site) {
    try {
      const res = await Promise.race([
        this.viewer.scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(site.lon, site.lat)]),
        new Promise((r) => setTimeout(() => r(null), 6000)),
      ]);
      if (res && Number.isFinite(res[0].height)) return res[0].height;
    } catch (e) {
      console.warn('height sample failed', e);
    }
    const cached = this.viewer.scene.globe.getHeight(C.Cartographic.fromDegrees(site.lon, site.lat));
    if (Number.isFinite(cached)) return Math.max(cached, site.elev || 0);
    return site.elev || 0;
  }

  flyRange(site) {
    if (this.tileset) return 420;
    if ((site.elev || 0) > 2500) return 3800;
    if ((site.elev || 0) > 800) return 1800;
    if (site.temple?.style === 'gurudwara' || site.id === 'akshardham' || site.id === 'palitana') return 1400;
    return 1400;
  }

  async flyToSite(site, { orbit = true, duration = 3.2 } = {}) {
    this.spin = false;
    this.stopOrbit();
    const h = Math.max(await this.groundHeight(site), site.elev || 0);
    const center = C.Cartesian3.fromDegrees(site.lon, site.lat, h + 8);
    const range = this.flyRange(site);
    const pitch = C.Math.toRadians(this.tileset ? -26 : (site.elev || 0) > 2000 ? -42 : -38);
    const heading = C.Math.toRadians(
      (site.elev || 0) > 2000 ? (site.approach ?? 180) : (site.approach ?? 180) + 180,
    );
    await new Promise((resolve) =>
      this.viewer.camera.flyToBoundingSphere(new C.BoundingSphere(center, 40), {
        offset: new C.HeadingPitchRange(heading, pitch, range),
        duration,
        maximumHeight: 6e5,
        complete: resolve,
        cancel: resolve,
      }),
    );
    if (orbit) this.startOrbit(center, heading, pitch, range);
    return h;
  }

  startOrbit(center, heading, pitch, range) {
    this.orbit = { center, heading, pitch, range };
  }

  stepOrbit() {
    const o = this.orbit;
    o.heading += 0.0016;
    this.viewer.camera.lookAt(o.center, new C.HeadingPitchRange(o.heading, o.pitch, o.range));
  }

  stopOrbit() {
    if (!this.orbit) return;
    this.orbit = null;
    this.viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  }

  async enablePhotoreal(key) {
    this.disablePhotoreal();
    const ts = await C.Cesium3DTileset.fromUrl(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(key)}`, {
      showCreditsOnScreen: true,
      maximumScreenSpaceError: 12,
    });
    this.viewer.scene.primitives.add(ts);
    this.viewer.scene.globe.show = false;
    this.tileset = ts;
  }

  disablePhotoreal() {
    if (!this.tileset) return;
    this.viewer.scene.primitives.remove(this.tileset);
    this.tileset = null;
    this.viewer.scene.globe.show = true;
  }
}
