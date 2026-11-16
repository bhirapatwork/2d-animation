# Synthesized sound effects for "The Building That Cooked a Car", every event on its picture frame (frames from
# src/videos/scorchie/story.ts + cast.ts; t = frame / 30). City bed, car arrival, footsteps, the hot-spot sizzle,
# melt creaks and drips, the egg (crack, splat, fry), envelope rustle, light-ray zings, paper catching fire,
# spanner clanks on the fins, whooshes on the big cuts, wind at the top.
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, peq, pan, place, fades, widen, colored, smooth_noise, phase, modal, make_ir, convolve_st
import sfx_gen as G

DUR = 2190 / 30
N = ns(DUR)
fr = lambda f: f / 30
_s = [500]


def R():
    _s[0] += 1
    return rng(_s[0])


# ---------------- own generators ----------------
def sizzle(dur, r, level=1.0, bright=1.0):
    """frying / hot-metal crackle: dense random clicks through a bright band + a soft hiss"""
    n = ns(dur)
    clicks = (r.uniform(size=n) < 0.004 * bright).astype(float) * r.uniform(0.3, 1.0, n)
    y = bp(clicks, 2500, 9000, 2) * 2.5 + bp(r.standard_normal(n), 3000, 10000, 1) * 0.08
    y *= 0.8 + 0.2 * smooth_noise(n, r, 3.0)
    return fades(y * level, 0.3, 0.4)


def engine(dur, r, stop_at):
    """small petrol engine: pulse train + rumble, revs falling as the car slows, off at stop_at"""
    n = ns(dur)
    t = np.arange(n) / SR
    rpm = 33 + 22 * np.clip(1 - t / stop_at, 0, 1) ** 1.5
    y = np.sin(phase(rpm)) + 0.5 * np.sin(phase(rpm * 2)) + 0.25 * np.sign(np.sin(phase(rpm * 0.5)))
    y = lp(y, 500) + 0.15 * lp(r.standard_normal(n), 300)
    env = np.clip(t / 1.2, 0, 1) * np.clip((stop_at + 0.25 - t) / 0.25, 0, 1)
    tyre = bp(r.standard_normal(n), 400, 2500, 1) * 0.12 * np.clip(1 - t / stop_at, 0, 1)
    return fades((y * 0.6 + tyre) * env, 0.05, 0.05)


def thunk(r, f=90, dec=0.08, click=0.3):
    t = tt(0.4)
    y = np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.01)))) * np.exp(-t / dec)
    y += bp(r.standard_normal(len(t)), 800, 4000, 1) * np.exp(-t / 0.006) * click
    return fades(y, 0.001, 0.05)


def plop(r, f0=900):
    """wax drip: short rising sine blip + tiny splash"""
    t = tt(0.12)
    y = np.sin(phase(f0 * (1 + 1.5 * t / 0.12))) * np.exp(-t / 0.03)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.01) * 0.2
    return fades(y, 0.001, 0.02)


def squelch(dur, r):
    """soft warping metal / wax: slow low creak glide + wet noise"""
    y = G.creak(dur, r, 40, 70, rough=0.25, noise=0.15, scale=0.6)
    n = len(y)
    y = y + lp(r.standard_normal(n), 600) * 0.15 * np.sin(np.pi * np.arange(n) / n)
    return fades(y, 0.05, 0.1)


def eggcrack(r):
    t = tt(0.25)
    y = sum(bp(r.standard_normal(len(t)), 1500, 7000, 2) * np.exp(-np.maximum(t - d, 0) / 0.006) * (t >= d) for d in (0.0, 0.018, 0.031, 0.05))
    return fades(y * 0.8, 0.0005, 0.03)


def splat(r):
    t = tt(0.35)
    y = lp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.05) + np.sin(phase(160 * (1 - 0.4 * t / 0.35))) * np.exp(-t / 0.04) * 0.6
    return fades(y, 0.001, 0.05)


def zing(r, f0=900, f1=2400, dur=0.9):
    """light ray drawn across: a bright sine glide with shimmer"""
    t = tt(dur)
    f = f0 * (f1 / f0) ** np.clip(t / (dur * 0.6), 0, 1)
    y = np.sin(phase(f)) + 0.3 * np.sin(phase(f * 2.01)) + 0.15 * np.sin(phase(f * 3.02))
    env = np.clip(t / 0.05, 0, 1) * np.exp(-np.maximum(t - dur * 0.5, 0) / 0.15)
    return fades(y * env * 0.3, 0.003, 0.05)


def whoomp(r):
    """paper catching fire: low air whoomp + rising crackle"""
    t = tt(1.2)
    y = lp(r.standard_normal(len(t)), 300) * np.exp(-t / 0.25) * np.clip(t / 0.06, 0, 1) * 1.4
    return fades(y + sizzle(1.2, r, 0.7, 1.5) * np.clip(t / 0.4, 0, 1), 0.002, 0.2)


