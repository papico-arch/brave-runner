// ================================================================
// GAS API クライアント（アダプター構造）
//
// 将来 Firestore / Supabase 等に移行する場合は、
// このファイルの _adapter オブジェクトだけ差し替えればOKです。
// ================================================================

// TODO: GAS デプロイ後に発行されたURLを貼り付ける
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyY8SQ3n89L_nw8zgenXu1SUCkpAvbRkigfXNG9QFQI0kZvUHiEZmIAetqaJmFrcBd3/exec';

// ---- 内部フェッチ ----

async function _get(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GAS GET failed: ${res.status}`);
  return res.json();
}

async function _post(body) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GAS POST failed: ${res.status}`);
  return res.json();
}

// ---- アダプター（移行フック） ----
// 将来このオブジェクトを差し替えるだけで別DBに移行できる

const _adapter = {
  async saveScore(token, { score, equip, totalKills }) {
    return _post({ action: 'saveScore', token, score, equip, totalKills });
  },

  async loadUser(token) {
    return _post({ action: 'loadUser', token });
  },

  async saveEquip(token, equip) {
    return _post({ action: 'saveEquip', token, equip });
  },

  async getRanking() {
    return _get({ action: 'ranking' });
  },
};

// ---- 公開 API ----

export async function saveScore(token, data) {
  return _adapter.saveScore(token, data);
}

export async function loadUser(token) {
  return _adapter.loadUser(token);
}

export async function saveEquip(token, equip) {
  return _adapter.saveEquip(token, equip);
}

export async function getRanking() {
  return _adapter.getRanking();
}
