// 驗證：按下後 0.5 秒結算、影片暫停；沒按則卡點 +3 秒結算
const puppeteer = require('puppeteer-core');
const { pathToFileURL } = require('url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = [['early', 20.2], ['late', 22.5], ['none', null]];

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.setViewport({ width: 1280, height: 860 });
  await p.goto(pathToFileURL(require('path').join(__dirname, '..', '..', 'index.html')).href, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  for (const [label, at] of cases) {
    await p.evaluate(() => { document.getElementById('next').click(); });
    await sleep(500);
    await p.$eval('#name', (el) => { el.value = ''; });
    await p.type('#name', label);
    await p.click('#go');
    await sleep(900);
    await p.evaluate(() => { document.getElementById('video').currentTime = 19.8; });
    let pressT = null, shownAfterMs = null;
    if (at !== null) {
      await p.waitForFunction((a) => document.getElementById('video').currentTime >= a, { polling: 'raf', timeout: 10000 }, at);
      await p.keyboard.press('Space');
      const t0 = Date.now();
      const stillOpenAt300 = await (async () => { await sleep(300); return p.$eval('#result', (r) => r.hidden); })();
      await p.waitForFunction(() => !document.getElementById('result').hidden, { timeout: 3000 });
      shownAfterMs = Date.now() - t0;
      pressT = stillOpenAt300 ? 'hidden@300ms' : 'SHOWN-TOO-EARLY';
    } else {
      await p.waitForFunction(() => !document.getElementById('result').hidden, { timeout: 10000 });
    }
    const r = await p.evaluate(() => ({ press: rPress.textContent, diff: rDiff.textContent, stars: rStars.textContent,
      paused: video.paused, t: video.currentTime.toFixed(2) }));
    console.log(label, JSON.stringify({ ...r, check300: pressT, shownAfterMs }));
    if (label === 'late') await p.screenshot({ path: process.argv[2] + '-late.png' });
    await p.click('#toRank'); await sleep(700);
  }
  console.log('board:', await p.evaluate(() => [...document.querySelectorAll('#boardBody tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ')).join(' | ')));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