def rustle(dur, r):
    n = ns(dur)
    y = bp(r.standard_normal(n), 1500, 8000, 2) * (smooth_noise(n, r, 14.0) > 0.2) * np.abs(smooth_noise(n, r, 9.0))
    return fades(y * 0.8, 0.02, 0.05)


def traffic(dur, r):
    """distant City traffic: low rumble with slow swells, occasional far horn-less pass-bys"""
    n = ns(dur)
    y = lp(colored(n, r, 1.0), 450) * (0.7 + 0.3 * smooth_noise(n, r, 0.15))
    for k in range(int(dur / 6)):
        t0 = r.uniform(0, dur)
        pb = G.whoosh(3.5, r, 1.8, 120, 600, 1.2, 1.0, 0.0) * 0.4
        i = ns(t0)
        e = min(n, i + len(pb))
        y[i:e] += pb[: e - i]
    return y


def chunked(gen, dur, seg=6.0, xf=0.5):
    """long beds in short crossfaded pieces (keeps the STFT-based generators small in memory)"""
    n = ns(dur)
    y = np.zeros(n)
    t0 = 0.0
    while t0 < dur:
        d = min(seg + xf, dur - t0 + xf)
        x = np.asarray(gen(d), float)
        if x.ndim > 1:
            x = x.mean(axis=0)
        k = len(x)
        w = np.ones(k)
        a = ns(xf)
        w[:a] = np.linspace(0, 1, a) if t0 > 0 else 1
        w[-a:] = np.linspace(1, 0, a)
        i = ns(t0)
        e = min(n, i + k)
        y[i:e] += (x * w)[: e - i]
        t0 += seg
    return y


