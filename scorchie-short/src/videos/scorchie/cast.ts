// Our cast for "The Building That Cooked a Car" as lit flat sprites in the 3D world (same machinery as the bridge
// short: one canvas per distinct drawing, yaw-only billboards shaded by cardShade(), contact blobs, unlit fx cards,
// everything on the NOINK layer). stage(id, f, cam) lists who stands where for shot id at frame f.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxPuff, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, SKINS, INK, Prop } from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, CAR, carX, EGG_CRACK, EGG_LAND, EGG_FRY, TOWER, frontZ, PANE, SPOON, beamAt, SPOT } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};



// ---------------- our cast ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const hair = (h: string, extra: Partial<Outfit>): Outfit => ({ jacket: "#3b3f52", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: h, ...extra });
const OWNER = hair("#3a2a20", { jacket: "#2f4a7a", pants: "#2a2f3d", boots: "#2a1e1a", skin: SKINS[0] });
const REPORTER = hair("#8a4e2c", { jacket: "#c9a46a", pants: "#4a4f63", boots: "#4a3426", skin: SKINS[2] });
const DEV1 = hair("#d9d4cb", { jacket: "#6b7280", pants: "#4b505c", boots: "#1f1b1f", skin: SKINS[1], build: "stout", moustache: "#bfb8ad" });
const DEV2 = hair("#22201f", { jacket: "#3d4552", pants: "#2f343d", boots: "#1f1b1f", skin: SKINS[3] });
const SHOPS: Outfit[] = [
  hair("#5a3b2a", { jacket: "#3f7fb5", pants: "#3b3f52", skin: SKINS[1], moustache: "#5a3b2a" }),
  hair("#b0472f", { jacket: "#8c3b4a", pants: "#3b3f52", dress: "#d9a441", skin: SKINS[0] }),
  hair("#2a201a", { jacket: "#5d7a3a", pants: "#3b3f52", skin: SKINS[3], build: "stout" }),
];
const BUILDER = (v: number): Outfit => ({ jacket: "#f08a2c", pants: "#3b4a6a", boots: "#3a2a22", hat: "cap", cap: "#f3d02c", skin: SKINS[v % 4], belt: "#e9eef2" });
const GARDENER = hair("#7a5030", { jacket: "#5d8a3a", pants: "#6b5a44", boots: "#4a3426", skin: SKINS[2], hat: "cap", cap: "#d9c27a" });
const VISITORS: Outfit[] = [
  hair("#3a2a20", { jacket: "#c25a7a", pants: "#3b3f52", dress: "#5a8fc2", skin: SKINS[1] }),
  hair("#d8b45a", { jacket: "#3f6fb5", pants: "#3b3f52", skin: SKINS[0] }),
];

type Pose = { x: number; z: number; y?: number; expr: Expr; prop?: Prop; mode?: FrontOpts["mode"]; dir?: [number, number]; walk?: number; wave?: number; look?: number; facing?: -1 | 0 | 1; scale?: number; blob?: boolean };
/** one character: walking (dir + walk speed m/s) picks front / side view from the camera, standing faces the lens */
const put = (cam: CamInfo, out: Stage, i: number, o: Outfit, okey: string, f: number, p: Pose) => {
  const t = f / FPS, y = p.y ?? D0;
  const who: Who = { i, o, okey };
  if (p.dir && p.walk) {
    const phase = q((t * p.walk / 1.4 + hh(i, 5)) % 1, 120);
    const view = viewOf(cam, p.x, p.z, p.dir[0], p.dir[1]);
    const fo: FrontOpts = { mode: "stroll", phase, expr: p.expr, prop: p.prop ?? null, blink: lidAt(t, i) };
    const so: SideOpts = { mode: "march", phase, expr: p.expr, stomp: 0.5, stride: 0.875 * view.fs };
    out.places.push(person(cam, who, p.x, y, p.z, view, fo, so, p.scale ?? 1));
  } else {
    const fo: FrontOpts = { mode: p.mode ?? "stand", expr: p.expr, prop: p.prop ?? null, wave: p.wave, look: p.look ?? 0, facing: p.facing ?? 0, blink: lidAt(t, i) };
    out.places.push(person(cam, who, p.x, y, p.z, { side: false, mirror: false }, fo, {}, p.scale ?? 1));
  }
  if (p.blob !== false) blob(out, p.x, y, p.z, p.scale ?? 1);
};

