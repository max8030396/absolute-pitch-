const puppeteer = require('puppeteer-core');
const { pathToFileURL } = require('url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [out, W, H, n] = [process.argv[2], +(process.argv[3] || 1280), +(process.argv[4] || 860), +(process.argv[5] || 5)];

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.evaluateOnNewDocument(() => {
    window.__played = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (this.tagName === 'AUDIO') window.__played.push(decodeURI(this.src.split('/').pop())); return orig.call(this); };
  });
  await p.setViewport({ width: W, height: H });
  await p.goto(pathToFileURL(require('path').join(__dirname, '..', '..', 'index.html')).href, { waitUntil: 'networkidle0' });
  await p.evaluate((n) => {
    localStorage.clear();
    const seed = [['小明', 21.95, 4.5], ['阿華', 22.02, 5], ['Kevin', 21.40, 3], ['美美', 22.60, 4.5], ['大雄', null, 0]].slice(0, n);
    seed.forEach(([name, press, stars], i) => Board.add({ name, press, diff: press == null ? null : Math.abs(press - 22.11), stars, at: i + 1 }));
    document.getElementById('toBoard').click();
  }, n);
  await sleep(600);
  await p.screenshot({ path: out + '-0-board.png' });
  await p.click('#final');
  for (const [ms, tag] of [[1500, '1-third'], [2400, '2-second'], [3150, '3-gogo'], [4150, '4-first'], [5600, '5-done']]) {
    await sleep(ms - (tag === '1-third' ? 0 : 0));
    await p.screenshot({ path: `${out}-${tag}.png` });
    await sleep(0);
    break;
  }
  // 依時間點截圖
  const t0 = Date.now();
  for (const [ms, tag] of [[2400 - 1500, '2-second'], [3150 - 1500, '3-gogo'], [4150 - 1500, '4-first'], [5600 - 1500, '5-done']]) {
    const wait = ms - (Date.now() - t0); if (wait > 0) await sleep(wait);
    await p.screenshot({ path: `${out}-${tag}.png` });
  }
  console.log('played:', await p.evaluate(() => window.__played));
  console.log('buttons visible:', await p.$eval('#finale', (f) => f.classList.contains('done')));
  console.log('page overflow-x:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  // 回排行榜
  await p.click('#finBack'); await sleep(500);
  console.log('after back: finale hidden', await p.$eval('#finale', (f) => f.hidden), 'board visible', await p.$eval('#board', (f) => !f.hidden));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
