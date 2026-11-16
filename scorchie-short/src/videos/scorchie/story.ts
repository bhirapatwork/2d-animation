// Timeline of "The Building That Cooked a Car": shots timed to the voice words (voice/words.json, frames @ 30 fps),
// story state (car arrival, melt, beam, egg, fins) and the camera grammar of the bridge short: hard cuts on big jumps,
// symmetric smootherstep glides 18-40 f, every hold creeps in, impact kicks flip sign every frame for 7 f.
export const FPS = 30;
export const TOTAL = 2190; // voice 72.91 s
export const D0 = 0; // ground level (build.ts houses stand on D0)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const ramp = (f: number, a: number, b: number) => smooth((f - a) / (b - a));

// ---------------- places ----------------
// Street (Eastcheap) along x: road z -4..4, south pavement z -8..-4 with the shop row behind it (fronts at z = -8),
// north pavement z 4..9, the tower's base front at z = 14 (its curved face overhangs toward the street as it rises).
export const CAR: V3 = [1.5, 0, -2.45]; // parked, facing +x, kerb side (left, -z) toward the shops
export const SPOT: V3 = [1.0, 0, -4.6]; // centre of the reflected hot spot on the street
export const TOWER = { z0: 14, over: 11, h: 150, roof: 12, hw0: 21, hw1: 29, back: 52, cup: 2.6 };
/** front face z at height y and across-position u in [-1, 1] (concave both ways: overhang grows with height, edges forward) */
export const frontZ = (y: number, u = 0) => TOWER.z0 - TOWER.over * (clamp01(y / TOWER.h) ** 1.7) - TOWER.cup * u * u;
export const halfW = (y: number) => TOWER.hw0 + (TOWER.hw1 - TOWER.hw0) * clamp01(y / TOWER.h) ** 1.2;
/** explanation plaza, away from the street (own little park) */
export const EX: V3 = [260, 0, 0];
export const PANE: V3 = [EX[0], 0, 0];
export const SPOON: V3 = [EX[0] + 9, 0, 0];

// ---------------- story state (frames of the voice) ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (f: number) => number; place: "street" | "plaza" | "top" };
const same = (f: number) => f;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 128, light: "day", place: "street", tau: (f) => 980 + f },    // hook: flash-forward to the melted car
  { id: 2, a: 128, b: 403, light: "day", place: "street", tau: (f) => 330 + f * 0 }, // the tower (no car yet: before he parks)
  { id: 3, a: 403, b: 565, light: "day", place: "street", tau: same },             // he parks
  { id: 4, a: 565, b: 610, light: "day", place: "street", tau: same },             // an hour later, back with a coffee
  { id: 5, a: 610, b: 811, light: "day", place: "street", tau: same },             // mirror, badge, panels
  { id: 6, a: 811, b: 940, light: "day", place: "street", tau: same },             // shops complain
  { id: 7, a: 940, b: 1096, light: "day", place: "street", tau: same },            // the reporter's egg
  { id: 8, a: 1096, b: 1180, light: "day", place: "street", tau: same },           // developers pay
  { id: 9, a: 1180, b: 1387, light: "day", place: "street", tau: same },           // £200 m tower vs £1,000 bill
  { id: 10, a: 1387, b: 1502, light: "day", place: "plaza", tau: same },           // flat window
  { id: 11, a: 1502, b: 1663, light: "day", place: "plaza", tau: same },           // spoon
  { id: 12, a: 1663, b: 1852, light: "day", place: "street", tau: same },          // spoon 160 m tall, aimed at a parking space
  { id: 13, a: 1852, b: 2042, light: "day", place: "street", tau: same },          // sunshade fins
  { id: 14, a: 2042, b: TOTAL, light: "day", place: "top", tau: same },            // garden under a glass roof
];
/** crossfades at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 8, 10: 10, 12: 10, 14: 8 };
export const FLASH_AT = 128;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

/** car x along the street: drives in (shot 3) and stops at CAR; before that it is not on the street */
export const carX = (tau: number) => (tau < 403 ? -999 : CAR[0] - 34 * (1 - easeOut((tau - 403) / 95)));
export const carRolling = (tau: number) => tau >= 403 && tau < 498;
/** melt 0..1 of the three parts (story frames; reactions land 0-3 f before their word) */
export const meltMirror = (tau: number) => ramp(tau, 614, 660);
export const meltBadge = (tau: number) => ramp(tau, 668, 712);
export const meltPanels = (tau: number) => ramp(tau, 724, 800);
/** reflected beam strength by shot and frame (0 = off) */
export const beamAt = (id: number, f: number) => {
  switch (id) {
    case 1: return 1;
    case 2: return 0.35;
    case 3: return 0.3 + 0.5 * ramp(f, 500, 540);
    case 4: case 5: case 6: case 7: case 8: return 0.9;
    case 9: return 0.7;
    case 12: return 0.4 + 0.6 * ramp(f, 1785, 1815);
    case 13: return 0.9 * (1 - ramp(f, 1960, 2000));
    default: return 0;
  }
};
/** sunshade fins: bolted on from the top down between "bolted" and "fins" */
export const finsAt = (f: number) => (f < 1852 ? 0 : clamp01((f - 1880) / 80));
/** egg: 0 in hand, cracked at 1007 (falls), splat on the pavement, frying from 1056 */
export const EGG_CRACK = 1007, EGG_LAND = 1016, EGG_FRY = 1056;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (subject grows ~rate per frame; punch raises it for the first n frames, 8 f soft edges) */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
/** linear track between two framings over [a, b] (smoothstepped), with a push on top */
const track = (a: Shot, b: Shot, f0: number, f1: number) => (f: number): Shot => {
  const k = smooth((f - f0) / (f1 - f0));
  const A = full(a), B = full(b);
  return mixCam(A, B, k);
};

