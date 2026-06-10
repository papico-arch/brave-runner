// ================================================================
// プレイヤー物理 & 2段ジャンプ
// ================================================================

const GRAVITY     = 0.55;
const JUMP_FORCE  = -13;
const GROUND_Y    = 0.80; // 画面高の80%が地面上端

export function createPlayer(canvas) {
  const groundY = canvas.height * GROUND_Y;
  return {
    x:       canvas.width * 0.18,
    y:       groundY,
    w:       32,
    h:       36,
    vy:      0,
    jumps:   0,      // 残ジャンプ回数（最大2）
    maxJumps:2,
    onGround:true,
    groundY,
    // 縮小ヒットボックス（見た目より小さい）
    hitboxW: 20,
    hitboxH: 26,
  };
}

// customGroundY: 落とし穴の上では canvas.height+100 を渡して落下させる
export function updatePlayer(p, customGroundY) {
  const effectiveGroundY = customGroundY ?? p.groundY;
  p.vy += GRAVITY;
  p.y  += p.vy;

  if (p.y >= effectiveGroundY) {
    p.y        = effectiveGroundY;
    p.vy       = 0;
    p.jumps    = 0;
    p.onGround = true;
  } else {
    p.onGround = false;
  }
}

export function jump(p) {
  if (p.jumps < p.maxJumps) {
    p.vy    = JUMP_FORCE;
    p.jumps += 1;
    p.onGround = false;
    return true;
  }
  return false;
}

// ヒットボックス（中央寄せの縮小判定）
export function getHitbox(p) {
  const ox = (p.w - p.hitboxW) / 2;
  const oy = (p.h - p.hitboxH) / 2;
  return {
    x: p.x - p.w / 2 + ox,
    y: p.y - p.h     + oy,
    w: p.hitboxW,
    h: p.hitboxH,
  };
}

// 勇者ドット絵をcanvasに描画
export function drawPlayer(ctx, p) {
  const x = Math.round(p.x - p.w / 2);
  const y = Math.round(p.y - p.h);
  const S = 2; // スケール（16px基準 × 2）

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 髪
  ctx.fillStyle = '#c8a020';
  ctx.fillRect(x + 5*S, y + 0*S, 6*S, 2*S);
  ctx.fillRect(x + 4*S, y + 1*S, 8*S, 3*S);
  // 顔
  ctx.fillStyle = '#f5c090';
  ctx.fillRect(x + 4*S, y + 3*S, 8*S, 5*S);
  // 目
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(x + 5*S, y + 5*S, 2*S, 1*S);
  ctx.fillRect(x + 9*S, y + 5*S, 2*S, 1*S);
  // 鎧胴体
  ctx.fillStyle = '#3a5a8a';
  ctx.fillRect(x + 4*S, y + 8*S, 8*S, 5*S);
  // 紋章
  ctx.fillStyle = '#f5c518';
  ctx.fillRect(x + 7*S, y + 9*S, 2*S, 3*S);
  ctx.fillRect(x + 6*S, y + 10*S, 4*S, 1*S);
  // 盾（左）
  ctx.fillStyle = '#7b2a2a';
  ctx.fillRect(x + 0*S, y + 7*S, 3*S, 6*S);
  ctx.fillStyle = '#f5c518';
  ctx.fillRect(x + 1*S, y + 8*S, 1*S, 4*S);
  ctx.fillRect(x + 0*S, y + 9*S, 3*S, 2*S);
  // 剣（右）
  ctx.fillStyle = '#d0d8e0';
  ctx.fillRect(x + 14*S, y + 2*S, 1*S, 10*S);
  ctx.fillStyle = '#c8a020';
  ctx.fillRect(x + 13*S, y + 7*S, 3*S, 1*S);
  ctx.fillRect(x + 14*S, y + 11*S, 1*S, 2*S);
  // マント
  ctx.fillStyle = '#8a2a2a';
  ctx.fillRect(x + 3*S, y + 9*S, 2*S, 5*S);
  ctx.fillRect(x + 11*S, y + 9*S, 2*S, 5*S);
  // ブーツ
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(x + 5*S, y + 13*S, 3*S, 4*S);
  ctx.fillRect(x + 8*S, y + 13*S, 3*S, 4*S);
  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(x + 4*S, y + 16*S, 4*S, 2*S);
  ctx.fillRect(x + 8*S, y + 16*S, 4*S, 2*S);
  // ハイライト
  ctx.fillStyle = '#4a7ab0';
  ctx.fillRect(x + 4*S, y + 8*S, 1*S, 5*S);
  ctx.fillRect(x + 4*S, y + 8*S, 8*S, 1*S);

  ctx.restore();
}
