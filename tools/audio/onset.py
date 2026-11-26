import sys, av, numpy as np

path = sys.argv[1]
c = av.open(path)
v = c.streams.video[0] if c.streams.video else None
a = c.streams.audio[0]
print("duration", float(c.duration) / 1e6 if c.duration else None, "audio sr", a.rate,
      "video", v and (v.width, v.height, float(v.average_rate or 0)))
start = float(a.start_time * a.time_base) if a.start_time is not None else 0.0
print("audio start_time", start)

res = av.AudioResampler(format="flt", layout="mono", rate=22050)
chunks = []
for f in c.decode(a):
    for r in res.resample(f):
        chunks.append(r.to_ndarray().reshape(-1))
x = np.concatenate(chunks)
sr = 22050
print("samples", len(x), "secs", len(x) / sr)

hop, win = 256, 1024
n = (len(x) - win) // hop
frames = np.lib.stride_tricks.as_strided(x, (n, win), (x.strides[0] * hop, x.strides[0]))
spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
freqs = np.fft.rfftfreq(win, 1 / sr)
t = np.arange(n) * hop / sr + win / 2 / sr

def band(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return spec[:, m].sum(1)

low = band(30, 150)      # kick
mid = band(150, 4000)
rms = np.sqrt((frames ** 2).mean(1))
logs = np.log1p(spec * 10)
flux = np.maximum(np.diff(logs, axis=0, prepend=logs[:1]), 0).sum(1)
lowflux = np.maximum(np.diff(np.log1p(low), prepend=np.log1p(low[:1])), 0)

# per-second summary
for s in range(int(t[-1]) + 1):
    m = (t >= s) & (t < s + 1)
    if m.any():
        print(f"{s:4d}s rms={rms[m].mean():.3f} low={low[m].mean():8.1f} flux={flux[m].max():7.1f} lowflux_max={lowflux[m].max():.2f}")

# top onset peaks
score = flux / flux.std() + lowflux / lowflux.std()
idx = np.argsort(score)[::-1]
picked = []
for i in idx:
    if all(abs(t[i] - t[j]) > 0.5 for j in picked):
        picked.append(i)
    if len(picked) >= 15:
        break
print("top onsets:")
for i in sorted(picked):
    print(f"  t={t[i] + start:.3f}s score={score[i]:.2f} lowflux={lowflux[i]:.2f}")
