const puppeteer = require('puppeteer-core'); const { pathToFileURL } = require('url'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => { console.log('confirm:', d.message()); d.accept(); });
  await p.goto(pathToFileURL(require('path').join(__dirname, '..', '..', 'index.html')).href, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.clear(); Board.add({ name: 'A', press: 22, diff: 0.11, stars: 5, at: 1 }); document.getElementById('toBoard').click(); });
  await sleep(400); await p.click('#final'); await sleep(5200);
  await p.click('#finReset'); await sleep(400);
  console.log('board entries:', await p.evaluate(() => Board.load().length), '| stored:', await p.evaluate(() => localStorage.getItem('pitch-game-board-v1')),
    '| start visible:', await p.$eval('#start', (e) => !e.hidden), '| finale hidden:', await p.$eval('#finale', (e) => e.hidden));
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