# ---------------- event table ----------------
def render():
    out = np.zeros((2, N))
    send = np.zeros((2, N))
    ev = []

    def add(x, t, p=0.0, g=1.0, rev=0.1):
        x = np.asarray(x, float)
        y = pan(x, p) if x.ndim == 1 else x
        place(out, y, t, g)
        place(send, y, t, g * rev)
        ev.append((round(t, 2), round(g, 3)))

    # beds: street (0-46.2, 55.4-67.4), plaza (46.2-55.4), top (67.4-end)
    street = [(0, 46.23), (55.43, 61.73)]
    for a, b in street:
        add(widen(chunked(lambda d: traffic(d, R()), b - a), R(), 15, 0.8) * 0.5, a, 0, 0.55, 0.05)
        add(widen(chunked(lambda d: G.breeze(d, R(), 0.6), b - a), R(), 15, 0.8), a, 0, 0.35, 0.0)
    add(widen(G.bird_chirps(9.2, R(), 0.35), R()), 46.23, 0.2, 0.5, 0.2)
    add(widen(chunked(lambda d: G.breeze(d, R(), 0.7), 9.2), R()), 46.23, 0, 0.4, 0.0)
    add(widen(chunked(lambda d: G.breeze(d, R(), 1.4, 0.3, 1200), 11.5), R(), 15, 1.0), 61.73, 0, 0.6, 0.0)  # wind at height (fins, top)
    add(widen(G.bird_chirps(5.5, R(), 0.3), R()), 67.43, -0.2, 0.45, 0.25)
    add(widen(traffic(5.0, R()), R()) * 0.5, 66.2, 0, 0.5, 0.05)  # back on the street for "cooled down"

    # hot spot sizzle: under the beam shots (hook, melt, shops, egg, pay, beam onto the parking space)
    for a, b, g in [(0, 4.27, 0.5), (20.33, 27.03, 0.55), (27.03, 31.33, 0.25), (31.33, 36.53, 0.3), (36.53, 39.33, 0.2), (59.5, 61.73, 0.45), (61.73, 65.3, 0.12)]:
        add(widen(chunked(lambda d: sizzle(d, R()), b - a), R()), a, 0, g, 0.05)
    # whooshes on the big cuts
    for f, d, g in [(46, 0.5, 0.5), (79, 0.6, 0.6), (128, 0.7, 0.7), (268, 0.8, 0.6), (355, 0.7, 0.5), (522, 0.6, 0.5), (1311, 0.7, 0.6),
                    (1754, 0.6, 0.5), (1786, 0.6, 0.5), (1955, 0.7, 0.55), (1986, 0.6, 0.45), (2042, 1.2, 0.6), (2115, 0.6, 0.45)]:
        add(widen(G.whoosh(d, R(), d * 0.6, 300, 2400), R()), fr(f) - d * 0.6, 0, g, 0.1)
    # hook: drips + the mirror droop
    for t in (1.7, 2.3, 3.1):
        add(plop(R(), 800 + 300 * (t % 1)), t, 0.2, 0.4, 0.15)
    add(squelch(0.9, R()), 1.55, 0.1, 0.5, 0.1)

    # parking: engine in from the left, brake squeak, engine off, door, steps away
    add(engine(3.4, R(), 3.15), 13.43, -0.6, 0.55, 0.05)
    add(G.swing_squeak(R(), 0.4), 16.3, 0.0, 0.25, 0.05)
    add(thunk(R(), 70, 0.12, 0.2), 16.68, 0.1, 0.5, 0.08)  # door
    for k in range(4):
        add(G.stroll_step(R(), 0.4), 17.45 + k * 0.42, -0.2, 0.25, 0.08)
    # back with the coffee
    for k in range(4):
        add(G.stroll_step(R(), 0.3), 18.75 + k * 0.42, 0.1, 0.3, 0.08)
    # melt: mirror creak + drips, badge squish, panels warp, owner's gasp + dropped cup
    add(squelch(1.4, R()), 20.5, 0.2, 0.6, 0.1)
    for t in (21.55, 21.95):
        add(plop(R(), 950), t, 0.25, 0.45, 0.15)
    add(squelch(1.1, R()), 22.27, -0.1, 0.55, 0.1)
    add(plop(R(), 1200), 23.2, 0.0, 0.4, 0.15)
    add(squelch(2.4, R()), 24.0, 0.0, 0.6, 0.1)
    for t in (25.1, 25.6, 26.1):
        add(plop(R(), 700), t, -0.2, 0.4, 0.15)
    add(G.whoa(R(), 120), 24.42, -0.3, 0.45, 0.12)
    add(thunk(R(), 140, 0.04, 0.4), 24.55, -0.25, 0.4, 0.1)
    add(splat(R()), 24.6, -0.25, 0.3, 0.1)
    # shops: grumbling shopkeepers
    for k, (p, base) in enumerate([(-0.6, 115), (0.0, 190), (0.5, 130)]):
        add(G.babble(4.0, R(), base, 1.0, 3.8, 0.7), 27.1 + k * 0.3, p, 0.18, 0.15)
    # egg: steps out, crack, splat, fry
    for k in range(4):
        add(G.stroll_step(R(), 0.3), 31.6 + k * 0.45, -0.3, 0.3, 0.08)
    add(eggcrack(R()), fr(1007), 0.0, 0.7, 0.1)
    add(splat(R()), fr(1016), 0.0, 0.6, 0.1)
    add(widen(sizzle(2.0, R(), 1.0, 2.5), R()), fr(1016) + 0.05, 0, 0.55, 0.05)
    add(widen(sizzle(1.3, R(), 1.0, 3.5), R()), fr(1056), 0, 0.75, 0.05)
    # envelope rustle
    add(rustle(0.6, R()), fr(1128), 0.1, 0.4, 0.1)
    # plaza rays: zings in, zings out; the paper catches
    for f in (1404, 1434):
        add(zing(R(), 700, 1800), fr(f), -0.2, 0.45, 0.25)
    for f in (1534,):
        add(zing(R(), 700, 1800), fr(f), -0.2, 0.45, 0.25)
    add(zing(R(), 1800, 3200, 1.1), fr(1576), 0.2, 0.45, 0.25)
    add(whoomp(R()), fr(1630), 0.0, 0.6, 0.15)
    add(sizzle(1.6, R(), 0.6, 1.5), fr(1640), 0.0, 0.3, 0.1)
    # fins: spanner clanks on the kicks, bolts
    for f in (1883, 1900, 1917, 1934):
        add(G.hammer_hit(R(), 0.8), fr(f), -0.2 if f % 2 else 0.2, 0.45, 0.2)
        add(G.clink(R(), None, 0.2), fr(f) + 0.04, 0.3, 0.25, 0.2)
    # cool-down: a long relieved sigh from the street
    add(G.oof(R(), "oh", 130), 66.6, 0.2, 0.25, 0.15)
    # top: the gardener's weary "oof"
    add(G.oof(R(), "oof", 110), 71.65, 0.1, 0.35, 0.15)
    wet = convolve_st(send, make_ir(0.8, 9))
    y = out + wet * 0.6
    y[:, ns(DUR - 0.02):] = 0
    return fades(y, 0.0, 0.02), ev


if __name__ == "__main__":
    import sys
    from dsp import write_wav, integrated
    y, ev = render()
    print("sfx", integrated(y), "LUFS", len(ev), "events")
    write_wav(sys.argv[1] if len(sys.argv) > 1 else "sfx_s.wav", y)
