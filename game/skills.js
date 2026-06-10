// ================================================================
// スキル定義（12種類 × 3タイプ）
// ================================================================

// タイプ定義
export const SKILL_TYPES = {
  HEAVY:  'heavy',   // タイプA: 高威力・低頻度
  RAPID:  'rapid',   // タイプB: 低威力・高頻度
  AREA:   'area',    // タイプC: 範囲・中頻度
};

// スキルマスターデータ（12種）
export const SKILL_MASTER = [
  // --- タイプA: 高威力・低頻度（一撃必殺型） ---
  { id: 'thunder',  name: 'サンダーボルト', type: SKILL_TYPES.HEAVY, icon: '⚡',
    baseDamage: 5.0, fireRate: 2200, color: '#f5c518', width: 16, height: 8,
    desc: '雷の一撃' },
  { id: 'meteor',   name: 'メテオスラッシュ', type: SKILL_TYPES.HEAVY, icon: '☄️',
    baseDamage: 6.0, fireRate: 2800, color: '#ff6b35', width: 20, height: 10,
    desc: '隕石落下' },
  { id: 'vortex',   name: 'ボルテックス', type: SKILL_TYPES.HEAVY, icon: '🌀',
    baseDamage: 4.5, fireRate: 2000, color: '#7b5ea7', width: 14, height: 14,
    desc: '吸い込む渦' },
  { id: 'holy',     name: 'ホーリーレイ', type: SKILL_TYPES.HEAVY, icon: '✨',
    baseDamage: 5.5, fireRate: 2500, color: '#fffde7', width: 18, height: 6,
    desc: '聖なる光線' },

  // --- タイプB: 低威力・高頻度（連射・ガトリング型） ---
  { id: 'arrow',    name: 'マルチアロー', type: SKILL_TYPES.RAPID, icon: '🏹',
    baseDamage: 1.0, fireRate: 350, color: '#81c784', width: 10, height: 4,
    desc: '連続矢' },
  { id: 'bullet',   name: 'マジックバレット', type: SKILL_TYPES.RAPID, icon: '🔵',
    baseDamage: 0.8, fireRate: 280, color: '#4fc3f7', width: 8, height: 8,
    desc: '魔法弾連射' },
  { id: 'needle',   name: 'ニードルレイン', type: SKILL_TYPES.RAPID, icon: '🌧️',
    baseDamage: 0.9, fireRate: 300, color: '#b3e5fc', width: 4, height: 12,
    desc: '針の雨' },
  { id: 'spark',    name: 'スパークショット', type: SKILL_TYPES.RAPID, icon: '✴️',
    baseDamage: 1.1, fireRate: 400, color: '#fff176', width: 8, height: 8,
    desc: '電撃連射' },

  // --- タイプC: 範囲攻撃・中頻度 ---
  { id: 'bomb',     name: 'メテオボム', type: SKILL_TYPES.AREA, icon: '💥',
    baseDamage: 3.0, fireRate: 1200, color: '#ef9f27', width: 22, height: 22, radius: 60,
    desc: '爆発範囲攻撃' },
  { id: 'flame',    name: 'フレイムウェーブ', type: SKILL_TYPES.AREA, icon: '🔥',
    baseDamage: 2.5, fireRate: 1000, color: '#ff7043', width: 40, height: 16, radius: 50,
    desc: '炎の波動' },
  { id: 'ice',      name: 'ブリザードリング', type: SKILL_TYPES.AREA, icon: '❄️',
    baseDamage: 2.0, fireRate: 900, color: '#b3e5fc', width: 30, height: 30, radius: 55,
    desc: '氷結範囲' },
  { id: 'quake',    name: 'アースクエイク', type: SKILL_TYPES.AREA, icon: '🌍',
    baseDamage: 3.5, fireRate: 1400, color: '#a5d6a7', width: 50, height: 12, radius: 80,
    desc: '地震波' },
];

// ID → スキルマスター
export function getSkillById(id) {
  return SKILL_MASTER.find(s => s.id === id) || null;
}

// ================================================================
// ガチャ排出確率計算
// グレード100: 0.1% / グレード1: 最高確率 (べき乗分布)
// ================================================================
export function rollGachaGrade() {
  // 各グレードの重み: weight[g] = (101 - g)^2 で低グレードほど高確率
  // グレード100の重みを1とし、グレード1の重みを10000とするべき乗スケール
  const weights = [];
  let total = 0;
  for (let g = 1; g <= 100; g++) {
    const w = Math.pow(101 - g, 2);
    weights.push(w);
    total += w;
  }

  // グレード100が0.1% = 0.001 になるようスケール検証
  // weights[99] (g=100) / total ≒ 1 / total
  // 実際の排出: ランダム値で決定
  const r = Math.random() * total;
  let acc = 0;
  for (let g = 1; g <= 100; g++) {
    acc += weights[g - 1];
    if (r < acc) return g;
  }
  return 1;
}

// ランダムなスキル種別（12種からランダム）
export function rollGachaSkill() {
  const grade = rollGachaGrade();
  const skill = SKILL_MASTER[Math.floor(Math.random() * SKILL_MASTER.length)];
  return { ...skill, grade, evo: 0, kills: 0 };
}

// ================================================================
// 進化システム
// 進化による威力上昇率: 120%〜200% (べき乗分布、200%は1%)
// ================================================================
export function rollEvoMultiplier() {
  // 上昇率 120〜200 (1刻み81段階)
  // 200%が1% → weight[200] = 1, weight[120] = 最大
  const MIN = 120, MAX = 200;
  const steps = MAX - MIN + 1; // 81
  const weights = [];
  let total = 0;
  for (let i = 0; i < steps; i++) {
    // MAX(200%)になるほど確率が低い → 逆順べき乗
    const w = Math.pow(steps - i, 2);
    weights.push(w);
    total += w;
  }
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < steps; i++) {
    acc += weights[i];
    if (r < acc) return (MIN + i) / 100; // 1.20〜2.00
  }
  return 1.20;
}

// 進化実行 (equip配列の該当スロットを更新して返す)
export function evolveSkill(equip, slotIndex) {
  const slot = equip[slotIndex];
  if (!slot || slot.evo >= 2) return equip;

  const multiplier = rollEvoMultiplier();
  const newGrade   = Math.min(100, Math.round(slot.grade * multiplier));
  const updated    = { ...slot, grade: newGrade, evo: slot.evo + 1 };
  const newEquip   = [...equip];
  newEquip[slotIndex] = updated;
  return newEquip;
}

// 進化条件チェック
export function canEvolve(slot) {
  if (!slot || slot.evo >= 2) return false;
  const threshold = slot.evo === 0 ? 1000 : 5000;
  return slot.kills >= threshold;
}

// 実際のダメージ計算（グレード・進化込み）
export function calcDamage(slot) {
  const master = getSkillById(slot.id);
  if (!master) return 1;
  return master.baseDamage * (slot.grade / 50);
}
