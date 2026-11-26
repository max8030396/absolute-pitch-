// 遊戲流程：開始 → 播放計時 → 卡點結算 → 排行榜
(function () {
  // ── 設定 ──
  const HIT_TIME = 22.11;        // 鼓聲卡點（秒）：鼓聲 21.87 開始、約 22.35 被歌聲蓋過，取中間
  const SETTLE_DELAY_MS = 500;   // 按下後幾毫秒跳結算
  const NO_PRESS_GRACE = 3;      // 一直沒按：卡點後幾秒判定沒按

  // ── 音效 ──
  const SFX = {
    gong: { src: '敲鑼音效.wav', skip: 0.14, volume: 0.9 },   // 檔案開頭有 0.16 秒空白，跳過讓按下就響
    zero: { src: '0星音效.mp3', skip: 0, volume: 1 },        // 結算：0 星
    win:  { src: '結算音效.wav', skip: 0, volume: 1 },        // 結算：0.5 星以上
  };
  for (const k in SFX) {
    const a = new Audio(encodeURI(SFX[k].src));
    a.preload = 'auto';
    a.volume = SFX[k].volume;
    SFX[k].el = a;
  }
  function playSfx(name) {
    const s = SFX[name];
    try {
      s.el.currentTime = s.skip;
      const p = s.el.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  }
  function stopSfx(name) {
    try { SFX[name].el.pause(); } catch (e) {}
  }

  const $ = (id) => document.getElementById(id);
  const screens = { start: $('start'), play: $('play'), board: $('board') };
  const video = $('video'), clock = $('clock'), press = $('press'), stamp = $('stamp');
  const result = $('result'), rating = $('rating');

  let player = '';
  let pressedAt = null;   // 玩家按下時的影片秒數
  let settled = false;
  let raf = 0;
  let lastEntryAt = 0;
  let settleTimer = 0;

  function show(name) {
    for (const k in screens) screens[k].hidden = k !== name;
    window.scrollTo(0, 0);
  }

  // ── 開始 ──
  $('go').addEventListener('click', start);
  $('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { $('go').impact(); start(); } });
  $('toBoard').addEventListener('click', () => { renderBoard(); show('board'); });

  function start() {
    const name = $('name').value.trim();
    if (!name) { $('startHint').textContent = '先輸入名字喔！'; $('name').focus(); return; }
    $('startHint').textContent = '';
    player = name;
    pressedAt = null;
    settled = false;
    clearTimeout(settleTimer);
    stopSfx('zero');
    stopSfx('win');
    $('who').textContent = player;
    clock.textContent = '0.00';
    stamp.textContent = '我預判你的預判！';
    press.classList.remove('locked');
    setTimeout(() => {           // 讓開始按鈕的特效先播一下
      show('play');
      document.activeElement && document.activeElement.blur();
      video.currentTime = 0;
      const p = video.play();
      if (p && p.catch) p.catch(() => { stamp.textContent = '影片無法播放，請確認影片檔和 index.html 放在同一個資料夾'; });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }, 450);
  }

  video.addEventListener('error', () => {
    stamp.textContent = '找不到影片檔：Whitney Houston - I Will Always Love You.mp4';
  });

  // ── 計時 ──
  function tick() {
    const t = video.currentTime;
    clock.textContent = Score.fmt(t);
    // 一直沒按：過了卡點 3 秒（再按也是 0 星）就直接結算
    if (!settled && pressedAt === null && t >= HIT_TIME + NO_PRESS_GRACE) settle();
    if (!video.paused && !video.ended) raf = requestAnimationFrame(tick);
  }

  // ── 按下 ──
  function record() {
    if (screens.play.hidden || settled || pressedAt !== null) return false;
    pressedAt = video.currentTime;
    playSfx('gong');
    stamp.innerHTML = `出手！<span class="n">${Score.fmt(pressedAt)}</span> 秒`;
    setTimeout(() => { press.done(0); press.classList.add('locked'); }, 60);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, SETTLE_DELAY_MS);   // 按完 0.5 秒跳結算
    return true;
  }
  // 用 pointerdown 記時比 click（放開才觸發）更準
  press.addEventListener('pointerdown', record);
  document.addEventListener('keydown', (e) => {
    if (screens.play.hidden || !result.hidden || (e.code !== 'Space' && e.key !== 'Enter')) return;
    e.preventDefault();
    if (e.repeat) return;
    if (record()) press.impact();
  });

  // ── 結算 ──
  function settle() {
    if (settled) return;
    settled = true;
    video.pause();                      // 這局結束
    clock.textContent = Score.fmt(video.currentTime);
    press.classList.add('locked');
    const diff = pressedAt === null ? null : Math.abs(pressedAt - HIT_TIME);
    const stars = Score.starsFor(diff);
    lastEntryAt = Date.now();
    Board.add({ name: player, press: pressedAt, diff, stars, at: lastEntryAt });
    playSfx(stars === 0 ? 'zero' : 'win');

    $('verdict').textContent = verdict(stars, diff);
    $('rWho').textContent = player;
    $('rStars').textContent = String(stars);
    $('rPress').textContent = pressedAt === null ? '沒按' : Score.fmt(pressedAt);
    $('rHit').textContent = Score.fmt(HIT_TIME);
    $('rDiff').textContent = diff === null ? '—' : (Math.round(diff * 100) / 100).toFixed(2);
    result.hidden = false;
    showStars(stars);
  }

  function verdict(stars, diff) {
    if (diff === null) return '錯過了！';
    if (stars >= 5) return '神之耳！';
    if (stars >= 4) return '超準的！';
    if (stars >= 3) return '不錯喔！';
    if (stars >= 1.5) return '還差一點！';
    if (stars > 0) return '再聽一次…';
    return '差太遠啦！';
  }

  // sakuga-rating 只有整顆星：在它的 shadowRoot 裡補一個半填色的漸層
  function showStars(stars) {
    const root = rating.shadowRoot;
    if (root && !root.getElementById('half-style')) {
      const s = document.createElement('style');
      s.id = 'half-style';
      s.textContent = '.lit.half svg { fill: url(#sk-half); }';
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
      defs.style.position = 'absolute';
      defs.innerHTML = '<defs><linearGradient id="sk-half" x1="0" x2="1"><stop offset=".5" style="stop-color:var(--sk-pri)"/><stop offset=".5" style="stop-color:var(--sk-card)"/></linearGradient></defs>';
      root.append(s, defs);
    }
    const full = Math.ceil(stars);
    const btns = root ? root.querySelectorAll('button') : [];
    btns.forEach((b, i) => b.classList.toggle('half', stars % 1 !== 0 && i === full - 1));
    rating.set(0, true);
    setTimeout(() => { if (full > 0) rating.set(full); }, 380);
  }

  $('toRank').addEventListener('click', () => {
    result.hidden = true;
    video.pause();
    renderBoard();
    setTimeout(() => show('board'), 300);
  });

  // ── 排行榜 ──
  const STAR = 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z';
  function miniStars(n) {
    let out = '<span class="mini" aria-label="' + n + ' 顆星">';
    for (let i = 1; i <= 5; i++) {
      const fill = n >= i ? 'var(--sk-pri)' : n >= i - 0.5 ? 'url(#mini-half)' : '#fff';
      out += `<svg viewBox="0 0 24 24"><path d="${STAR}" fill="${fill}"/></svg>`;
    }
    return out + '</span>';
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderBoard() {
    const list = Board.load();
    const body = $('boardBody');
    if (!list.length) { body.innerHTML = '<div class="empty">還沒有人挑戰，當第一個吧！</div>'; return; }
    body.innerHTML =
      '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="mini-half" x1="0" x2="1"><stop offset=".5" stop-color="#8f8df7"/><stop offset=".5" stop-color="#fff"/></linearGradient></defs></svg>' +
      '<table><thead><tr><th>名次</th><th>挑戰者</th><th>按下</th><th>差距</th><th>星星</th></tr></thead><tbody>' +
      list.map((e, i) => `<tr class="${e.at === lastEntryAt ? 'me' : ''}">
        <td><span class="rk">${i + 1}</span></td>
        <td class="nm">${esc(e.name)}</td>
        <td class="num">${e.press == null ? '<span class="miss">沒按</span>' : Score.fmt(e.press)}</td>
        <td class="num">${e.diff == null ? '<span class="miss">—</span>' : (Math.round(e.diff * 100) / 100).toFixed(2)}</td>
        <td>${miniStars(e.stars)}</td></tr>`).join('') +
      '</tbody></table>';
  }

  $('next').addEventListener('click', () => {
    $('name').value = '';
    setTimeout(() => { show('start'); $('name').focus(); }, 300);
  });
  // ── 最終結算 ──
  $('final').addEventListener('click', () => {
    stopSfx('zero'); stopSfx('win');
    setTimeout(() => Finale.show(Board.load(), { onFirst: () => playSfx('win') }), 250);
  });
  $('finBack').addEventListener('click', () => {
    setTimeout(() => { Finale.close(); stopSfx('win'); renderBoard(); }, 250);
  });
  $('finReset').addEventListener('click', () => {
    if (!confirm('開始新的一場？目前的排行榜會清空。')) return;
    Board.clear();
    Finale.close();
    stopSfx('win');
    renderBoard();
    $('name').value = '';
    show('start');
    $('name').focus();
  });

  video.addEventListener('ended', () => cancelAnimationFrame(raf));
  $('name').focus();
})();
