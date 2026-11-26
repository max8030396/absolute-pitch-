const puppeteer = require('puppeteer-core');
const { pathToFileURL } = require('url');
const out = process.argv[2];
const page_ = pathToFileURL(require('path').join(__dirname, '..', '..', 'index.html')).href;
const W = +(process.argv[3] || 1280), H = +(process.argv[4] || 860);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--allow-file-access-from-files'],
  });
  const p = await b.newPage();
  const logs = [];
  p.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await p.goto(page_, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  // 先放兩筆假紀錄，讓排行榜有內容
  await p.evaluate(() => { Board.add({ name: '小明', press: 21.62, diff: 0.49, stars: 4.5, at: 1 }); Board.add({ name: '阿華', press: null, diff: null, stars: 0, at: 2 }); });
  await sleep(500);
  await p.screenshot({ path: out + '-1-start.png' });

  await p.type('#name', '測試玩家');
  await p.click('#go');
  await sleep(1200);
  await p.evaluate(() => { const v = document.getElementById('video'); v.currentTime = 19.5; });
  await sleep(1500);
  await p.screenshot({ path: out + '-2-play.png' });

  // 等到 ~21.85 秒按下
  await p.waitForFunction(() => document.getElementById('video').currentTime >= 21.85, { polling: 'raf', timeout: 10000 });
  const box = await (await p.$('#press')).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down(); await sleep(60); await p.mouse.up();
  await sleep(150);
  await p.screenshot({ path: out + '-3-pressed.png' });

  await p.waitForFunction(() => !document.getElementById('result').hidden, { timeout: 5000 });
  await sleep(1400);
  await p.screenshot({ path: out + '-4-result.png' });
  const info = await p.evaluate(() => ({
    press: document.getElementById('rPress').textContent, diff: document.getElementById('rDiff').textContent,
    stars: document.getElementById('rStars').textContent, verdict: document.getElementById('verdict').textContent,
    halfClass: [...document.getElementById('rating').shadowRoot.querySelectorAll('button')].map((b) => b.className).join('|'),
  }));
  console.log(JSON.stringify(info));

  await p.click('#toRank');
  await sleep(1000);
  await p.screenshot({ path: out + '-5-board.png' });
  console.log(logs.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