const [cx, , cz] = CAR;
export const MIRROR: V3 = [cx + 0.95, 1.02, cz - 1.08];
export const BADGE: V3 = [cx + 2.52, 0.92, cz];
const TF = frontZ(80);

// shot 1 (hook): low on the pavement, car under the hot spot, tower looming -> mirror drooping -> up at the tower
const S1a = (f: number) => dolly([7.0, 0.8, -7.3], [1.4, 2.4, -0.5], pushK(f, 0, 0.0025), { fov: 54 });
const S1b = (f: number) => dolly([MIRROR[0] + 1.1, 1.3, MIRROR[2] - 1.5], [MIRROR[0], MIRROR[1] - 0.05, MIRROR[2]], pushK(f, 46, 0.003, 0.006, 30), { fov: 38, roll: 0.04 });
const S1c = (f: number) => zoom([3.6, 0.9, -5.9], [0, 55, TF], 56, pushK(f, 79, 0.002), { roll: -0.04 });
// shot 2: the City from the air -> up the face from its foot ("fatter as it goes up") -> side profile ("curves inward")
const S2a = (f: number) => zoom([-190, 130, -300], [0, 70, 20], 34, pushK(f, 124, 0.0018, 0.004, 30));
const S2b = (f: number) => { const k = smooth((f - 268) / 80); return { pos: [-34, 3, -46] as V3, look: [0, 18 + 90 * k, frontZ(18 + 90 * k)] as V3, fov: 56, roll: 0 }; };
const S2c = (f: number) => zoom([-230, 75, 0], [0, 78, TF + 4], 40, pushK(f, 355, 0.002, 0.005, 30));
// shot 3: he parks (camera on the north pavement looking across the street) -> low behind the car, up at the tower
const S3a = (f: number) => dolly([-6, 1.7, 9.5], [-1, 1.2, -3.5], pushK(f, 403, 0.0018), { fov: 44 });
const S3b = (f: number) => zoom([9.5, 0.5, -6.6], [-6, 10, 6], 66, pushK(f, 522, 0.0025, 0.005, 30), { roll: 0.035 });
// shot 4: an hour later he strolls back along the pavement with a coffee
const S4a = (f: number) => dolly([1.6, 1.45, -6.5], [-6, 1.3, -5.8], pushK(f, 560, 0.003), { fov: 40 });
// shot 5: mirror insert, badge insert, panels + the owner
const S5a = (f: number) => dolly([MIRROR[0] + 1.25, 1.25, MIRROR[2] - 1.35], [MIRROR[0], MIRROR[1] - 0.1, MIRROR[2]], pushK(f, 610, 0.003, 0.006, 30), { fov: 36 });
const S5b = (f: number) => dolly([BADGE[0] + 1.3, 1.4, BADGE[2] - 1.1], [BADGE[0], BADGE[1] - 0.05, BADGE[2]], pushK(f, 664, 0.003, 0.006, 30), { fov: 36, roll: -0.035 });
const S5c = (f: number) => dolly([cx + 4.2, 1.25, -5.2], [cx - 1.8, 0.95, -3.7], pushK(f, 718, 0.0025, 0.005, 30), { fov: 44 });
// shot 6: along the shop row (tracking on the road)
const S6a = track({ pos: [-24, 1.7, 2.5], look: [-17, 1.6, -8] , fov: 44 }, { pos: [-6, 1.7, 2.5], look: [1, 1.5, -8], fov: 44 }, 811, 905);
const S6b = (f: number) => dolly([-6.5, 1.5, -5.6], [-9.2, 1.0, -8], pushK(f, 897, 0.003, 0.006, 30), { fov: 40, roll: 0.035 });
// shot 7: the reporter walks out with the egg -> ground close-up: crack, splat, fry
const S7a = (f: number) => dolly([-7.6, 1.45, -1.4], [-3.4, 1.0, -6.0], pushK(f, 940, 0.0025), { fov: 42 });
const S7b = (f: number) => dolly([-2.75, 0.6, -4.5], [-2.4, 0.08, -5.75], pushK(f, 1005, 0.0025), { fov: 40, roll: 0.03 });
const S7c = (f: number) => dolly([-2.55, 0.55, -4.75], [-2.4, 0.02, -5.75], pushK(f, 1052, 0.003, 0.006, 30), { fov: 38, roll: -0.03 });
// shot 8: the developers hand over an envelope
const S8a = (f: number) => dolly([-4.8, 1.55, -4.6], [1.1, 1.15, -6.1], pushK(f, 1096, 0.0025), { fov: 47 });
// shot 9: tiny developers at the foot of the huge tower -> high overhead on the tiny car
const S9a = (f: number) => { const k = smooth((f - 1200) / 110); return zoom([-1.5, 0.9, -6.6], [0, 6 + 84 * k, frontZ(6 + 84 * k) - 6 * (1 - k)], 56, pushK(f, 1180, 0.0012)); };
const S9b = (f: number) => dolly([10, 15, 5], [1.2, 0, -4.2], pushK(f, 1311, 0.002, 0.005, 30), { fov: 40 });
// shot 10: flat window: rays come in and go straight back
const [px, , pz] = PANE, [sx, , sz] = SPOON;
const S10a = (f: number) => dolly([px - 6.5, 2.2, pz + 6.4], [px - 0.9, 1.6, pz], pushK(f, 1383, 0.0022), { fov: 46 });
// shot 11: glide over to the spoon; rays converge on one spot (a paper on a crate smokes)
const S11a = (f: number) => dolly([sx - 7.4, 2.4, sz + 6.4], [sx - 0.8, 1.5, sz], pushK(f, 1502, 0.0022), { fov: 46 });
const S11b = (f: number) => dolly([sx - 3.6, 1.35, sz + 2.6], [sx - 1.2, 1.0, sz], pushK(f, 1613, 0.003, 0.006, 30), { fov: 40, roll: 0.035 });
// shot 12: "160 metres tall, out of glass": full face -> glass close -> the beam onto the parking space
const S12a = (f: number) => zoom([70, 35, -190], [0, 78, 10], 44, pushK(f, 1659, 0.0018, 0.004, 30));
const S12b = (f: number) => dolly([-26, 72, -30], [0, 76, frontZ(76)], pushK(f, 1754, 0.003), { fov: 40, roll: -0.035 });
const S12c = (f: number) => dolly([22, 6.5, -0.5], [1.0, 5.5, -3.2], pushK(f, 1786, 0.0022, 0.005, 30), { fov: 50 });
// shot 13: builders on a cradle bolt the fins -> wide of the shaded face -> cool street
const FY = 112;
const S13a = (f: number) => dolly([-14, FY + 2.5, frontZ(FY) - 13], [0, FY, frontZ(FY) + 1], pushK(f, 1852, 0.0025), { fov: 44 });
const S13b = (f: number) => zoom([75, 55, -170], [0, 92, 10], 44, pushK(f, 1955, 0.002));
const S13c = (f: number) => dolly([-6.5, 1.6, 1.8], [0.5, 1.2, -5.2], pushK(f, 1986, 0.0025), { fov: 44 });
// shot 14: crane up to the very top -> under the glass roof (garden) -> the gardener
const TOP = TOWER.h;
const S14a = (f: number) => { const k = glide((f - 2042) / 70); return { pos: [36, TOP - 40 + 75 * k, -70 + 10 * k] as V3, look: [0, TOP - 25 + 35 * k, 18] as V3, fov: 44, roll: 0 }; };
const S14b = (f: number) => dolly([-11, TOP + 3.2, 16], [2, TOP + 2.6, 32], pushK(f, 2115, 0.002), { fov: 50 });
const S14c = (f: number) => dolly([1.5, TOP + 1.45, 27.4], [3.6, TOP + 2.05, 31.3], pushK(f, 2145, 0.0025, 0.005, 30), { fov: 46, roll: 0.03 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 46, cut: true, s: S1b }, { f: 79, cut: true, s: S1c }],
  2: [{ f: 124, s: S2a }, { f: 268, cut: true, s: S2b }, { f: 355, cut: true, s: S2c }],
  3: [{ f: 399, s: S3a }, { f: 522, cut: true, s: S3b }],
  4: [{ f: 560, s: S4a }],
  5: [{ f: 610, s: S5a }, { f: 664, cut: true, s: S5b }, { f: 718, cut: true, s: S5c }],
  6: [{ f: 811, s: S6a }, { f: 897, cut: true, s: S6b }],
  7: [{ f: 940, s: S7a }, { f: 1005, cut: true, s: S7b }, { f: 1052, dur: 22, s: S7c }],
  8: [{ f: 1096, s: S8a }],
  9: [{ f: 1180, s: S9a }, { f: 1311, cut: true, s: S9b }],
  10: [{ f: 1383, s: S10a }],
  11: [{ f: 1497, s: S10a }, { f: 1500, dur: 30, s: S11a }, { f: 1613, cut: true, s: S11b }],
  12: [{ f: 1659, s: S12a }, { f: 1754, cut: true, s: S12b }, { f: 1786, cut: true, s: S12c }],
  13: [{ f: 1852, s: S13a }, { f: 1955, cut: true, s: S13b }, { f: 1986, cut: true, s: S13c }],
  14: [{ f: 2038, s: S14a }, { f: 2115, cut: true, s: S14b }, { f: 2145, cut: true, s: S14c }],
};
void rolled;

