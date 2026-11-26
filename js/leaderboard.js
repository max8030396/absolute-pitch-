// 排行榜：存在這台電腦的瀏覽器（localStorage）。存不了就只放在記憶體，遊戲照玩。
(function () {
  const KEY = 'pitch-game-board-v1';
  let mem = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) mem = JSON.parse(raw) || [];
    } catch (e) { /* 讀不到就用記憶體 */ }
    return Score.rank(mem);
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 存不了就算了 */ }
  }

  function add(entry) {
    load();
    mem.push(entry);
    save();
    return Score.rank(mem);
  }

  function clear() {
    mem = [];
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.Board = { load, add, clear };
})();