// ---- effect drawings ----
const eggRaw = (p: Pen) => { p.ell(150, 100, 120, 70, "rgba(250,248,240,0.82)", 0); p.ell(150, 100, 118, 68, null, 3); p.ell(140, 95, 34, 30, "#f7b21c", 5); p.ell(132, 86, 10, 7, "#ffe08a", 0); };
const eggFried = (k: number) => (p: Pen) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = 1 + 0.12 * Math.sin(i * 2.3) + 0.08 * Math.sin(i * 5.1); pts.push([150 + 128 * r * Math.cos(a), 100 + 76 * r * Math.sin(a)]); }
  p.poly(pts, "#c98a3c", 6); // crispy brown lace
  p.poly(pts.map(([x, y]) => [150 + (x - 150) * (0.93 - 0.08 * k), 100 + (y - 100) * (0.92 - 0.08 * k)]), "#fdfbf4", 0);
  for (let i = 0; i < 6; i++) p.ell(110 + i * 17, 70 + (i % 3) * 25, 6 + k * 4, 5 + k * 3, "#f1ece0", 2); // bubbles
  p.ell(140, 95, 34, 30, "#f6a514", 5); p.ell(132, 86, 10, 7, "#ffd56a", 0);
};
const eggWhole = (p: Pen) => p.ell(100, 100, 52, 70, "#fbf3e2", 8);
const shell = (p: Pen) => { p.poly([[40, 120], [80, 60], [110, 100], [140, 50], [160, 120]], "#fbf3e2", 7); };
const scorch = (p: Pen) => { for (let i = 0; i < 9; i++) p.ell(150 + 90 * Math.sin(i * 2.1), 160 - 40 * Math.cos(i * 1.7), 60 - i * 3, 40 - i * 2, `rgba(40,26,20,${0.18 + 0.04 * (i % 3)})`, 0); };
const steam = (u: number) => (p: Pen) => {
  const a = 0.75 * (1 - u);
  for (let i = 0; i < 3; i++) { const yy = 260 - u * 180 - i * 50; p.ell(150 + 30 * Math.sin(u * 6 + i * 2), yy, 40 + u * 40, 32 + u * 30, `rgba(255,255,255,${a * (1 - i * 0.25)})`, 0); }
};
const smoke = (u: number) => (p: Pen) => {
  const a = 0.8 * (1 - u);
  for (let i = 0; i < 3; i++) p.ell(150 + 25 * Math.sin(u * 5 + i), 240 - u * 170 - i * 45, 36 + u * 46, 30 + u * 36, `rgba(90,82,92,${a * (1 - i * 0.22)})`, 0);
};
const drop = (p: Pen) => p.poly([[50, 10], [78, 70], [72, 92], [50, 100], [28, 92], [22, 70]], "#bfe6ff", 6);
const cupDown = (p: Pen) => { p.ell(170, 130, 120, 44, "rgba(110,66,36,0.9)", 0); p.poly([[60, 60], [150, 40], [160, 90], [70, 110]], "#f4efe4", 6); p.ell(60, 85, 12, 26, "#ffffff", 5); };
const wavy = (u: number) => (p: Pen) => {
  for (let k = 0; k < 4; k++) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) pts.push([40 + k * 60 + 10 * Math.sin(i * 0.9 + u * 12 + k), 380 - i * 17]);
    p.line(pts, "rgba(255,248,228,0.12)", 3, false);
  }
};
const flame = (u: number) => (p: Pen) => {
  const h = 1 + 0.15 * Math.sin(u * 40);
  p.poly([[150, 280], [95, 210], [120, 150 - 40 * h], [150, 60 - 30 * h], [185, 150 - 40 * h], [205, 210]], "#ff8a2a", 7);
  p.poly([[150, 270], [122, 220], [150, 140 - 20 * h], [178, 220]], "#ffd34a", 0);
};
const fx = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });

// ---- places (all on the south pavement unless said) ----
const PZ = -5.7; // pavement walking line
const SHOPKEEP: [number, number][] = [[-20.2, -7.55], [-13.4, -7.6], [-9.2, -7.55]];
const REP_DOOR: [number, number] = [-6.4, -7.7], REP_SPOT: [number, number] = [-2.75, -6.05], EGG: V3 = [-2.4, 0, -5.75];

