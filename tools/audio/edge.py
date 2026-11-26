import sys, av, numpy as np
c = av.open(sys.argv[1]); a = c.streams.audio[0]; sr = 48000
res = av.AudioResampler(format="flt", layout="mono", rate=sr)
x = np.concatenate([r.to_ndarray().reshape(-1) for f in c.decode(a) for r in res.resample(f)])
noise = np.abs(x[int(21.0*sr):int(21.8*sr)]).max()
i0 = int(21.8*sr) + np.argmax(np.abs(x[int(21.8*sr):int(22.0*sr)]) > noise*3)
print("noise floor peak", noise, "drum onset", i0/sr)
# envelope 2ms windows, find where high-band-ish energy rises again (vocal/next hit) after 22.2
w = int(0.002*sr)
seg = x[int(22.15*sr):int(22.45*sr)]
env = np.sqrt((seg[:len(seg)//w*w].reshape(-1,w)**2).mean(1))
base = np.median(env[:40])
j = np.argmax(env > base*3)
print("drum tail baseline", base, "next sound onset", 22.15 + j*0.002)
