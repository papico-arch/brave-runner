import { router }     from './router.js';
import { getHiScore } from './lobby.js';

export function renderGameover(params = {}) {
  const el      = document.getElementById('screen-gameover');
  const score   = params.score    || 0;
  const dist    = params.distance || 0;
  const kills   = params.kills    || 0;
  const prevBest = getHiScore();
  const isNew   = score > prevBest;

  el.innerHTML = `
<style>
#screen-gameover {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(13,13,26,0.96);
  animation: fadeIn 0.4s ease-out;
}
.gameover-wrap {
  width: 100%;
  max-width: 380px;
  padding: 24px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.go-title {
  font-family: var(--font-pixel);
  font-size: clamp(18px, 5vw, 26px);
  color: var(--danger);
  text-shadow: 3px 3px 0 var(--danger-dark);
  animation: flicker 2.5s infinite;
}
.score-board {
  background: var(--bg-panel);
  border: 2px solid var(--border-subtle);
  border-radius: 4px;
  padding: 16px;
  text-align: left;
}
.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}
.score-row:last-child { border: none; }
.score-row .label { color: var(--text-muted); }
.score-row .value {
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--accent-gold);
}
.new-record {
  display: inline-block;
  background: var(--danger);
  color: #fff;
  font-family: var(--font-pixel);
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 2px;
  margin-left: 6px;
  animation: pulse 0.8s infinite;
}
.go-btns {
  display: flex;
  gap: 10px;
}
.btn-gacha-go {
  flex: 1;
  background: var(--accent-gold);
  color: var(--bg-base);
  border: none;
  border-radius: 3px;
  padding: 14px;
  font-family: var(--font-pixel);
  font-size: clamp(8px, 1.5vw, 10px);
  cursor: pointer;
  box-shadow: 0 3px 0 var(--accent-gold-dark);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-gacha-go:hover { transform: translateY(2px); box-shadow: 0 1px 0 var(--accent-gold-dark); }
.btn-lobby-go {
  padding: 14px 18px;
  background: transparent;
  color: var(--text-primary);
  border: 2px solid var(--text-muted);
  border-radius: 3px;
  font-family: var(--font-pixel);
  font-size: clamp(7px, 1.5vw, 9px);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-lobby-go:hover { background: var(--border-subtle); }
</style>

<div class="gameover-wrap">
  <div class="go-title">GAME OVER</div>

  <div class="score-board">
    <div class="score-row">
      <span class="label">スコア</span>
      <span class="value">${score.toLocaleString()}</span>
    </div>
    <div class="score-row">
      <span class="label">走行距離</span>
      <span class="value">${dist.toLocaleString()}m</span>
    </div>
    <div class="score-row">
      <span class="label">撃破数</span>
      <span class="value">${kills}体</span>
    </div>
    <div class="score-row" style="margin-top:4px;padding-top:10px;border-top:2px solid var(--border-subtle)">
      <span class="label">ベストスコア</span>
      <span class="value" style="${isNew ? 'color:var(--success)' : ''}">
        ${Math.max(score, prevBest).toLocaleString()}
        ${isNew ? '<span class="new-record">NEW!</span>' : ''}
      </span>
    </div>
  </div>

  <div class="go-btns">
    <button class="btn-gacha-go" id="btn-go-gacha">🎲 ガチャを引く</button>
    <button class="btn-lobby-go" id="btn-go-lobby">🏠 ロビー</button>
  </div>
</div>`;

  document.getElementById('btn-go-gacha').addEventListener('click', () => router.go('gacha'));
  document.getElementById('btn-go-lobby').addEventListener('click', () => router.go('lobby'));
}
