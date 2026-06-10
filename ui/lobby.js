import { router }       from './router.js';
import { getCurrentUser } from '../auth/googleAuth.js';
import { loadUser }      from '../api/gasClient.js';
import { canEvolve, evolveSkill, rollGachaSkill } from '../game/skills.js';
import { saveEquip }     from '../api/gasClient.js';

// ---- 装備状態（グローバル） ----
let _equip = [null, null, null]; // 最大3スロット
let _hiScore = 0;

export function getEquip()   { return _equip; }
export function getHiScore() { return _hiScore; }

export async function renderLobby() {
  const el  = document.getElementById('screen-lobby');
  const user = getCurrentUser();

  el.innerHTML = `
<style>
#screen-lobby {
  flex-direction: column;
  overflow-y: auto;
}
.lobby-wrap {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--border-subtle);
  padding-bottom: 12px;
}
.lobby-player-name {
  font-family: var(--font-pixel);
  font-size: clamp(9px, 2vw, 12px);
  color: var(--accent-gold);
}
.lobby-hiscore {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
.lobby-hiscore span { color: var(--accent-gold); font-weight: 700; }
.lobby-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 600px) {
  .lobby-grid {
    grid-template-columns: 1fr;
  }
  .lobby-center { order: -1; }
}
.lobby-section-title {
  font-family: var(--font-pixel);
  font-size: 9px;
  color: var(--text-muted);
  margin-bottom: 10px;
  letter-spacing: 1px;
}
.skill-slot-lobby {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-base);
  border: 2px solid var(--border-subtle);
  border-radius: 3px;
  padding: 8px 10px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.skill-slot-lobby .icon {
  width: 36px; height: 36px;
  background: var(--border-subtle);
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}
.skill-slot-lobby .info { flex: 1; min-width: 0; }
.skill-slot-lobby .name { font-size: 12px; font-weight: 700; }
.skill-slot-lobby .evo-status { font-size: 10px; color: var(--success); margin-top: 2px; }
.skill-slot-lobby .evolve-btn {
  background: var(--success);
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 4px 8px;
  font-size: 10px;
  cursor: pointer;
  font-family: var(--font-body);
  white-space: nowrap;
}
.slot-empty {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-base);
  border: 2px dashed var(--border-subtle);
  border-radius: 3px;
  padding: 8px 10px;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 12px;
}
.lobby-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.btn-start {
  width: 130px; height: 130px;
  background: var(--accent-gold);
  border: none;
  border-radius: 50%;
  font-family: var(--font-pixel);
  font-size: clamp(9px, 2vw, 11px);
  color: var(--bg-base);
  cursor: pointer;
  box-shadow: 0 6px 0 var(--accent-gold-dark);
  transition: transform 0.1s, box-shadow 0.1s;
  line-height: 1.7;
}
.btn-start:hover  { transform: translateY(3px); box-shadow: 0 3px 0 var(--accent-gold-dark); }
.btn-start:active { transform: translateY(5px); box-shadow: 0 1px 0 var(--accent-gold-dark); }
.lobby-hint { font-size: 10px; color: var(--text-muted); text-align: center; }
.nav-btns { display: flex; flex-direction: column; gap: 10px; }
.btn-nav {
  background: var(--bg-panel);
  border: 2px solid var(--accent-purple);
  border-radius: 3px;
  padding: 12px 16px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
  font-family: var(--font-body);
}
.btn-nav:hover { background: var(--border-subtle); }
.gacha-remain {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}
.lobby-loading { text-align:center; color:var(--text-muted); font-size:12px; padding:40px; }
</style>

<div class="lobby-wrap">
  <div class="lobby-header">
    <div>
      <div class="lobby-player-name">⚔ ${user?.name || 'HERO'}</div>
      <div class="lobby-hiscore">BEST SCORE: <span id="lobby-hiscore">---</span></div>
    </div>
    <div style="font-size:11px;color:var(--text-muted)" id="lobby-dayinfo"></div>
  </div>

  <div class="lobby-grid">
    <!-- 左：装備スロット -->
    <div>
      <div class="lobby-section-title">装備中スキル</div>
      <div id="equip-slots"></div>
    </div>

    <!-- 中央：スタートボタン -->
    <div class="lobby-center">
      <button class="btn-start" id="btn-start">GAME<br>START</button>
      <div class="lobby-hint">Enter / タップ でジャンプ</div>
    </div>

    <!-- 右：ナビ -->
    <div class="nav-btns">
      <button class="btn-nav" id="btn-gacha">
        🎲 ガチャを引く
        <span class="gacha-remain" id="gacha-remain-label"></span>
      </button>
      <button class="btn-nav" id="btn-ranking">🏆 ランキング</button>
    </div>
  </div>
</div>`;

  // データ読み込み
  await _loadUserData();
  _renderEquipSlots();

  document.getElementById('btn-start').addEventListener('click', () => router.go('game'));
  document.getElementById('btn-gacha').addEventListener('click', () => router.go('gacha'));
  document.getElementById('btn-ranking').addEventListener('click', () => router.go('ranking'));

  // Enter キーでもスタート
  const onKey = (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      document.removeEventListener('keydown', onKey);
      router.go('game');
    }
  };
  document.addEventListener('keydown', onKey);
}

async function _loadUserData() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    const data = await loadUser(user.token);
    if (data.exists) {
      _hiScore = data.hiScore || 0;
      _equip   = (data.equip || [null, null, null]).slice(0, 3);
      // 3スロット保証
      while (_equip.length < 3) _equip.push(null);
    }
  } catch (_) { /* オフライン時はローカル状態を使う */ }

  document.getElementById('lobby-hiscore').textContent = _hiScore.toLocaleString();
}

function _renderEquipSlots() {
  const container = document.getElementById('equip-slots');
  if (!container) return;

  container.innerHTML = _equip.map((slot, i) => {
    if (!slot) {
      return `<div class="slot-empty">
        <span style="font-size:22px;margin-right:4px">＋</span>
        <span>スキルなし — ガチャで入手</span>
      </div>`;
    }
    const evoStars = '★'.repeat(slot.evo || 0) + '☆'.repeat(2 - (slot.evo || 0));
    const gradeClass = slot.grade >= 80 ? 'gold' : slot.grade >= 50 ? 'silver' : 'bronze';
    const evolveAvail = canEvolve(slot);
    return `<div class="skill-slot-lobby">
      <div class="icon">${slot.icon || '?'}</div>
      <div class="info">
        <div class="name">${slot.name}</div>
        <span class="grade-badge ${gradeClass}">Grade ${slot.grade}</span>
        <div class="evo-status">${evoStars} ${slot.kills || 0}体撃破</div>
      </div>
      ${evolveAvail
        ? `<button class="evolve-btn" data-slot="${i}">進化！</button>`
        : ''}
    </div>`;
  }).join('');

  // 進化ボタン
  container.querySelectorAll('.evolve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const i = Number(btn.dataset.slot);
      _equip = evolveSkill(_equip, i);
      const user = getCurrentUser();
      if (user) await saveEquip(user.token, _equip).catch(() => {});
      _renderEquipSlots();
    });
  });
}