// impact kicks (frames): the image offset flips sign every frame and decays over 7 f
const KICKS: [number, number][] = [[48, 0.6], [EGG_LAND, 0.5], [1883, 0.4], [1900, 0.4], [1917, 0.4]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = Math.floor(f - f0 + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 9 },                     // hook wide on the car, focus = look
  { f: 46, cInf: 14, focus: () => MIRROR }, // mirror insert
  { f: 79, cInf: 0 },                    // up at the tower
  { f: 403, cInf: 0 },                   // parking (busy wide)
  { f: 565, cInf: 11 },                  // owner strolls back (focus = look)
  { f: 610, cInf: 14, focus: () => MIRROR },
  { f: 664, cInf: 14, focus: () => BADGE },
  { f: 718, cInf: 10, focus: () => [cx - 2.4, 1.6, -4.65] }, // owner's eyes
  { f: 811, cInf: 0 },                   // shop row track
  { f: 897, cInf: 11 },                  // shopkeeper MS
  { f: 940, cInf: 8 },                   // reporter
  { f: 1005, cInf: 14 },                 // egg close-ups
  { f: 1096, cInf: 10, focus: () => [0.4, 1.6, -5.9] },
  { f: 1180, cInf: 0 },                  // tower / overhead
  { f: 1387, cInf: 6 },                  // plaza
  { f: 1613, cInf: 12 },                 // spoon focus close
  { f: 1663, cInf: 0 },                  // tower / glass / beam
  { f: 1852, cInf: 8 },                  // builders on the cradle
  { f: 1955, cInf: 0 },
  { f: 1986, cInf: 9 },                  // cool street
  { f: 2042, cInf: 0 },
  { f: 2115, cInf: 7 },                  // garden
  { f: 2145, cInf: 12 },                 // gardener close
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 1387, b: 1502, kit: "plant_bushDetailed", pos: [PANE[0] - 4.6, 0, 5.2], s: 1.1, yaw: 0.4 },
  { a: 2115, b: 2145, kit: "plant_bush", pos: [-8.8, TOWER.h, 19.6], s: 0.9, yaw: 1.2 },
];
