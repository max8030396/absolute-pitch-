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
  // 依 finale.js 的 TIMELINE 決定截圖時間點（各名次升起動畫 0.6 秒，取升起後約 0.6 秒）
  const T = await p.evaluate(() => Finale.TIMELINE);
  const shots = [[T.third + 600, '1-third'], [T.second + 600, '2-second'], [T.gogo + T.gogoDur / 2, '3-gogo'], [T.first + 450, '4-first'], [T.done + 1000, '5-done']];
  await p.click('#final');
  const t0 = Date.now();
  for (const [ms, tag] of shots) {
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
