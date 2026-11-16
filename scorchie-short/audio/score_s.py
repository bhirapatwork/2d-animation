# Original score for "The Building That Cooked a Car" (own synthesis from instruments.py): a bouncy comic
# pizzicato / tuba / glockenspiel tune in F at 120 bpm, sections cut to the voice (times = words.json seconds):
# hook + flash button, curious tower walk, sunny parking, "melting" droops (falling tuba + vibes glides),
# shop-row bounce, egg plinks, Luckily (bright chord) / Unluckily (tuba wah-wah), music-box explanation,
# a brass crescendo for "160 metres tall", a snare march for the fins, and a button on "glass roof".
import numpy as np
from dsp import SR, ns, rng, pan, place, make_ir, convolve_st, fades
import instruments as I

DUR = 2190 / 30
N = ns(DUR)
F = I.m2f
_seed = [100]


def R():
    _seed[0] += 1
    return rng(_seed[0])


class Band:
    def __init__(self):
        self.dry = np.zeros((2, N))
        self.send = np.zeros((2, N))

    def add(self, x, t, p=0.0, g=1.0, rev=0.18):
        x = np.asarray(x, float)
        y = pan(x, p) if x.ndim == 1 else x
        place(self.dry, y, t, g)
        place(self.send, y, t, g * rev)


CH = {"F": [53, 57, 60], "Bb": [46, 53, 58], "C": [48, 52, 55], "C7": [48, 52, 58], "Dm": [50, 53, 57], "Gm": [43, 50, 55], "A7": [45, 49, 55], "Db": [49, 53, 56]}
ROOT = {"F": 41, "Bb": 34, "C": 36, "C7": 36, "Dm": 38, "Gm": 31, "A7": 33, "Db": 37}
TUNE = [  # (beat offset, beats, midi) two-bar theme in F, our own
    (0, 0.5, 72), (0.5, 0.5, 74), (1, 1, 76), (2, 0.5, 77), (2.5, 0.5, 76), (3, 1, 72),
    (4, 0.5, 69), (4.5, 0.5, 72), (5, 1, 74), (6, 1.5, 72), (7.5, 0.5, 67)]
TUNE2 = [(0, 0.5, 74), (0.5, 0.5, 76), (1, 1, 77), (2, 0.5, 79), (2.5, 0.5, 77), (3, 1, 74),
         (4, 0.5, 72), (4.5, 0.5, 74), (5, 1, 76), (6, 2, 77)]
B = 0.5  # seconds per beat


def oompah(b, t0, chords, vel=0.55, pah=True):
    for k, c in enumerate(chords):
        tb = t0 + k * 4 * B
        for j in (0, 2):
            m = ROOT[c] + (7 if j == 2 else 0)
            b.add(I.brass(F(m), 0.38, vel, R(), "tuba"), tb + j * B, -0.1, 0.9, 0.1)
        if pah:
            for j in (1, 3):
                for m in CH[c]:
                    b.add(I.pluck(F(m + 12), 0.32 * vel, R(), 0.35, 0.4), tb + j * B, 0.3, 0.8, 0.15)


def tune(b, t0, notes, inst="glock", vel=0.5, tr=0, p=-0.3):
    for o, d, m in notes:
        if inst == "glock":
            b.add(I.glock(F(m + tr), vel, R(), 1.2), t0 + o * B, p, 0.7, 0.22)
        elif inst == "pluck":
            b.add(I.pluck(F(m + tr), vel, R(), 0.6, 0.6), t0 + o * B, p, 1.0, 0.18)
        elif inst == "vibes":
            b.add(I.vibes(F(m + tr), vel, R(), 1.4), t0 + o * B, p, 0.8, 0.26)
        elif inst == "musicbox":
            b.add(I.musicbox(F(m + tr), vel, R(), 1.4), t0 + o * B, p, 0.8, 0.26)
        elif inst == "fife":
            b.add(I.fife(F(m + tr), d * B * 0.9, vel, R()), t0 + o * B, p, 0.7, 0.16)


def brush_bar(b, t0, bars, vel=0.35):
    for k in range(bars * 8):
        b.add(I.brush(vel * (1.0 if k % 2 == 0 else 0.6), R(), 0.2), t0 + k * B / 2, 0.15, 1.0, 0.1)


def snare_march(b, t0, bars, vel=0.5):
    pat = [1, 0, 0.5, 0.4, 1, 0, 0.5, 0, 1, 0, 0.5, 0.4, 1, 0.4, 0.6, 0.5]
    for k in range(bars * 16):
        v = pat[k % 16]
        if v:
            b.add(I.snare(vel * v, R(), 0.25), t0 + k * B / 4, 0.1, 0.9, 0.12)


