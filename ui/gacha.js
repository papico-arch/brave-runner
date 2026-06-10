import { router }      from './router.js';
import { rollGachaSkill } from '../game/skills.js';
import { getCurrentUser } from '../auth/googleAuth.js';
import { saveEquip }     from '../api/gasClient.js';

// ---- ガチャ上限設定 ----
// GACHA_LIMIT = 0 → 無制限（テストモード）
// GACHA_LIMIT = 10 → 公開時の1日10回制限
const GACHA_LIMIT = 0; // 0 = 無制限

const STORAGE_KEY = 'braverunner_gacha';

function _getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-06-10"
}

function _getRemaining() {
  if (GACHA_LIMIT === 0) return Infinity;
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const today = _getTodayKey();
  const used  = data[today] || 0;
  return Math.max(0, GACHA_LIMIT - used);
}

function _consumeOne() {
  if (GACHA_LIMIT === 0) return;
  const data  = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const today = _getTodayKey();
  data[today] = (data[today] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---- 装備スロット参照（lobbyと共有） ----
import { getEquip } from './lobby.js';

let _pendingSkill = null; // ガチャで引いたスキル

export function renderGacha() {
  const el     = document.getElementById('screen-gacha');
  const remain = _getRemaining();

  el.innerHTML = `
<style>
#screen-gacha {
  flex-direction: column;
  overflow-y: auto;
}
.gacha-wrap {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.gacha-title {
  font-family: var(--font-pixel);
  font-size: clamp(11px, 2.5vw, 14px);
  color: var(--accent-purple);
  text-align: center;
  text-shadow: 0 0 10px rgba(123,94,167,0.5);
}
.gacha-result-area {
  background: var(--bg-panel);
  border: 2px solid var(--border-subtle);
  border-radius: 4px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.skill-card {
  border-radius: 4px;
  padding: 16px;
  width: 150px;
  text-align: center;
  animation: cardAppear 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes cardAppear {
  from { transform: scale(0.4) rotateY(90deg); opacity: 0; }
  to   { transform: scale(1) rotateY(0deg);    opacity: 1; }
}
.card-icon  { font-size: 44px; margin-bottom: 8px; }
.card-name  { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.card-type  { font-size: 10px; color: var(--text-muted); margin-bottom: 8px; }
.equip-preview {
  background: var(--bg-panel);
  border: 2px solid var(--border-subtle);
  border-radius: 3px;
  padding: 12px;
}
.equip-preview-title {
  font-family: var(--font-pixel);
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 10px;
}
.equip-slot-items {
  display: flex;
  gap: 8px;
}
.equip-slot-item {
  flex: 1;
  background: var(--bg-base);
  border: 2px solid var(--border-subtle);
  border-radius: 3px;
  padding: 8px 6px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.equip-slot-item:hover   { border-color: var(--accent-purple); }
.equip-slot-item.selected { border-color: var(--accent-gold); background: rgba(245,197,24,0.06); }
.equip-slot-item .s-icon  { font-size: 22px; }
.equip-slot-item .s-name  { font-size: 9px; }
.equip-slot-item .s-grade { font-size: 9px; color: var(--text-muted); }
.gacha-btns { display: flex; gap: 10px; }
.btn-pull {
  flex: 1;
  background: var(--accent-purple);
  border: none;
  border-radius: 3px;
  padding: 14px;
  font-family: var(--font-pixel);
  font-size: clamp(8px, 1.5vw, 10px);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 0 var(--accent-purple-dark);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-pull:hover   { transform: translateY(2px); box-shadow: 0 2px 0 var(--accent-purple-dark); }
.btn-pull:active  { transform: translateY(4px); box-shadow: 0 0px 0 var(--accent-purple-dark); }
.btn-pull:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.btn-pull-sub {
  display: block;
  font-size: 9px;
  color: rgba(255,255,255,0.6);
  margin-top: 4px;
  font-family: var(--font-body);
}
.btn-back {
  padding: 14px 20px;
  background: transparent;
  border: 2px solid var(--text-muted);
  border-radius: 3px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-body);
  transition: background 0.15s;
}
.btn-back:hover { background: var(--border-subtle); }
.confirm-dialog {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.confirm-box {
  background: var(--bg-panel);
  border: 3px solid var(--danger);
  border-radius: 4px;
  padding: 24px;
  max-width: 320px;
  width: 100%;
  text-align: center;
}
.confirm-box h3 {
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--danger);
  margin-bottom: 12px;
}
.confirm-box p  { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
.confirm-btns   { display: flex; gap: 10px; justify-content: center; }
.btn-confirm-yes {
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 10px 20px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 13px;
}
.btn-confirm-no {
  background: transparent;
  color: var(--text-primary);
  border: 2px solid var(--text-muted);
  border-radius: 3px;
  padding: 10px 20px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 13px;
}
.gacha-remain-info {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}
.gacha-remain-info span { color: var(--accent-gold); font-weight: 700; }
</style>

<div class="gacha-wrap">
  <div class="gacha-title">✨ GACHA ✨</div>

  <div class="gacha-remain-info" id="remain-info">
    ${GACHA_LIMIT === 0
      ? '現在テストモード：<span>無制限</span>'
      : `本日の残り回数：<span id="remain-count">${remain}</span> / ${GACHA_LIMIT}回`}
  </div>

  <div class="gacha-result-area" id="gacha-result">
    <span style="font-size:13px;color:var(--text-muted);font-family:var(--font-pixel)">
      ボタンを押してガチャを引こう！
    </span>
  </div>

  <div class="equip-preview" id="equip-preview" style="display:none">
    <div class="equip-preview-title">▼ どれと入れ替えますか？（タップで選択）</div>
    <div class="equip-slot-items" id="equip-slot-items"></div>
  </div>

  <div class="gacha-btns">
    <button class="btn-pull" id="btn-pull"
      ${remain === 0 ? 'disabled' : ''}>
      🎲 ガチャを引く
      ${GACHA_LIMIT > 0 && remain === 0
        ? '<span class="btn-pull-sub">本日の回数を使い切りました</span>'
        : ''}
    </button>
    <button class="btn-back" id="btn-back">← 戻る</button>
  </div>
</div>`;

  document.getElementById('btn-pull').addEventListener('click', _onPull);
  document.getElementById('btn-back').addEventListener('click', () => router.go('lobby'));
}

function _onPull() {
  const remain = _getRemaining();
  if (remain === 0) return;

  _consumeOne();
  _pendingSkill = rollGachaSkill();

  // 残り回数更新
  const countEl = document.getElementById('remain-count');
  if (countEl) countEl.textContent = _getRemaining();

  // カード演出
  const resultEl = document.getElementById('gacha-result');
  resultEl.innerHTML = '<span style="font-family:var(--font-pixel);font-size:11px;color:var(--accent-purple)">PULLING...</span>';

  setTimeout(() => {
    const g     = _pendingSkill.grade;
    const cls   = g >= 80 ? 'gold' : g >= 50 ? 'silver' : 'bronze';
    const bord  = g >= 80 ? '#f5c518' : g >= 50 ? '#aaa' : '#cd7f32';
    const bgCol = g >= 80 ? 'rgba(245,197,24,0.08)' : 'rgba(50,50,50,0.3)';

    resultEl.innerHTML = `
      <div class="skill-card" style="border:3px solid ${bord};background:${bgCol}">
        <div class="card-icon">${_pendingSkill.icon}</div>
        <div class="card-name">${_pendingSkill.name}</div>
        <div class="card-type">${_typeLabel(_pendingSkill.type)}</div>
        <span class="grade-badge ${cls}">Grade ${g}</span>
      </div>`;

    // 入れ替えUI表示
    _renderEquipPreview();
  }, 350);
}

function _renderEquipPreview() {
  const equip   = getEquip();
  const preview = document.getElementById('equip-preview');
  const items   = document.getElementById('equip-slot-items');
  preview.style.display = 'block';

  items.innerHTML = equip.map((slot, i) => {
    if (!slot) {
      return `<div class="equip-slot-item" data-slot="${i}" style="border-style:dashed">
        <div class="s-icon" style="color:var(--text-muted)">＋</div>
        <div class="s-name" style="color:var(--text-muted)">空きスロット</div>
      </div>`;
    }
    const gc = slot.grade >= 80 ? 'gold' : slot.grade >= 50 ? 'silver' : 'bronze';
    return `<div class="equip-slot-item" data-slot="${i}">
      <div class="s-icon">${slot.icon || '?'}</div>
      <div class="s-name">${slot.name}</div>
      <span class="grade-badge ${gc}" style="font-size:8px">${slot.grade}</span>
    </div>`;
  }).join('');

  items.querySelectorAll('.equip-slot-item').forEach(item => {
    item.addEventListener('click', () => {
      items.querySelectorAll('.equip-slot-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      const slotIdx = Number(item.dataset.slot);
      const current = getEquip()[slotIdx];

      if (current) {
        _showConfirmDialog(current, slotIdx);
      } else {
        _doEquip(slotIdx);
      }
    });
  });
}

function _showConfirmDialog(current, slotIdx) {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.innerHTML = `
    <div class="confirm-box">
      <h3>⚠ スキルを破棄しますか？</h3>
      <p>${current.icon} <strong>${current.name}</strong> (Grade ${current.grade}) は<br>完全に消えます。</p>
      <div class="confirm-btns">
        <button class="btn-confirm-yes" id="conf-yes">入れ替える</button>
        <button class="btn-confirm-no"  id="conf-no">キャンセル</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('#conf-yes').addEventListener('click', () => {
    dialog.remove();
    _doEquip(slotIdx);
  });
  dialog.querySelector('#conf-no').addEventListener('click', () => {
    dialog.remove();
  });
}

async function _doEquip(slotIdx) {
  const equip = getEquip();
  equip[slotIdx] = { ..._pendingSkill, kills: 0 };

  const preview = document.getElementById('equip-preview');
  if (preview) preview.style.display = 'none';

  const user = getCurrentUser();
  if (user) await saveEquip(user.token, equip).catch(() => {});

  // 装備済みメッセージ
  const resultEl = document.getElementById('gacha-result');
  if (resultEl) {
    resultEl.innerHTML += `
      <div style="margin-top:12px;font-size:12px;color:var(--success);font-weight:700">
        ✅ スロット ${slotIdx + 1} に装備しました！
      </div>`;
  }
}

function _typeLabel(type) {
  return type === 'heavy' ? '高威力タイプ'
       : type === 'rapid' ? '連射タイプ'
       : '範囲攻撃タイプ';
}
