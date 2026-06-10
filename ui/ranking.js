import { router }      from './router.js';
import { getRanking }  from '../api/gasClient.js';
import { getCurrentUser } from '../auth/googleAuth.js';

export async function renderRanking() {
  const el = document.getElementById('screen-ranking');

  el.innerHTML = `
<style>
#screen-ranking {
  flex-direction: column;
  overflow-y: auto;
}
.ranking-wrap {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: 16px;
}
.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.ranking-title {
  font-family: var(--font-pixel);
  font-size: clamp(10px, 2.5vw, 13px);
  color: var(--accent-gold);
}
.btn-back-rank {
  background: transparent;
  border: 2px solid var(--text-muted);
  border-radius: 3px;
  padding: 8px 14px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-body);
  transition: background 0.15s;
}
.btn-back-rank:hover { background: var(--border-subtle); }
.ranking-table-header {
  display: grid;
  grid-template-columns: 36px 1fr 90px 1fr;
  gap: 8px;
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 8px;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-subtle);
  margin-bottom: 4px;
}
.ranking-row {
  display: grid;
  grid-template-columns: 36px 1fr 90px 1fr;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  align-items: center;
  transition: background 0.1s;
}
.ranking-row:hover { background: var(--bg-panel); }
.ranking-row.me {
  background: rgba(245,197,24,0.06);
  border-color: rgba(245,197,24,0.2);
}
.rank-num {
  font-family: var(--font-pixel);
  font-size: 9px;
  text-align: center;
}
.rank-1 { color: var(--accent-gold); }
.rank-2 { color: #aaa; }
.rank-3 { color: #cd7f32; }
.rank-name { font-weight: 700; }
.rank-score {
  font-family: var(--font-pixel);
  font-size: 9px;
  color: var(--accent-gold);
  text-align: right;
}
.rank-skills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.rank-chip {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 2px;
  padding: 2px 5px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.chip-g { color: var(--accent-gold); font-size: 9px; font-weight: 700; }
.ranking-loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-family: var(--font-pixel);
  font-size: 10px;
}
.ranking-error {
  text-align: center;
  padding: 24px;
  color: var(--danger);
  font-size: 12px;
}
</style>

<div class="ranking-wrap">
  <div class="ranking-header">
    <div class="ranking-title">🏆 RANKING TOP 500</div>
    <button class="btn-back-rank" id="btn-back">← 戻る</button>
  </div>
  <div class="ranking-table-header">
    <span>#</span>
    <span>名前</span>
    <span style="text-align:right">スコア</span>
    <span>装備</span>
  </div>
  <div id="ranking-body">
    <div class="ranking-loading">LOADING...</div>
  </div>
</div>`;

  document.getElementById('btn-back').addEventListener('click', () => router.go('lobby'));

  // ランキングデータ取得
  try {
    const data    = await getRanking();
    const user    = getCurrentUser();
    const myName  = user?.name || '';
    const body    = document.getElementById('ranking-body');

    if (!data || data.length === 0) {
      body.innerHTML = '<div class="ranking-loading">まだランキングデータがありません</div>';
      return;
    }

    body.innerHTML = data.map((row, idx) => {
      const rank     = idx + 1;
      const rankCls  = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
      const isMe     = row.name === myName;
      const skills   = (row.equip || []).filter(Boolean).map(s =>
        `<div class="rank-chip">${s.icon || '?'}<span class="chip-g">${s.grade}</span></div>`
      ).join('');

      return `<div class="ranking-row${isMe ? ' me' : ''}" ${isMe ? 'id="my-rank-row"' : ''}>
        <div class="rank-num ${rankCls}">${rank}</div>
        <div class="rank-name">${isMe ? '👤 ' : ''}${_escape(row.name)}</div>
        <div class="rank-score">${Number(row.score).toLocaleString()}</div>
        <div class="rank-skills">${skills || '<span style="color:var(--text-muted);font-size:10px">—</span>'}</div>
      </div>`;
    }).join('');

    // 自分の行まで自動スクロール
    const myRow = document.getElementById('my-rank-row');
    if (myRow) setTimeout(() => myRow.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);

  } catch (err) {
    document.getElementById('ranking-body').innerHTML =
      `<div class="ranking-error">ランキングの取得に失敗しました<br><small>${err.message}</small></div>`;
  }
}

function _escape(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