def stab(b, t, chord, vel=0.8, p=0.0):
    for m in CH[chord]:
        b.add(I.brass(F(m + 12), 0.22, vel, R(), "stab", scoop=-15), t, p + (m % 5 - 2) * 0.08, 0.6, 0.18)
    b.add(I.brass(F(ROOT[chord]), 0.3, vel, R(), "tuba"), t, -0.1, 0.9, 0.1)


def build():
    b = Band()
    # ---- HOOK 0-4.27: tune + oompah, a sizzling vibes trill under "melted", button stab on the flash
    oompah(b, 0.0, ["F", "C7"], 0.55)
    tune(b, 0.0, TUNE, "glock", 0.45)
    tune(b, 0.0, TUNE, "pluck", 0.35, -12, 0.25)
    stab(b, 4.27, "F", 0.85)
    b.add(I.cymbal(0.35, R(), 1.3), 4.27, 0.0, 0.5, 0.2)
    # ---- TOWER 4.5-13.4: curious tiptoe walk (pizzicato bass on the beat, vibes chords), rising on "fatter as it goes up"
    for k in range(18):
        t = 4.5 + k * B
        b.add(I.pluck(F([41, 45, 48, 45, 46, 50, 53, 50, 48, 52, 55, 52, 41, 45, 48, 52, 53, 57][k]), 0.55, R(), 0.5, 0.35), t, -0.2, 1.0, 0.15)
    for k, (t, c) in enumerate([(4.5, "F"), (6.5, "Dm"), (8.5, "Bb"), (10.5, "C7")]):
        for m in CH[c]:
            b.add(I.vibes(F(m + 12), 0.32, R(), 2.2), t, 0.3, 0.7, 0.3)
    for k in range(8):  # "it gets fatter as it goes up": rising glock steps 9.1-10.5
        b.add(I.glock(F(72 + [0, 2, 4, 5, 7, 9, 11, 12][k]), 0.38, R(), 0.9), 9.1 + k * 0.18, -0.3, 0.6, 0.25)
    b.add(I.pad([F(57), F(60), F(65)], 1.6, 0.25, R(), 0.3, 0.8), 11.9, 0, 0.8, 0.3)  # "curves inward" swell
    # ---- SUNNY 13.4-20.3: the tune, light and happy
    oompah(b, 13.43, ["F", "Bb", "C7"], 0.5)
    tune(b, 13.43, TUNE, "glock", 0.42)
    tune(b, 17.43, TUNE2[:7], "glock", 0.42)
    brush_bar(b, 13.43, 3, 0.3)
    b.add(I.triangle(0.4, R()), 16.37, 0.4, 0.6, 0.25)  # "shiny Jaguar"
    tune(b, 18.83, [(0, 0.5, 79), (0.5, 0.5, 77), (1, 1, 72)], "glock", 0.4)  # "He's back in an hour"
    # ---- MELT 20.3-27.0: each part droops: falling tuba notes + vibes glides, stopped band
    for t, m in [(21.2, 46), (22.9, 45), (25.4, 41)]:
        b.add(I.brass(F(m), 1.0, 0.65, R(), "tuba", fall=-5.0), t, -0.1, 1.0, 0.15)
        for k, mm in enumerate([84, 83, 82, 81]):
            b.add(I.vibes(F(mm), 0.25, R(), 1.0), t + 0.12 * k, 0.3, 0.6, 0.3)
    b.add(I.pad([F(53), F(56), F(60)], 6.0, 0.18, R(), 1.0, 1.0, warm=700), 20.3, 0, 0.7, 0.3)  # uneasy minor bed
    # ---- SHOPS 27.0-31.3: a grumpy low version of the tune
    oompah(b, 27.03, ["Dm", "Gm"], 0.5)
    tune(b, 27.03, TUNE, "pluck", 0.5, -12, 0.2)
    # ---- EGG 31.3-36.5: tiptoe pizzicato, plink on the crack, sizzle chord on "fries"
    for k in range(10):
        b.add(I.pluck(F([60, 64, 67, 64, 62, 65, 69, 65, 60, 64][k]), 0.4, R(), 0.4, 0.5), 31.33 + k * B, 0.2, 1.0, 0.15)
    b.add(I.glock(F(84), 0.55, R()), 33.87, -0.2, 0.7, 0.25)
    for k, m in enumerate([72, 76, 79, 84]):
        b.add(I.glock(F(m), 0.4, R()), 35.2 + 0.07 * k, -0.2, 0.6, 0.25)
    # ---- LUCKILY 36.5 (bright) / UNLUCKILY 39.3 (tuba wah-wah) / one thousand 44.9 (tiny tinkle)
    stab(b, 36.53, "F", 0.6, 0.0)
    tune(b, 36.9, TUNE2[:6], "glock", 0.38)
    for t, m in [(39.33, 41), (40.0, 40), (40.67, 39)]:
        b.add(I.brass(F(m), 0.6, 0.6, R(), "tuba", fall=-1.0), t, -0.1, 1.0, 0.12)
    b.add(I.brass(F(36), 1.8, 0.55, R(), "tuba", fall=-3.0), 41.6, -0.1, 1.0, 0.12)
    b.add(I.timpani(F(41), 0.6, R()), 41.6, 0.0, 0.8, 0.2)
    b.add(I.pad([F(36), F(43), F(48)], 2.0, 0.22, R(), 0.4, 0.8, warm=500), 41.6, 0, 0.8, 0.3)
    b.add(I.glock(F(96), 0.35, R(), 0.8), 45.1, 0.3, 0.5, 0.25)
    b.add(I.glock(F(91), 0.25, R(), 0.8), 45.35, 0.3, 0.5, 0.25)
    # ---- EXPLANATION 46.2-55.4: music box arpeggios over a soft pad; the spoon gathers -> rising shimmer to "one spot"
    for k in range(18):
        b.add(I.musicbox(F([65, 69, 72, 77][k % 4] + (0 if k < 8 else 2)), 0.32, R(), 1.2), 46.23 + k * B, -0.2, 0.8, 0.3)
    b.add(I.pad([F(53), F(57), F(60)], 4.0, 0.2, R(), 0.8, 1.0), 46.23, 0, 0.7, 0.3)
    b.add(I.pad([F(55), F(58), F(62)], 4.0, 0.2, R(), 0.8, 1.0), 50.07, 0, 0.7, 0.3)
    for k in range(12):
        b.add(I.glock(F(72 + 2 * k), 0.15 + 0.03 * k, R(), 0.7), 52.6 + k * 0.12, -0.3 + 0.05 * k, 0.6, 0.3)
    b.add(I.triangle(0.5, R()), 54.03, 0.3, 0.7, 0.3)
    # ---- 160 METRES 55.4-61.7: brass crescendo, timpani roll, stab on "parking space"
    for k, (t, c) in enumerate([(55.43, "F"), (56.9, "Bb"), (58.4, "Db"), (59.6, "C7")]):
        for m in CH[c]:
            b.add(I.brass(F(m), 1.3, 0.35 + 0.12 * k, R(), "soft"), t, (m % 3 - 1) * 0.3, 0.8, 0.2)
    for k in range(40):
        b.add(I.timpani(F(41), 0.15 + 0.4 * k / 40, R(), 0.6), 57.8 + k * 0.06, 0, 0.6, 0.2)
    stab(b, 60.37, "C7", 0.85)
    b.add(I.cymbal(0.4, R(), 1.4), 60.37, 0, 0.6, 0.2)
    # ---- FINS 61.7-67.4: proud snare march with the tune on fife, resolves on "cooled down"
    snare_march(b, 61.73, 3, 0.42)
    oompah(b, 61.73, ["F", "C7", "F"], 0.55)
    tune(b, 61.73, TUNE, "fife", 0.45, 0, 0.25)
    tune(b, 65.73, TUNE2[:6], "glock", 0.42)
    b.add(I.pad([F(65), F(69), F(72)], 1.6, 0.25, R(), 0.2, 1.2), 66.47, 0, 0.8, 0.3)
    # ---- TOP 67.4-73: question (rising vibes), "A garden" glock, button on "roof"
    for k, m in enumerate([67, 69, 71, 72]):
        b.add(I.vibes(F(m), 0.35, R(), 1.2), 67.9 + k * 0.4, 0.2, 0.7, 0.3)
    tune(b, 70.57, [(0, 0.5, 72), (0.5, 0.5, 77), (1, 1, 81)], "glock", 0.45)
    b.add(I.brass(F(41), 0.5, 0.5, R(), "tuba", fall=-2.0), 71.57, -0.1, 0.9, 0.1)
    stab(b, 72.45, "F", 0.8)
    b.add(I.cymbal(0.3, R(), 0.8), 72.45, 0.0, 0.5, 0.2)
    ir = make_ir(1.1, 5)
    out = b.dry + convolve_st(b.send, ir) * 0.9
    out[:, ns(DUR - 0.02):] = 0
    return fades(out, 0.0, 0.02)


if __name__ == "__main__":
    import sys
    from dsp import write_wav, integrated
    y = build()
    print("music", integrated(y), "LUFS")
    write_wav(sys.argv[1] if len(sys.argv) > 1 else "music_s.wav", y)