const owner = (cam: CamInfo, out: Stage, f: number, id: number) => {
  const cx = CAR[0];
  if (id === 3) {
    if (f < 500) return;
    if (f < 522) put(cam, out, 1, OWNER, "own", f, { x: cx + 0.6, z: -0.9, expr: "smile" });
    else { const x = cx - 1.2 - 1.3 * (f - 522) / FPS; put(cam, out, 1, OWNER, "own", f, { x, z: PZ, expr: "smile_closed", dir: [-1, 0], walk: 1.3 }); }
  } else if (id === 4) {
    const x = -7.2 + 1.3 * (f - 556) / FPS;
    put(cam, out, 1, OWNER, "own", f, { x, z: PZ, expr: "whistle", prop: "cup", dir: [1, 0], walk: 1.3 });
  } else if (id === 5) {
    const shock = f >= 734;
    put(cam, out, 1, OWNER, "own", f, { x: cx - 2.4, z: -4.65, expr: shock ? "shock" : "nervous", prop: shock ? null : "cup", facing: 1 });
    if (shock) fx(out, "cupDown", 300, 160, cupDown, cx - 1.7, 0.02, -4.4, 0.75, 0.4, { flat: true, rot: 0.5 });
  } else if (id === 6) {
    put(cam, out, 1, OWNER, "own", f, { x: cx - 2.2, z: -5.4, expr: "dazed", facing: 1 });
    fx(out, "cupDown", 300, 160, cupDown, cx - 1.5, 0.02, -4.95, 0.75, 0.4, { flat: true, rot: 0.5 });
  } else if (id === 8) {
    put(cam, out, 1, OWNER, "own", f, { x: cx + 1.0, z: -6.6, expr: f > 1140 ? "relief_open" : "dazed", facing: -1 });
  } else if (id === 9 || id === 12) {
    put(cam, out, 1, OWNER, "own", f, { x: cx - 2.4, z: -5.3, expr: "dazed" });
  } else if (id === 13) {
    put(cam, out, 1, OWNER, "own", f, { x: cx - 1.0, z: -5.6, expr: f > 2004 ? "relief" : "pained", facing: 1 });
  }
};

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.place === "street") {
    owner(cam, out, f, id);
    // shopkeepers at their doors (complaining in shot 6, relieved in 13)
    if (id === 6 || id === 13) SHOPKEEP.forEach(([x, z], k) => {
      const expr: Expr = id === 13 ? (["smile", "relief", "smile_closed"] as Expr[])[k] : (["pained", "stern", "shock"] as Expr[])[k];
      put(cam, out, 10 + k, SHOPS[k], "shop" + k, f, { x, z, expr, wave: id === 6 && k === 1 ? q(Math.sin(t * 7), 20) : undefined, facing: k === 2 ? -1 : 0 });
    });
    if (id === 6 || id === 7 || id === 8) SHOPKEEP.forEach(([x], k) => {
      fx(out, "scorch", 300, 300, scorch, x + 0.9, 0.025, -7.4, 1.6, 1.1, { flat: true, rot: k });
      const u = q(((t * 0.6 + k * 0.33) % 1), 30);
      fx(out, `smoke${u}`, 300, 300, smoke(u), x + 0.9, 0.9, -7.5, 1.4, 1.4, { soft: true });
    });
    // the reporter and the egg
    if (id === 7) {
      const w = clamp01((f - 948) / 52), x = REP_DOOR[0] + (REP_SPOT[0] - REP_DOOR[0]) * smooth(w), z = REP_DOOR[1] + (REP_SPOT[1] - REP_DOOR[1]) * smooth(w);
      const walking = f >= 948 && f < 1000;
      put(cam, out, 3, REPORTER, "rep", f, walking ? { x, z, expr: "smile", prop: "egg", dir: [REP_SPOT[0] - REP_DOOR[0], REP_SPOT[1] - REP_DOOR[1]], walk: 1.2 }
        : { x, z, expr: f < EGG_CRACK ? "smile" : f < EGG_FRY ? "grin" : "laugh", prop: f < EGG_CRACK ? "egg" : null, facing: 1 });
      if (f >= EGG_CRACK && f < EGG_LAND) { const u = (f - EGG_CRACK) / (EGG_LAND - EGG_CRACK); fx(out, "eggWhole", 200, 200, eggWhole, EGG[0], 1.05 * (1 - u * u) + 0.06, EGG[2], 0.11, 0.11); }
      if (f >= EGG_LAND) {
        const k = q(clamp01((f - EGG_FRY) / 30), 10);
        fx(out, f < EGG_FRY ? "eggRaw" : `eggFry${k}`, 300, 200, f < EGG_FRY ? eggRaw : eggFried(k), EGG[0], 0.012, EGG[2], 0.36, 0.24, { flat: true, rot: 0.3 });
        fx(out, "shell", 200, 160, shell, EGG[0] + 0.3, 0.012, EGG[2] - 0.12, 0.09, 0.07, { flat: true, rot: 1.1 });
        if (f >= EGG_LAND && f < EGG_LAND + 5) { const u = (f - EGG_LAND) / 5; fx(out, `burst${q(u, 30)}`, 500, 500, (p) => fxBurst(p, q(u, 30), "#fff6c8", 10, 40, 200), EGG[0], 0.12, EGG[2], 0.5, 0.5); }
      }
      if (f >= EGG_FRY) for (let k = 0; k < 2; k++) {
        const u = q(((t * 0.9 + k * 0.5) % 1), 30);
        fx(out, `steam${u}`, 300, 300, steam(u), EGG[0] + 0.05 - k * 0.08, 0.2, EGG[2] + 0.02, 0.32, 0.32, { soft: true });
      }
    }
    if (id === 13 && f >= 1986) put(cam, out, 3, REPORTER, "rep", f, { x: -4.2, z: -6.2, expr: "pained", prop: "pan", facing: 1 });
    // developers
    if (id === 8) {
      put(cam, out, 4, DEV1, "dev1", f, { x: CAR[0] - 0.9, z: -5.3, expr: "smile", prop: f > 1128 ? "envelope" : null, facing: 1 });
      put(cam, out, 5, DEV2, "dev2", f, { x: CAR[0] - 2.2, z: -6.7, expr: "smile_closed", facing: 1 });
    }
    if (id === 9) {
      put(cam, out, 4, DEV1, "dev1", f, { x: -0.9, z: -4.9, expr: f < 1311 ? "smile" : "nervous" });
      put(cam, out, 5, DEV2, "dev2", f, { x: 0.2, z: -5.3, expr: f < 1311 ? "grin" : "nervous" });
    }
    // builders on the cradle bolting the fins
    if (id === 13 && f < 1955) {
      const fy = 112, z = frontZ(fy) - 1.35;
      [-2.6, 1.4].forEach((x, k) => {
        const hit = Math.floor((f - 1883) / 17), u = (f - 1883) % 17;
        put(cam, out, 20 + k, BUILDER(k), "build" + k, f, { x, y: fy - 1.6, z, expr: k ? "grin" : "stern", prop: "spanner", wave: hit >= 0 && hit < 4 && u < 6 ? 1 : undefined, blob: false });
      });
    }
    // heat haze over the hot spot
    const bk = beamAt(id, f);
    if (bk > 0.5 && (id === 1 || id === 5 || id === 7 || id === 12)) for (let k = 0; k < 3; k++) {
      const u = q(((t * 0.8 + k * 0.33) % 1), 30);
      fx(out, `haze${u}`, 300, 400, wavy(u), SPOT[0] - 1.6 + k * 1.5, 1.1, SPOT[2] + 0.3, 1.2, 1.6, { soft: true });
    }
  }
  if (s.place === "plaza" && id === 11) {
    // the paper on the crate at the spoon's focus smokes, then catches
    const F = SPOON_FOCUS;
    if (f >= 1615) { const u = q(((t * 1.1) % 1), 30); fx(out, `smoke${u}`, 300, 300, smoke(u), F[0], F[1] + 0.35, F[2], 0.7, 0.7, { soft: true }); }
    if (f >= 1630) { const u = q((t * 3) % 1, 20); fx(out, `flame${u}`, 300, 300, flame(u), F[0], F[1] + 0.16, F[2] + 0.02, 0.32, 0.32); }
  }
  if (s.place === "top") {
    const Y = TOWER.h;
    put(cam, out, 30, GARDENER, "gard", f, { x: 3.6, y: Y, z: 31.3, expr: "pained", wave: q(Math.sin(t * 5), 20), facing: -1 });
    put(cam, out, 31, VISITORS[0], "vis0", f, { x: -1.8, y: Y, z: 34.5, expr: "nervous", wave: q(Math.sin(t * 8 + 1), 20) });
    put(cam, out, 32, VISITORS[1], "vis1", f, { x: 6.8, y: Y, z: 36.5, expr: "pained" });
    for (let k = 0; k < 2; k++) {
      const u = (t * 1.2 + k * 0.5) % 1;
      fx(out, "drop", 100, 110, drop, 3.6 + 0.28 * (k ? 1 : -1), Y + 1.95 - 0.35 * u, 31.3 - 0.05, 0.07, 0.08);
    }
    const u = q((t * 0.7) % 1, 30);
    fx(out, `haze${u}`, 300, 400, wavy(u), 2.5, Y + 3.2, 33, 3, 4, { soft: true });
  }
  return out;
};
/** where the spoon focuses (world.ts builds the crate and paper there) */
export const SPOON_FOCUS: V3 = [SPOON[0] - 1.25, 0.86, SPOON[2]];
void PANE; void TOWER; void INK; void bodyFront; void bodySide; void fxPuff; void fxShadow; void fxContact; void THREE; void cardShade; void blobMaterial; void CARD_K; void NOINK; void carX;
export { FPS };
