// 最終結算的合成音效（Web Audio，不需要音檔），每個函式對應頒獎動畫的一個節拍
(function () {
  let ctx = null, master = null, noiseBuf = null;
  let at = null;   // 預覽渲染時用的絕對時間；平常為 null，表示「現在」

  function ensure() {
    if (at != null) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (!master) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(comp).connect(ctx.destination);
    }
    return true;
  }

  // ── 基本零件 ──
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function tone(type, f0, f1, t, dur, peak, attack = 0.004) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, attack, dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }
  function noise(t, dur, peak, filter, f0, f1 = f0, q = 1, attack = 0.003) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, attack, dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random()); s.stop(t + attack + dur + 0.05);
  }
  const now = () => (at != null ? at : ctx.currentTime + 0.01);

  // ── 各節拍 ──
  // 標題砸下：短促低音咚
  function slam() {
    if (!ensure()) return; const t = now();
    tone('sine', 150, 45, t, 0.35, 0.9);
    noise(t, 0.12, 0.35, 'lowpass', 1200, 300);
  }
  // 第 3 名「ポン」：彈跳音
  function pon() {
    if (!ensure()) return; const t = now();
    tone('sine', 520, 1040, t, 0.18, 0.55);
    tone('triangle', 1040, 2080, t, 0.12, 0.18);
    tone('sine', 120, 60, t, 0.2, 0.5);
    noise(t, 0.06, 0.2, 'highpass', 4000);
  }
  // 第 2 名「ズザッ」：滑地摩擦 + 悶響
  function zuza() {
    if (!ensure()) return; const t = now();
    noise(t, 0.28, 0.5, 'bandpass', 3800, 500, 1.4, 0.02);
    tone('sine', 110, 50, t + 0.2, 0.3, 0.8);
    noise(t + 0.2, 0.1, 0.3, 'lowpass', 900);
  }
  // 「ゴゴゴゴ」：低頻轟鳴 + 越來越快的小鼓連打，漸強 dur 秒
  function gogo(dur = 1) {
    if (!ensure()) return; const t = now();
    // 轟鳴
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'lowpass'; f.frequency.value = 140; f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(2.2, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    lfo.frequency.value = 14; lg.gain.value = 0.35;   // 顫動
    lfo.connect(lg).connect(g.gain);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    // 小鼓連打：間隔 90ms → 28ms，音量漸強
    let x = t, gap = 0.09;
    while (x < t + dur - 0.02) {
      const k = (x - t) / dur;
      noise(x, 0.05, 0.15 + 0.6 * k, 'bandpass', 1800, 1800, 0.8, 0.002);
      tone('triangle', 190, 160, x, 0.04, 0.1 + 0.3 * k);
      x += gap; gap = Math.max(0.028, gap * 0.9);
    }
  }
  // 第 1 名「ドン!」：重低音爆擊 + 銅鈸
  function don() {
    if (!ensure()) return; const t = now();
    // 低音爆擊（加一點破音）
    const o = ctx.createOscillator(), ws = ctx.createWaveShaper(), g = ctx.createGain();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const v = i / 512 - 1; curve[i] = Math.tanh(v * 3); }
    ws.curve = curve;
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.7);
    env(g, t, 0.85, 0.003, 0.9);
    o.connect(ws).connect(g).connect(master);
    o.start(t); o.stop(t + 1);
    tone('square', 70, 40, t, 0.25, 0.18);
    // 衝擊的噪音頭
    noise(t, 0.18, 0.45, 'lowpass', 3000, 400);
    // 銅鈸
    noise(t + 0.01, 1.6, 0.35, 'highpass', 6000, 4000, 0.7, 0.005);
    noise(t + 0.01, 0.9, 0.25, 'bandpass', 9000, 7000, 1.5, 0.005);
  }
  // 閃光：叮
  function kira(pitch = 0) {
    if (!ensure()) return; const t = now();
    const base = [2093, 2637, 3136][pitch % 3];
    tone('sine', base, base, t, 0.5, 0.18, 0.002);
    tone('sine', base * 1.5, base * 1.5, t + 0.06, 0.4, 0.1, 0.002);
  }

  // 關掉結算畫面時，讓還在響的聲音淡出
  function stop() {
    if (!ctx || !master) return;
    const m = master;
    master = null;
    m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    setTimeout(() => m.disconnect(), 400);
  }

  // 把整段頒獎音效渲染成 AudioBuffer（時間點與 finale.js 相同），方便單獨試聽
  async function preview() {
    const sr = 44100, off = new OfflineAudioContext(1, sr * 6, sr);
    const saved = [ctx, master, noiseBuf];
    ctx = off;
    noiseBuf = off.createBuffer(1, sr * 2, sr);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const comp = off.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 6;
    master = off.createGain(); master.gain.value = 0.7;
    master.connect(comp).connect(off.destination);
    const plan = [[0.3, slam], [1.08, pon], [1.98, zuza], [2.7, () => gogo(1.15)], [3.88, don], [4.23, () => kira(0)], [4.43, () => kira(2)]];
    for (const [sec, fn] of plan) { at = sec; fn(); }
    at = null;
    [ctx, master, noiseBuf] = saved;
    return off.startRendering();
  }

  window.FinaleSfx = { slam, pon, zuza, gogo, don, kira, stop, preview };
})();
