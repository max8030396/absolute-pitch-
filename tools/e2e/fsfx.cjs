const puppeteer = require('puppeteer-core'); const fs = require('fs'); const { pathToFileURL } = require('url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(pathToFileURL(require('path').join(__dirname, '..', '..', 'index.html')).href, { waitUntil: 'networkidle0' });
  // 1) 渲染預覽並分析每個節拍的音量
  const r = await p.evaluate(async () => {
    const buf = await FinaleSfx.preview(); const d = buf.getChannelData(0), sr = buf.sampleRate;
    const win = (a, z) => { let pk = 0, ss = 0; for (let i = Math.floor(a * sr); i < Math.floor(z * sr); i++) { pk = Math.max(pk, Math.abs(d[i])); ss += d[i] * d[i]; } return { peak: +pk.toFixed(2), rms: +Math.sqrt(ss / ((z - a) * sr)).toFixed(3) }; };
    const T = Finale.TIMELINE, s = (ms) => ms / 1000, end = buf.duration;
    const pon = s(T.third + T.sound), zuza = s(T.second + T.sound), go = s(T.gogo), goEnd = s(T.gogo + T.gogoDur), don = s(T.first + T.sound);
    const beats = { silence0: win(0, s(T.slam) - 0.02), slam: win(s(T.slam), s(T.slam) + 0.4), pon: win(pon, pon + 0.32), zuza: win(zuza, zuza + 0.52), gogo_start: win(go, go + 0.3), gogo_end: win(goEnd - 0.3, goEnd), don: win(don, don + 0.42), tail: win(end - 0.4, end) };
    // 轉 16-bit WAV
    const n = d.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const ws = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    let bin = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return { beats, wav: btoa(bin) };
  });
  fs.writeFileSync(process.argv[2], Buffer.from(r.wav, 'base64'));
  console.log(JSON.stringify(r.beats, null, 0));
  // 2) 實際頒獎流程：記錄每個音效被呼叫的時間
  await p.evaluate(() => {
    window.__calls = []; const t0 = { v: 0 }; window.__t0 = t0;
    for (const k of ['slam', 'pon', 'zuza', 'gogo', 'don', 'kira', 'stop']) { const f = FinaleSfx[k]; FinaleSfx[k] = (...a) => { __calls.push(k + '@' + Math.round(performance.now() - __t0.v)); return f(...a); }; }
    localStorage.clear(); [['A', 0.05], ['B', 0.2], ['C', 0.4]].forEach(([n, d], i) => Board.add({ name: n, press: 22, diff: d, stars: 5, at: i }));
    document.getElementById('toBoard').click();
  });
  await sleep(400);
  await p.evaluate(() => { __t0.v = performance.now() + 250; document.getElementById('final').click(); });
  await sleep(await p.evaluate(() => Finale.TIMELINE.done + 700));
  await p.click('#finBack'); await sleep(500);
  console.log('calls (ms after ceremony start):', (await p.evaluate(() => __calls)).join(', '));
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
