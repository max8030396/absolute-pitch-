// 評分與排序：純函式，瀏覽器掛在 window.Score，node 測試用 module.exports。
(function (root) {
  const STEP = 0.3;      // 每 0.3 秒扣半顆星
  const MAX = 5;

  // diff：與卡點的差距（秒）；null 表示卡點前沒按
  function starsFor(diff) {
    if (diff == null || !isFinite(diff)) return 0;
    const cents = Math.round(Math.abs(diff) * 100);          // 先取到 0.01 秒，避開浮點誤差
    const halves = Math.floor(cents / Math.round(STEP * 100));
    return Math.max(0, MAX - 0.5 * halves);
  }

  function fmt(sec) {
    return (Math.floor(sec * 100 + 1e-6) / 100).toFixed(2);
  }

  function rank(entries) {
    return entries.slice().sort((a, b) => {
      const da = a.diff == null ? Infinity : a.diff;
      const db = b.diff == null ? Infinity : b.diff;
      return da - db || a.at - b.at;
    });
  }

  const api = { starsFor, fmt, rank, STEP, MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Score = api;
})(typeof window !== 'undefined' ? window : globalThis);
