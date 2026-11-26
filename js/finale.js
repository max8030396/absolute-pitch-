// 最終結算：前三名頒獎台，依 3 → 2 → 1 揭曉，搭配 sakuga 特效
(function () {
  const $ = (id) => document.getElementById(id);
  const el = $('finale');
  const podium = $('podium');
  const STAR = 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z';
  const CROWN = '<svg class="crown" viewBox="0 0 64 44" aria-hidden="true"><path d="M5 14l13 12L32 4l14 22 13-12-5 26H10z"/><circle cx="5" cy="12" r="4"/><circle cx="32" cy="4" r="4"/><circle cx="59" cy="12" r="4"/></svg>';
  let timers = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const fx = () => window.SakugaFX;
  // 合成音效（js/finale-sfx.js）；沒有也不影響畫面
  const snd = (name, ...args) => { try { window.FinaleSfx && window.FinaleSfx[name](...args); } catch (e) {} };

  function stars(n) {
    let out = '<span class="f-stars">';
    for (let i = 1; i <= 5; i++) {
      const fill = n >= i ? 'var(--sk-pri)' : n >= i - 0.5 ? 'url(#f-half)' : '#fff';
      out += `<svg viewBox="0 0 24 24"><path d="${STAR}" fill="${fill}"/></svg>`;
    }
    return out + '</span>';
  }

  function slot(entry, place) {
    const label = ['1st', '2nd', '3rd'][place - 1];
    if (!entry) {
      return `<div class="place p${place} vacant"><div class="f-card"><div class="f-name">？？？</div><div class="f-diff">從缺</div></div><div class="block"><span class="f-rk">${place}</span></div></div>`;
    }
    const diff = entry.diff == null ? '沒按' : `差 ${(Math.round(entry.diff * 100) / 100).toFixed(2)} 秒`;
    return `<div class="place p${place}">
      ${place === 1 ? CROWN : ''}
      <div class="f-card">
        <div class="f-label">${label}</div>
        <div class="f-name">${esc(entry.name)}</div>
        ${stars(entry.stars)}
        <div class="f-diff">${diff}</div>
      </div>
      <div class="block"><span class="f-rk">${place}</span></div>
    </div>`;
  }

  // 揭曉一名：升起 + 特效
  function reveal(place, big) {
    const p = podium.querySelector('.p' + place);
    if (!p) return;
    p.classList.add('in');
    if (p.classList.contains('vacant')) return;
    later(180, () => snd(big ? 'don' : place === 3 ? 'pon' : 'zuza'));
    if (big) { later(530, () => snd('kira', 0)); later(730, () => snd('kira', 2)); }
    const F = fx();
    if (!F) return;
    later(180, () => {
      const c = F.at(p.querySelector('.f-card'));
      if (big) {
        F.burst(c.x, c.y, { r: 150, spikes: 19, life: 0.6 });
        F.shards(c.x, c.y, { n: 16, speed: 340, size: 10, life: 1.1, arc: 6.28, grav: 300 });
        F.sfx('don', c.x + 30, c.y - c.h / 2 - 70, { size: 200, rot: -0.12, life: 1.3 });
        for (const [dx, dy] of [[-1, -0.6], [1, -0.8], [-1, 0.7], [1, 0.9]]) F.puff(c.x + dx * (c.w / 2 + 10), c.y + dy * 40, { size: 16, n: 5, vx: dx * 50, vy: dy * 30, life: 1 });
        later(350, () => F.kira(c.x - c.w / 2 + 10, c.y - c.h / 2, { r: 16, life: 1 }));
        later(550, () => F.kira(c.x + c.w / 2 - 6, c.y - 10, { r: 11, life: 0.9 }));
      } else {
        F.burst(c.x, c.y, { r: 80, spikes: 14, life: 0.45 });
        F.shards(c.x, c.y, { n: 8, speed: 220, size: 7, life: 0.85, arc: 6.28, grav: 320 });
        F.sfx(place === 3 ? 'pon' : 'zuza', c.x + 20, c.y - c.h / 2 - 40, { size: 110, rot: 0.08, life: 0.95, ...(place === 3 ? F.hollow() : {}) });
      }
    });
  }

  function show(list, { onFirst } = {}) {
    close();
    const top = list.slice(0, 3);
    if (!top.length) {
      podium.innerHTML = '<div class="f-empty">還沒有人挑戰，先玩一局吧！</div>';
    } else {
      podium.innerHTML = slot(top[1], 2) + slot(top[0], 1) + slot(top[2], 3);
    }
    el.hidden = false;
    el.classList.remove('done');
    document.body.style.overflow = 'hidden';
    later(300, () => snd('slam'));
    if (!top.length) { el.classList.add('done'); return; }

    later(900, () => reveal(3));
    later(1800, () => reveal(2));
    later(2700, () => snd('gogo', 1.15));
    later(2700, () => {             // 第一名之前的蓄力
      const F = fx(), slotEl = podium.querySelector('.p1 .block');
      if (!F || !slotEl) return;
      const c = F.at(slotEl);
      F.sfx('gogo', c.x - 120, c.y - 40, { size: 130, rot: -0.2, life: 1.1, ...F.dotted() });
      F.sfx('gogo', c.x + 120, c.y - 90, { size: 110, rot: 0.15, life: 1.0, ...F.dotted() });
    });
    later(3700, () => reveal(1, true));
    later(3880, () => { if (onFirst) onFirst(); });   // 和「ドン!」同一刻
    later(4600, () => el.classList.add('done'));
  }

  function close() {
    timers.forEach(clearTimeout);
    timers = [];
    snd('stop');
    el.hidden = true;
    document.body.style.overflow = '';
  }

  window.Finale = { show, close };
})();
