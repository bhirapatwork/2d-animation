// The whole film as one three.js scene: sky, the City street (road, pavements, Victorian shop row, other buildings),
// the curved glass tower, the parked car (mirror / badge / side panel melt), the reflected beam and its hot spot,
// the explanation plaza (flat window + giant spoon with light rays), the sunshade fins, the builders' cradle and the
// garden under the glass roof at the top. update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Batch, boxGeo, V, lam, Kit, Ray, kitClone, house, quad, prop, setSight, inTheWay } from "./build";
import { ctex, rep, stoneHD, grassHD, cloudHD, rng, facadeHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, SPOON_FOCUS } from "./cast";
import {
  FPS, SHOTS, camAt, V3, FOREGROUND, ShotDef, CAR, SPOT, TOWER, frontZ, halfW, PANE, SPOON, EX, carX, carRolling,
  meltMirror, meltBadge, meltPanels, beamAt, finsAt, clamp01, smooth,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit); // no GLB props in this film (cartoon vegetation is procedural)

// ---------------- painted textures ----------------
const asphalt = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#6d6a72"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const v = 90 + Math.floor(r() * 40); g.fillStyle = `rgba(${v},${v - 2},${v + 6},0.35)`; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
  for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(60,56,66,0.07)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 90, 20 + r() * 50, r() * 3, 0, 7); g.fill(); }
});
const paving = () => stoneHD("paveHD", ["#c9c1b4", "#bfb7aa", "#d2cbbf", "#b8b0a3"], "#8f877c");
/** curtain wall: blue-grey glass panels 1.5 x 4.2 m, pale mullions, floor bands, soft sky reflection streaks */
const glassTex = () => ctex("curtain", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, "#9cc3e6"); gr.addColorStop(0.5, "#7fa9d6"); gr.addColorStop(1, "#6d95c4");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  const cw = 1024 / 8, ch = 1024 / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const v = r() * 0.12; g.fillStyle = `rgba(255,255,255,${v})`; g.fillRect(i * cw + 4, j * ch + 4, cw - 8, ch - 8);
    if (r() < 0.25) { g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(i * cw + 10, j * ch + ch - 10); g.lineTo(i * cw + cw * 0.6, j * ch + 10); g.lineTo(i * cw + cw * 0.9, j * ch + 10); g.lineTo(i * cw + cw * 0.3, j * ch + ch - 10); g.fill(); }
  }
  g.fillStyle = "#e6edf2"; for (let i = 0; i <= 8; i++) g.fillRect(i * cw - 4, 0, 8, 1024);
  g.fillStyle = "#d4dde6"; for (let j = 0; j <= 4; j++) g.fillRect(0, j * ch - 9, 1024, 18);
});
/** office block facade (stone piers + dark glass) */
const officeTex = (k: number) => ctex("office" + k, 512, 512, (g, r) => {
  const stones = ["#d8cdb9", "#c9ccd1", "#b9a58a", "#e2dccf"], glass = ["#4d6a8f", "#5b7894", "#3f5a7a", "#6a86a6"];
  g.fillStyle = stones[k % 4]; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    g.fillStyle = glass[(k + i + j) % 4]; g.fillRect(i * 128 + 18, j * 128 + 22, 92, 84);
    g.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.1})`; g.fillRect(i * 128 + 22, j * 128 + 26, 30, 76);
  }
});
const lane = () => ctex("lane", 256, 64, (g) => { g.fillStyle = "#f2efe6"; g.fillRect(0, 22, 150, 20); });
const yellowLines = () => ctex("ylines", 64, 64, (g) => { g.fillStyle = "#f2c230"; g.fillRect(0, 8, 64, 10); g.fillRect(0, 30, 64, 10); });
const awningTex = (c: string) => ctex("awn" + c, 256, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f4efe2" : c; g.fillRect(i * 32, 0, 32, 128); } });
const discTex = () => ctex("spotDisc", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const paperTex = () => ctex("paper", 128, 128, (g) => { g.fillStyle = "#f8f4e8"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#b9b2a2"; for (let i = 0; i < 6; i++) g.fillRect(16, 18 + i * 16, 96 - (i % 2) * 30, 5); });
const crateTex = () => ctex("crate", 256, 256, (g) => { g.fillStyle = "#b8864f"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#8a5f33"; for (let i = 0; i < 4; i++) g.fillRect(0, i * 64 + 60, 256, 6); g.fillRect(0, 0, 14, 256); g.fillRect(242, 0, 14, 256); });
const phoneTex = () => ctex("phonebox", 256, 512, (g) => {
  g.fillStyle = "#c8262e"; g.fillRect(0, 0, 256, 512);
  for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) { g.fillStyle = "#cfe3ee"; g.fillRect(34 + i * 64, 90 + j * 60, 52, 50); }
  g.fillStyle = "#1e1e24"; g.fillRect(30, 30, 196, 34);
});

// ---------------- geometry helpers ----------------
const beamBetween = (a: THREE.Vector3, b: THREE.Vector3, th: number) => {
  const g = new THREE.BoxGeometry(th, a.distanceTo(b), th);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
};
const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return g;
};
/** parametric surface (u, v in [0, 1]) -> geometry with smooth normals and metre-based uvs (su, sv metres per tile) */
const surf = (nu: number, nv: number, fn: (u: number, v: number) => THREE.Vector3, su: number, sv: number, flip = false) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P: THREE.Vector3[][] = [];
  for (let j = 0; j <= nv; j++) { P.push([]); for (let i = 0; i <= nu; i++) P[j].push(fn(i / nu, j / nv)); }
  for (let j = 0; j <= nv; j++) {
    let acc = 0;
    for (let i = 0; i <= nu; i++) {
      if (i) acc += P[j][i].distanceTo(P[j][i - 1]);
      const p = P[j][i]; pos.push(p.x, p.y, p.z);
      let accv = 0; for (let k = 1; k <= j; k++) accv += P[k][i].distanceTo(P[k - 1][i]);
      uv.push(acc / su, accv / sv);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};

// ---------------- the car ----------------
type CarParts = { g: THREE.Group; wheels: THREE.Mesh[]; mirror?: THREE.Group; badge?: THREE.Group; panel?: THREE.Mesh; panelBase?: Float32Array; drips: THREE.Mesh[]; mDrip?: THREE.Mesh; bDrip?: THREE.Mesh };
const shiny = (col: string, shin = 70) => twoTone(new THREE.MeshPhongMaterial({ color: col, specular: "#9a9aa6", shininess: shin }), 0.15);
const makeCar = (col: string, hero: boolean): CarParts => {
  const g = new THREE.Group(), body = shiny(col), glass = shiny("#2c3a50", 90), dark = lam("tyre", () => ({ color: "#26232a" })), chrome = shiny("#d3d7de", 90);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  add(new RoundedBoxGeometry(4.9, 0.66, 1.9, 4, 0.2), body, 0, 0.67, 0);
  add(new RoundedBoxGeometry(1.5, 0.18, 1.86, 3, 0.08), body, 1.55, 1.0, 0); // bonnet hump
  add(new RoundedBoxGeometry(2.45, 0.52, 1.62, 4, 0.2), glass, -0.4, 1.22, 0);
  add(new RoundedBoxGeometry(2.0, 0.08, 1.5, 2, 0.04), body, -0.4, 1.49, 0); // roof
  add(new THREE.BoxGeometry(0.06, 0.26, 1.2), dark, 2.46, 0.6, 0); // grille
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16).rotateZ(Math.PI / 2), chrome, 2.45, 0.78, s * 0.68); // headlamps
  const wheels: THREE.Mesh[] = [];
  for (const x of [-1.55, 1.55]) for (const s of [-1, 1]) {
    const w = add(new THREE.CylinderGeometry(0.35, 0.35, 0.26, 20).rotateX(Math.PI / 2), dark, x, 0.35, s * 0.86); wheels.push(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16).rotateX(Math.PI / 2), chrome); hub.position.z = s * 0.14; w.add(hub);
  }
  const parts: CarParts = { g, wheels, drips: [] };
  // wing mirrors on stalks at the front of the doors; the kerb-side one (-z) melts
  for (const s of [-1, 1]) {
    const m = new THREE.Group(); m.position.set(0.95, 1.0, s * 0.94);
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), body); stalk.position.z = s * 0.06; m.add(stalk);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.14, 0.12, 2, 0.04), body); head.position.set(0, 0.03, s * 0.15); m.add(head);
    m.traverse((o) => { o.castShadow = true; }); g.add(m);
    if (s < 0 && hero) parts.mirror = m;
  }
  // badge: chrome disc + a little leaping-cat silhouette on the nose
  const badge = new THREE.Group(); badge.position.set(2.47, 0.92, 0);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20).rotateZ(Math.PI / 2), chrome); badge.add(disc);
  const cat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.11), shiny("#3a3a44")); cat.position.x = 0.015; badge.add(cat);
  g.add(badge);
  if (hero) {
    parts.badge = badge;
    // kerb-side panel: a subdivided skin just outside the body that sags and ripples like wax
    const pg = new THREE.PlaneGeometry(4.1, 0.6, 48, 10); pg.rotateY(Math.PI); pg.translate(-0.1, 0.66, -0.958);
    parts.panel = new THREE.Mesh(pg, body); parts.panel.castShadow = true; parts.panel.receiveShadow = true; g.add(parts.panel);
    parts.panelBase = Float32Array.from(pg.attributes.position.array as Float32Array);
    const dripG = new THREE.CylinderGeometry(0.035, 0.012, 1, 8).translate(0, -0.5, 0);
    for (const x of [-1.5, -0.7, 0.2, 0.9, 1.6]) { const d = new THREE.Mesh(dripG, body); d.position.set(x, 0.38, -0.96); g.add(d); parts.drips.push(d); }
    parts.mDrip = new THREE.Mesh(dripG, body); parts.mirror!.add(parts.mDrip); parts.mDrip.position.set(0, -0.02, -0.15);
    parts.bDrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, 1, 8).translate(0, -0.5, 0), chrome); badge.add(parts.bDrip); parts.bDrip.position.set(0.01, -0.06, 0);
  }
  return parts;
};
const poseMelt = (c: CarParts, mm: number, mb: number, mp: number) => {
  if (c.mirror) {
    const head = c.mirror.children[1] as THREE.Mesh;
    c.mirror.rotation.x = 1.35 * mm; // droops down toward the kerb
    head.scale.set(1 + 0.2 * mm, 1 + 1.7 * mm, 1 - 0.25 * mm); head.position.y = 0.03 - 0.13 * mm;
    c.mDrip!.scale.set(1, Math.max(0.001, 0.38 * mm), 1); c.mDrip!.visible = mm > 0.05;
  }
  if (c.badge) {
    c.badge.scale.set(1, 1 - 0.45 * mb, 1 + 0.35 * mb); c.badge.position.y = 0.92 - 0.06 * mb; c.badge.rotation.x = 0.25 * mb;
    c.bDrip!.scale.set(1, Math.max(0.001, 0.14 * mb), 1); c.bDrip!.visible = mb > 0.05;
  }
  if (c.panel) {
    const p = c.panel.geometry.attributes.position as THREE.BufferAttribute, b = c.panelBase!;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1], v = 1 - (y - 0.36) / 0.6; // 0 top .. 1 bottom
      const wave = Math.sin(x * 5.1) * 0.6 + Math.sin(x * 11.3 + 1) * 0.4;
      p.setXYZ(i, x, y - mp * v * v * (0.07 + 0.05 * wave), b[i * 3 + 2] - mp * 0.035 * Math.sin(x * 7 + y * 9) * (0.4 + v));
    }
    p.needsUpdate = true; c.panel.geometry.computeVertexNormals();
    c.drips.forEach((d, k) => { d.scale.set(1, Math.max(0.001, mp * (0.12 + 0.07 * (k % 3))), 1); d.visible = mp > 0.05; });
  }
};

/** every lens position of the film looking at its subject (buildings in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = Math.min(fw.length(), 420);
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private car: CarParts; private others: CarParts[] = [];
  private beam: THREE.Mesh; private beamMat: THREE.ShaderMaterial; private spot: THREE.Mesh; private spotMat: THREE.MeshBasicMaterial; private glare: THREE.Mesh;
  private rays: { m: THREE.Mesh; a: THREE.Vector3; b: THREE.Vector3; f0: number; f1: number; id: number }[] = [];
  private rayGlow: THREE.Mesh; private fins: THREE.Mesh[] = []; private cradle = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (same rig as the bridge short) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    const cmaps = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud));
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3, d = 900 + (i % 3) * 80;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cmaps[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 200 + (i % 4) * 45; m.position.set(Math.cos(a) * d, 200 + (i % 4) * 60, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    const rays = sightLines();

    // ---- ground: road, pavements, kerbs, markings ----
    const b = new Batch();
    const road = lam("asphalt", () => ({ map: rep(asphalt(), 1, 1) }));
    const pave = lam("paving", () => ({ map: paving() }));
    const kerb = lam("kerb", () => ({ color: "#d9d3c7" }));
    const grassM = lam("grassHD", () => ({ map: grassHD() }));
    b.add(flat(-900, 900, -900, 900, -0.15, 90, 90), lam("cityGround", () => ({ color: "#a39d93" })));
    b.add(flat(-160, 160, -4, 4, -0.13, 32, 0.8), road);
    b.add(flat(-160, 160, -8.2, -4, 0.0, 80, 2.1), pave);
    b.add(flat(-160, 160, 4, 10, 0.0, 80, 3), pave);
    for (const z of [-4, 4]) b.add(boxGeo(V(-160, -0.13, z - 0.15), V(160, 0.0, z + 0.15)), kerb);
    const laneM = lam("lane", () => ({ map: lane(), alphaTest: 0.5 }));
    b.add(flat(-160, 160, -0.12, 0.12, -0.124, 80, 1), laneM);
    const yl = lam("ylines", () => ({ map: yellowLines(), alphaTest: 0.5 }));
    b.add(flat(-160, -8, 3.55, 3.8, -0.124, 80, 1), yl); b.add(flat(9, 160, -3.8, -3.55, -0.124, 80, 1), yl);
    // ---- the tower ----
    this.buildTower(R, b);
    // ---- south shop row (fronts at z = -8.2, facing the tower) + awnings ----
    const r = rng(7);
    const awnC = ["#2f6a43", "#8c3b4a", "#2f5f6a", "#b5653f", "#3f6fb5"];
    for (let x = -64; x < 64;) {
      const w = [6, 7, 8][Math.floor(r() * 3)], h = [9.8, 11.2, 12.6][Math.floor(r() * 3)];
      house(b, x + w / 2, -12.2, 0, w, 8, h, Math.floor(r() * 8));
      if (Math.abs(x + w / 2) < 40) {
        const c = awnC[Math.floor(r() * awnC.length)], aw = lam("awn" + c, () => ({ map: awningTex(c), side: THREE.DoubleSide }));
        b.add(quad(V(x + 0.6, 2.55, -7.0), V(x + w - 0.6, 2.55, -7.0), V(x + w - 0.6, 3.25, -8.2), V(x + 0.6, 3.25, -8.2), 2, 1), aw);
      }
      x += w + 0.2;
    }
    // north side: older buildings either side of the tower plot
    for (const sx of [-1, 1]) for (let x = 38; x < 120;) {
      const w = [7, 9][Math.floor(r() * 2)], h = [11.2, 12.6, 14][Math.floor(r() * 3)];
      house(b, sx * (x + w / 2), 14.2, Math.PI, w, 8, h, Math.floor(r() * 8));
      x += w + 0.3;
    }
    setSight(rays);
    // ---- City blocks all around (glass + stone office towers), none in a sight line ----
    const om = [0, 1, 2, 3].map((k) => lam("office" + k, () => ({ map: officeTex(k) })));
    const roofM = lam("flatRoof", () => ({ color: "#8e8a92" }));
    for (let i = 0; i < 240; i++) {
      const a = r() * Math.PI * 2, d = 60 + r() * 420, x = Math.cos(a) * d * 1.2, z = Math.sin(a) * d;
      if (Math.abs(z) < 24 && Math.abs(x) < 170) continue; // the street
      if (x > -40 && x < 40 && z > 8 && z < 70) continue; // the tower plot
      if (Math.abs(x - EX[0]) < 45 && Math.abs(z - EX[2]) < 45) continue; // the plaza
      const w = 14 + r() * 22, dd = 14 + r() * 22, h = 18 + r() * r() * 105;
      if (inTheWay(x - w / 2, x + w / 2, 0, h, z - dd / 2, z + dd / 2)) continue;
      const m = om[i % 4];
      const g = boxGeo(V(x - w / 2, 0, z - dd / 2), V(x + w / 2, h, z + dd / 2), 8);
      b.add(g, m);
      b.add(flat(x - w / 2, x + w / 2, z - dd / 2, z + dd / 2, h + 0.01, 1, 1), roofM);
    }
    setSight([]);
    // ---- street furniture: lamp posts, bollards, a red phone box, a bin ----
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#2d3038", specular: "#777", shininess: 40 }), 0.15);
    const lampM = lam("lampGlass", () => ({ color: "#f3ead0" }));
    for (let x = -60; x <= 60; x += 15) for (const z of [-4.6, 4.6]) {
      if (z < 0 && Math.abs(x) < 9) continue;
      b.add(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 10).translate(x, 2.6, z), iron);
      b.add(new THREE.BoxGeometry(0.34, 0.5, 0.34).translate(x, 5.4, z), lampM);
      b.add(new THREE.ConeGeometry(0.34, 0.3, 4).rotateY(Math.PI / 4).translate(x, 5.8, z), iron);
    }
    for (let x = 10; x < 22; x += 2.2) b.add(new THREE.CylinderGeometry(0.11, 0.12, 0.9, 10).translate(x, 0.57, -4.5), iron);
    const ph = lam("phonebox", () => ({ map: phoneTex() }));
    b.add(boxGeo(V(-17.6, 0.12, -7.6), V(-16.6, 2.6, -6.6)), ph);
    b.add(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 4, 1).rotateY(Math.PI / 4).translate(-17.1, 2.72, -7.1), lam("phoneTop", () => ({ color: "#b51f27" })));
    b.add(new THREE.CylinderGeometry(0.3, 0.27, 0.95, 12).translate(-10.8, 0.6, -4.7), iron);

    // ---- plaza (explanation): grass square, paved centre, flat window, giant spoon, crate + paper ----
    b.add(flat(EX[0] - 40, EX[0] + 40, -40, 40, 0.03, 20, 20), grassM);
    b.add(flat(EX[0] - 9, EX[0] + 15, -6, 6, 0.05, 12, 3), pave);
    const frameM = lam("paneFrame", () => ({ color: "#3a3f4a" }));
    const [px] = PANE;
    for (const z of [-1.3, 1.3]) b.add(boxGeo(V(px - 0.06, 0, z - 0.06), V(px + 0.06, 3.4, z + 0.06)), frameM);
    for (const y of [0.3, 3.3]) b.add(boxGeo(V(px - 0.07, y - 0.06, -1.36), V(px + 0.07, y + 0.06, 1.36)), frameM);
    const paneGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), new THREE.MeshBasicMaterial({ color: "#bfe0f5", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    paneGlass.position.set(px, 1.8, 0); paneGlass.rotation.y = Math.PI / 2; paneGlass.layers.set(NOINK); R.add(paneGlass);
    this.buildSpoon(R, b);
    const F = SPOON_FOCUS;
    b.add(boxGeo(V(F[0] - 0.32, 0.05, F[2] - 0.32), V(F[0] + 0.32, F[1] - 0.03, F[2] + 0.32)), lam("crate", () => ({ map: crateTex() })));
    b.add(flat(F[0] - 0.2, F[0] + 0.2, F[2] - 0.15, F[2] + 0.15, F[1] - 0.02, 1, 1), lam("paper", () => ({ map: paperTex() })));
    for (const [x, z, h] of [[EX[0] - 18, -14, 9], [EX[0] + 22, -16, 10], [EX[0] - 22, 12, 8.5], [EX[0] + 26, 14, 9.5], [EX[0] + 6, -24, 10], [EX[0] - 6, 22, 9]] as const)
      prop(b, kit, "tree_oak", x, 0, z, h, x);
    for (const [x, z] of [[EX[0] - 12, 7], [EX[0] + 18, 7], [EX[0] + 3, -9]]) prop(b, kit, "plant_bushLarge", x, 0, z, 1.4);

    // ---- garden at the top: floor, planters, trees, paths ----
    const Y = TOWER.h;
    b.add(flat(-24, 24, 6, 50, Y + 0.02, 12, 11), grassM);
    b.add(flat(-24, 24, 24, 28, Y + 0.05, 12, 1), pave);
    for (const [x, z, h] of [[-14, 20, 5.5], [-6, 40, 6], [9, 18, 5], [15, 42, 6.5], [-18, 36, 5], [20, 30, 5.5], [0, 46, 6], [8, 38, 4.5]] as const)
      prop(b, kit, (["tree_oak", "tree_fat", "tree-high-round"] as const)[Math.abs(x) % 3], x, Y, z, h, x * 3);
    for (const [x, z] of [[-3, 22], [6, 33], [-10, 30], [12, 24], [-1, 36]]) prop(b, kit, "plant_bushDetailed", x, Y, z, 1.2);
    this.buildRoof(R);
    setSight([]);
    b.build(R);

    // ---- dynamic: cars, beam, rays, fins, cradle ----
    this.car = makeCar("#a3262f", true); R.add(this.car.g);
    for (const [x, col] of [[-12.5, "#2f4a7a"], [11.5, "#e3e0d6"], [17.5, "#2b2b30"]] as const) {
      const c = makeCar(col, false); c.g.position.set(x, -0.13, CAR[2]); R.add(c.g); this.others.push(c);
    }
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { k: { value: 1 }, col: { value: new THREE.Color(1.0, 0.86, 0.55) } },
      vertexShader: "varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float k; uniform vec3 col; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float c = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = k * c * (0.25 + 0.75 * vY) * 0.32; gl_FragColor = vec4(col * a, 1.0); }",
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 15, 1, 40, 1, true), this.beamMat);
    this.beam.layers.set(NOINK); this.beam.frustumCulled = false; this.beam.renderOrder = 4; R.add(this.beam);
    this.spotMat = new THREE.MeshBasicMaterial({ map: discTex(), color: new THREE.Color(1.6, 1.25, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.spotMat);
    this.spot.rotation.x = -Math.PI / 2; this.spot.position.set(SPOT[0], 0.02, SPOT[2]); this.spot.scale.set(10, 7, 1);
    this.spot.layers.set(NOINK); this.spot.renderOrder = 3; R.add(this.spot);
    this.glare = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: discTex(), color: new THREE.Color(2.2, 2.0, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.glare.layers.set(NOINK); this.glare.renderOrder = 5; R.add(this.glare);
    this.buildRays(R);
    this.buildFins(R);
    // the builders' cradle (shot 13)
    const fy = 112, fz = frontZ(fy) - 1.35;
    const platM = lam("cradle", () => ({ color: "#c9cdd3" }));
    this.cradle.add(new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.18, 1.5), platM).translateY(fy - 1.7));
    for (const z of [-0.7, 0.7]) this.cradle.add(new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.06, 0.06), platM).translateY(fy - 0.65).translateZ(z));
    for (const x of [-4.1, 4.1]) { for (const z of [-0.7, 0.7]) this.cradle.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), platM).translateX(x).translateY(fy - 1.15).translateZ(z));
      this.cradle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 40, 6), iron).translateX(x).translateY(fy + 18).translateZ(0)); }
    this.cradle.position.z = fz; this.cradle.traverse((o) => { o.castShadow = true; o.receiveShadow = true; }); R.add(this.cradle);
    // foreground framing objects
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  private buildTower(R: THREE.Object3D, b: Batch) {
    const H = TOWER.h, back = TOWER.back;
    const gt = glassTex(); gt.anisotropy = 16;
    const glass = twoTone(new THREE.MeshPhongMaterial({ map: gt, specular: "#c8d8ec", shininess: 80 }), 0.4);
    const front = surf(28, 50, (u, v) => { const y = v * H, s = u * 2 - 1; return V(-s * halfW(y), y, frontZ(y, s)); }, 12, 16.8);
    const m = new THREE.Mesh(front, glass); m.castShadow = true; m.receiveShadow = true; R.add(m);
    const side = (sx: number) => surf(10, 50, (u, v) => { const y = v * H, z0 = frontZ(y, 1); return V(sx * halfW(y), y, z0 + (back - z0) * u); }, 12, 16.8, sx < 0);
    for (const sx of [-1, 1]) { const s = new THREE.Mesh(side(sx), glass); s.castShadow = true; s.receiveShadow = true; R.add(s); }
    const bk = surf(20, 50, (u, v) => { const y = v * H, s = u * 2 - 1; return V(s * halfW(y), y, back); }, 12, 16.8);
    const bm = new THREE.Mesh(bk, glass); bm.castShadow = true; R.add(bm);
    // podium + entrance canopy at street level, roof slab at the top (the garden floor)
    const stone = lam("podium", () => ({ map: stoneHD("podiumHD", ["#d9d2c5", "#cfc7b9", "#e1dbcf", "#c8c0b2"], "#9d9586") }));
    b.add(boxGeo(V(-halfW(0) - 0.3, -0.15, frontZ(0, 1) - 0.3), V(halfW(0) + 0.3, 4.2, back + 0.3), 2), stone);
    b.add(boxGeo(V(-9, 4.2, frontZ(4.2) - 3.2), V(9, 4.6, frontZ(4.2))), lam("canopy", () => ({ color: "#e8e4dc" })));
    const slab = surf(16, 16, (u, v) => { const s = u * 2 - 1, z0 = frontZ(H, s); return V(s * halfW(H), H, z0 + (back - z0) * v); }, 4, 4, true);
    const sm = new THREE.Mesh(slab, lam("slab", () => ({ color: "#b9b4aa" }))); sm.receiveShadow = true; R.add(sm);
  }

  /** the glass roof over the garden: arched steel ribs across the plan + a tinted glass skin */
  private buildRoof(R: THREE.Object3D) {
    const H = TOWER.h, back = TOWER.back, RH = TOWER.roof;
    const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#d8dde4", specular: "#ffffff", shininess: 60 }), 0.2);
    const arch = (s: number, t: number) => { const z0 = frontZ(H, s), x = s * halfW(H); return V(x, H + RH * Math.sin(Math.PI * t) ** 0.8, z0 + (back - z0) * t); };
    for (let k = 0; k <= 16; k++) {
      const s = k / 8 - 1, pts = Array.from({ length: 21 }, (_, i) => arch(s, i / 20));
      const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 6), steel); rib.castShadow = true; R.add(rib);
    }
    for (let j = 1; j < 10; j++) {
      const t = j / 10, pts = Array.from({ length: 17 }, (_, i) => arch(i / 8 - 1, t));
      R.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.07, 5), steel));
    }
    const skin = surf(16, 20, (u, v) => arch(u * 2 - 1, v), 3, 3);
    const gm = new THREE.MeshBasicMaterial({ color: "#d4ecfa", transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    const sk = new THREE.Mesh(skin, gm); sk.layers.set(NOINK); sk.renderOrder = 2; R.add(sk);
    // glass gable ends
    for (const s of [-1, 1]) {
      const shape = surf(1, 20, (u, v) => { const p = arch(s, v); return u ? p : V(p.x, H, p.z); }, 3, 3);
      const e = new THREE.Mesh(shape, gm); e.layers.set(NOINK); R.add(e);
    }
  }

  private spoonGeom() {
    const d = V(1, -0.45, 0).normalize(), P = V(...SPOON_FOCUS), Vt = V(SPOON[0], 2.2, SPOON[2]);
    const rdir = P.clone().sub(Vt).normalize(), n = rdir.clone().sub(d).normalize(), Rr = 2 * P.distanceTo(Vt);
    return { d, P, Vt, n, Rr, C: Vt.clone().addScaledVector(n, Rr) };
  }
  private buildSpoon(R: THREE.Object3D, b: Batch) {
    const { Vt, n, Rr, C } = this.spoonGeom();
    const silver = twoTone(new THREE.MeshPhongMaterial({ color: "#c9ced8", specular: "#ffffff", shininess: 110, side: THREE.DoubleSide }), 0.25);
    const cap = Math.asin(1.05 / Rr);
    const g = new THREE.SphereGeometry(Rr, 40, 12, 0, Math.PI * 2, 0, cap);
    const bowl = new THREE.Mesh(g, silver);
    // cap pole is local +y; the concave side faces -y (toward the centre) -> local -y must point along n
    bowl.position.copy(C); bowl.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().negate());
    bowl.scale.set(1, 1, 1); bowl.castShadow = true; bowl.receiveShadow = true; R.add(bowl);
    // handle: from the bowl's lower rim down into a stone planter
    const lowRim = Vt.clone().add(V(0.25, -1.0, 0));
    b.add(beamBetween(lowRim, V(SPOON[0] + 0.6, 0.6, SPOON[2]), 0.22), silver);
    b.add(new THREE.CylinderGeometry(0.9, 1.0, 0.7, 20).translate(SPOON[0] + 0.6, 0.35, SPOON[2]), lam("planter", () => ({ map: stoneHD("copeHD") })));
  }
  private buildRays(R: THREE.Object3D) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.9), fog: false });
    const add = (a: THREE.Vector3, bb: THREE.Vector3, f0: number, f1: number, id: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1, 0.045).translate(0, 0.5, 0), mat);
      m.layers.set(NOINK); m.visible = false; R.add(m); this.rays.push({ m, a, b: bb, f0, f1, id });
    };
    // flat window: parallel rays in, parallel rays straight back (down to the ground, spread out)
    const d = V(1, -0.45, 0).normalize(), back = V(-d.x, d.y, d.z);
    for (const [y, z] of [[1.0, -0.7], [1.8, 0.0], [2.6, 0.7], [2.2, -0.35], [1.4, 0.4]] as const) {
      const hit = V(PANE[0] - 0.02, y, z);
      add(hit.clone().addScaledVector(d, -9), hit, 1404, 1436, 10);
      add(hit, hit.clone().addScaledVector(back, y / -back.y), 1434, 1470, 10);
    }
    // spoon: parallel rays in, all reflected to one spot
    const { d: sd, P, Vt, n, Rr, C } = this.spoonGeom();
    const t1 = V(0, 0, 1), t2 = n.clone().cross(t1).normalize();
    for (const [a, c] of [[0, 0], [0.62, 0], [-0.62, 0], [0, 0.62], [0, -0.62], [0.42, 0.42], [-0.42, -0.42]] as const) {
      const hit = C.clone().add(Vt.clone().sub(C).addScaledVector(t2, a).addScaledVector(t1, c).normalize().multiplyScalar(Rr));
      add(hit.clone().addScaledVector(sd, -9), hit, 1534, 1566, 11);
      add(hit, P.clone(), 1576, 1608, 11);
    }
    this.rayGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: discTex(), color: new THREE.Color(3, 2.4, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.rayGlow.layers.set(NOINK); this.rayGlow.position.copy(P); this.rayGlow.visible = false; R.add(this.rayGlow);
  }
  private buildFins(R: THREE.Object3D) {
    const metal = twoTone(new THREE.MeshPhongMaterial({ color: "#b9bec6", specular: "#e0e0e0", shininess: 50 }), 0.2);
    for (let y = 92; y <= 146; y += 2.25) {
      const g = surf(20, 1, (u, v) => { const s = u * 2 - 1, z = frontZ(y, s) - 0.3 - 2.0 * v; return V(-s * (halfW(y) + 0.4), y - 0.25 * v, z); }, 4, 4);
      const m = new THREE.Mesh(g, twoTone(metal.clone() as THREE.MeshPhongMaterial, 0.2)); m.castShadow = true; m.receiveShadow = true; m.visible = false;
      (m.material as THREE.Material).side = THREE.DoubleSide; m.userData.y = y; R.add(m); this.fins.push(m);
    }
  }

  /** camera-relative sun, frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_AZ[id] ?? L.az), el = THREE.MathUtils.degToRad(SUN_EL[id] ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(f), L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 180);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky + fog (a City haze: farther than the bridge valley so the 150 m tower reads from the air) ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = 60; this.fog.far = 900;
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    // ---- car ----
    const x = id === 2 ? -999 : carX(tau);
    this.car.g.visible = x > -100;
    this.car.g.position.set(x, -0.13, CAR[2]);
    if (carRolling(tau)) { const spin = -(x - CAR[0]) / 0.35; for (const w of this.car.wheels) w.rotation.z = spin; }
    poseMelt(this.car, meltMirror(tau), meltBadge(tau), meltPanels(tau));
    // ---- beam + hot spot + glare on the face ----
    const bk = beamAt(id, f);
    this.beam.visible = this.spot.visible = this.glare.visible = bk > 0.01 && s.place === "street";
    this.glare.visible = this.glare.visible && cam.position.distanceTo(V(0, 72, frontZ(72))) > 90;
    if (this.beam.visible) {
      const src = V(SPOT[0] - 2, 72, frontZ(72) + 0.5), dst = V(SPOT[0], 0.0, SPOT[2]);
      const L2 = src.distanceTo(dst);
      this.beam.position.copy(src).add(dst).multiplyScalar(0.5);
      this.beam.quaternion.setFromUnitVectors(V(0, 1, 0), src.clone().sub(dst).normalize());
      this.beam.scale.set(1, L2, 1);
      this.beamMat.uniforms.k.value = bk * (0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3));
      this.spotMat.color.setRGB(1.6 * bk, 1.25 * bk, 0.8 * bk);
      this.glare.position.copy(src).addScaledVector(cam.position.clone().sub(src).normalize(), 8); this.glare.quaternion.copy(cam.quaternion);
      const gs = 18 * bk * Math.min(1, cam.position.distanceTo(src) / 60); this.glare.scale.set(gs, gs, 1);
    }
    // ---- light rays at the plaza ----
    for (const ry of this.rays) {
      const k = ry.id === id || (id === 11 && ry.id === 10) ? clamp01((f - ry.f0) / (ry.f1 - ry.f0)) : 0;
      ry.m.visible = k > 0.001 && s.place === "plaza";
      if (!ry.m.visible) continue;
      const dir = ry.b.clone().sub(ry.a), len = dir.length() * k;
      ry.m.position.copy(ry.a); ry.m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize()); ry.m.scale.set(1, len, 1);
    }
    const gk = id === 11 ? smooth((f - 1600) / 18) : 0;
    this.rayGlow.visible = gk > 0.01;
    if (this.rayGlow.visible) { this.rayGlow.quaternion.copy(cam.quaternion); const gsz = 0.6 + 0.25 * gk + 0.05 * Math.sin(t * 20); this.rayGlow.scale.set(gsz, gsz, 1); }
    // ---- fins (bolted on from the top down) + cradle ----
    const fk = finsAt(f), n = this.fins.length;
    this.fins.forEach((m, i) => { const shown = id >= 13 && fk * n > i; m.visible = shown; });
    this.cradle.visible = id === 13 && f < 1955;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
/** per-shot sun overrides (az from the lens axis, el): front-light the tower wides, side-light the street */
const SUN_AZ: Record<number, number> = { 2: 140, 12: 140, 13: 130, 14: 120 };
const SUN_EL: Record<number, number> = { 2: 40, 12: 42, 14: 55 };
void facadeHD;
