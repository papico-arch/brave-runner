// ================================================================
// 敵システム（3〜5種類、難易度スケーリング）
// ================================================================

// 敵マスターデータ（5種）
const ENEMY_TYPES = [
  { id: 'goblin',   name: 'ゴブリン', color: '#4caf50', w: 28, h: 28,
    baseHp: 2,  baseSpeed: 2.2, score: 100, jumpable: true  },
  { id: 'orc',      name: 'オーク',   color: '#795548', w: 36, h: 36,
    baseHp: 5,  baseSpeed: 1.5, score: 200, jumpable: false },
  { id: 'bat',      name: 'コウモリ', color: '#7b5ea7', w: 24, h: 20,
    baseHp: 1,  baseSpeed: 3.0, score: 150, jumpable: false,
    floatY: -60 }, // 地面より上を飛ぶ
  { id: 'skeleton', name: 'スケルトン',color: '#e0e0e0', w: 28, h: 34,
    baseHp: 3,  baseSpeed: 2.5, score: 180, jumpable: true  },
  { id: 'dragon',   name: 'ドラゴン', color: '#e53935', w: 44, h: 40,
    baseHp: 10, baseSpeed: 1.2, score: 500, jumpable: false },
];

export function createEnemy(canvas, difficulty) {
  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  const groundY = canvas.height * 0.80;
  const floatOffset = type.floatY || 0;

  // 難易度スケーリング（HPと速度）
  const scale    = 1 + difficulty * 0.05;
  const hp       = Math.ceil(type.baseHp * scale);
  const speed    = type.baseSpeed * (1 + difficulty * 0.03);

  return {
    ...type,
    x:       canvas.width + type.w,
    y:       groundY + floatOffset,
    hp,
    maxHp:   hp,
    speed,
    dead:    false,
    offscreen: false,
  };
}

export function updateEnemies(enemies, dt) {
  for (const e of enemies) {
    e.x -= e.speed * dt * 60;
    if (e.x + e.w < -50) e.offscreen = true;
  }
}

// 敵のヒットボックス
export function getEnemyHitbox(e) {
  return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
}

// ジャンプで飛び越えたか（敵の真上を通過）
export function checkJumpAvoid(player, enemy) {
  if (!enemy.jumpable) return false;
  const px = player.x;
  const py = player.y - player.h / 2;
  // 敵のX範囲上を通過かつ地面より上にいる
  return (
    px > enemy.x - enemy.w &&
    px < enemy.x + enemy.w &&
    py < enemy.y - enemy.h - 5
  );
}

// 矩形交差判定
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// 敵のドット絵描画
export function drawEnemy(ctx, e) {
  if (e.dead) return;

  const x = Math.round(e.x - e.w / 2);
  const y = Math.round(e.y - e.h);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // シルエットとして簡易描画（実装は絵文字 + HP バー）
  ctx.font      = `${e.h}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText(getEnemyEmoji(e.id), e.x, e.y);

  // HPバー
  if (e.hp < e.maxHp) {
    const barW  = e.w;
    const barH  = 4;
    const barX  = x;
    const barY  = y - 6;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
  }

  ctx.restore();
}

function getEnemyEmoji(id) {
  const map = { goblin:'👺', orc:'👹', bat:'🦇', skeleton:'💀', dragon:'🐉' };
  return map[id] || '👾';
}

// スポーン間隔計算（難易度が上がるほど短くなる）
export function getSpawnInterval(difficulty) {
  return Math.max(600, 2000 - difficulty * 40);
}
