# 絕對音感・卡點挑戰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 單頁卡點遊戲：播放本機影片、顯示秒數、按 sakuga 按鈕記時、卡點到時結算星星、排行榜。

**Architecture:** 純靜態網頁，雙擊 `index.html` 即可。評分與排序是純函式（`js/score.js`，可在 node 測試）；排行榜存取在 `js/leaderboard.js`；畫面流程在 `js/game.js`。sakuga 元件原檔放 `vendor/`。

**Tech Stack:** HTML/CSS/vanilla JS、sakuga-vfx `button.js` / `rating.js`（MIT）、node:test。

**Spec:** `docs/design.md`

## Global Constraints
- 卡點 `HIT_TIME = 22.11`
- 星星 `max(0, 5 − 0.5 × floor(diff ÷ 0.3))`；卡點前沒按 = 0 星
- 秒數顯示小數點第二位
- 影片檔名 `Whitney Houston - I Will Always Love You.mp4`，與 index.html 同資料夾
- 風格沿用 sakuga 變數（`--sk-ink #1d1a4a`、`--sk-pri #8f8df7`、`--sk-soft #b8b3ff`、`--sk-acc #ff5fa8`）
- 不是 git repo：不 commit

## Review Focus
1. 浮點誤差：diff 剛好 0.3、0.6 → 應為 4.5、4 星（不可因 0.29999 變成多半顆）
2. 連點按鈕：只認第一次
3. 沒輸入名字 → 不能開始（或用「無名氏」）
4. localStorage 不可用（file:// 或隱私模式）→ 遊戲照常，排行榜只在記憶體
5. 影片載入失敗 / 自動播放被擋 → 顯示提示，不卡死

---

### Task 1: 評分純函式

**Files:** Create `js/score.js`, Test `tests/score.test.mjs`

**Interfaces — Produces** (掛在 `window.Score`，也 `module.exports`):
- `starsFor(diff: number|null) -> number`（null = 未出手 → 0）
- `fmt(sec: number) -> string`（`"22.11"`，兩位小數）
- `rank(entries: {name, press: number|null, diff: number|null, stars, at}[]) -> 同陣列排序後`（diff 小在前，null 最後，同分先玩者在前）

- [ ] 測試：`starsFor(0)=5`、`starsFor(0.29)=5`、`starsFor(0.3)=4.5`、`starsFor(0.6)=4`、`starsFor(1.32)=3`、`starsFor(2.99)=0.5`、`starsFor(3)=0`、`starsFor(9)=0`、`starsFor(null)=0`；`fmt(5)="5.00"`、`fmt(22.111)="22.11"`；`rank` 排序含 null
- [ ] 跑 `node --test tests/` → FAIL
- [ ] 實作（diff 先 round 到 0.01 再除，避開浮點）
- [ ] 跑 `node --test tests/` → PASS

### Task 2: 排行榜儲存

**Files:** Create `js/leaderboard.js`
**Interfaces — Produces** `window.Board = { load() -> entries[], add(entry) -> entries[] (已排序), clear() }`，key `pitch-game-board-v1`，所有存取包 try/catch，失敗時退回記憶體陣列。

- [ ] 實作；在瀏覽器 console 驗證 add/load/clear

### Task 3: 畫面與流程

**Files:** Create `index.html`, `js/game.js`
**Consumes:** `Score`, `Board`, `<sakuga-button>`（`.impact()`、`.done()`）, `<sakuga-rating>`（`.set(n, quiet)`、open shadowRoot）

- 四個畫面：開始（名字）/ 遊戲（影片 + 計時器 + ドン! 按鈕）/ 結算（按下、卡點、差距、星星）/ 排行榜
- 計時：`requestAnimationFrame` 讀 `video.currentTime`；`currentTime >= HIT_TIME` 時結算（影片繼續播完）
- 半星：在 rating 的 shadowRoot 注入 linearGradient `#sk-half` 與 `.lit.half svg{fill:url(#sk-half)}`，最後一顆加 `.half`，再 `set(Math.ceil(stars))`
- [ ] 實作
- [ ] 用 headless Chrome 截圖每個畫面確認
- [ ] 走一遍：開始 → 按下 → 結算 → 排行榜 → 下一位
