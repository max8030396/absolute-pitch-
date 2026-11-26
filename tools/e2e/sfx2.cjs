// 驗證音效：按下 → 鑼聲；0 星 → 0星音效；音檔可載入
const puppeteer = require('puppeteer-core');
const { pathToFileURL } = require('url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = [['hit', 21.9], ['half', 21.5], ['zero-press', 18.9], ['none', null]];

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.evaluateOnNewDocument(() => {
    window.__played = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.tagName === 'AUDIO') window.__played.push(decodeURI(this.src.split('/').pop()) + '@' + this.currentTime.toFixed(2));
      return orig.call(this);
    };
  });
  await p.setViewport({ width: 1280, height: 860 });
  await p.goto(pathToFileURL(require('path').join(__dirname, '..', '..', 'index.html')).href, { waitUntil: 'networkidle0' });
  await sleep(800);
  console.log('audio loaded:', await p.evaluate(() => [...new Set(performance.getEntriesByType('resource').map((r) => decodeURI(r.name.split('/').pop())))].filter((n) => /音效/.test(n))));
  for (const [label, at] of cases) {
    await p.evaluate(() => { window.__played = []; document.getElementById('next').click(); });
    await sleep(500);
    await p.$eval('#name', (el) => { el.value = ''; });
    await p.type('#name', label);
    await p.click('#go');
    await sleep(900);
    await p.evaluate((s) => { document.getElementById('video').currentTime = s; }, at !== null && at < 19 ? 18.5 : 21.0);
    if (at !== null) {
      await p.waitForFunction((a) => document.getElementById('video').currentTime >= a, { polling: 'raf', timeout: 10000 }, at);
      await p.keyboard.press('Space');
    }
    await p.waitForFunction(() => !document.getElementById('result').hidden, { timeout: 10000 });
    await sleep(300);
    const r = await p.evaluate(() => ({ stars: rStars.textContent, played: window.__played,
      zeroErr: null }));
    console.log(label, JSON.stringify(r));
    await p.click('#toRank'); await sleep(700);
  }
  // 音檔本身能不能解碼
  console.log('decode:', await p.evaluate(async () => {
    const t = async (src) => new Promise((res) => { const a = new Audio(encodeURI(src)); a.onloadedmetadata = () => res(src + ' ' + a.duration.toFixed(2) + 's'); a.onerror = () => res(src + ' ERROR'); });
    return [await t('敲鑼音效.wav'), await t('0星音效.mp3'), await t('結算音效.wav')];
  }));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
