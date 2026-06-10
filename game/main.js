// ================================================================
// ゲームメインループ
// ================================================================

import { createPlayer, updatePlayer, jump, getHitbox, drawPlayer } from './player.js';
import { createEnemy, updateEnemies, getEnemyHitbox, checkJumpAvoid,
         rectsOverlap, drawEnemy, getSpawnInterval }               from './enemy.js';
import { SKILL_MASTER, getSkillById, calcDamage }                   from './skills.js';
import { router }                                                    from '../ui/router.js';
import { getCurrentUser }                                            from '../auth/googleAuth.js';
import { saveScore }                                                 from '../api/gasClient.js';
import { getEquip }                                                  from '../ui/lobby.js';

let _raf      = null;
let _state    = null;

// ---- 公開エントリ ----

export function startGame() {
  const canvas = document.getElementById('gameCanvas');
  _resizeCanvas(canvas);
  _state = _initState(canvas);
  _bindInput(_state);

  if (_raf) cancelAnimationFrame(_raf);
  _loop(canvas, _state);
}

// ---- 初期化 ----

function _initState(canvas) {
  const equip = getEquip(); // ロビーから装備を取得
  return {
    canvas,
    player:       createPlayer(canvas),
    enemies:      [],
    projectiles:  [],
    particles:    [],
    scorePopups:  [],
    equip,        // [{ id, grade, evo, kills }, ...]
    skillTimers:  equip.map(() => 0),
    score:        0,
    distance:     0,
    kills:        0,
    avoids:       0,
    difficulty:   0,
    spawnTimer:   0,
    elapsed:      0,
    lastTime:     performance.now(),
    over:         false,
    avoidTracked: new Set(), // 回避済み敵IDセット
    enemyIdCounter: 0,
    bgOffset:     0,
  };
}

// ---- メインループ ----

function _loop(canvas, s) {
  const now = performance.now();
  const dt  = Math.min((now - s.lastTime) / 1000, 0.05); // 最大50ms
  s.lastTime = now;

  if (!s.over) {
    _update(s, dt);
    _draw(canvas, s);
    _raf = requestAnimationFrame(() => _loop(canvas, s));
  } else {
    _draw(canvas, s);
    _handleGameOver(s);
  }
}

// ---- 更新 ----

function _update(s, dt) {
  s.elapsed    += dt;
  s.distance   += dt * 60;
  s.difficulty  = Math.floor(s.elapsed / 10); // 10秒ごとに難易度+1

  // プレイヤー
  updatePlayer(s.player);

  // 敵スポーン
  s.spawnTimer += dt * 1000;
  const interval = getSpawnInterval(s.difficulty);
  if (s.spawnTimer >= interval) {
    s.spawnTimer = 0;
    const e = createEnemy(s.canvas, s.difficulty);
    e._id = s.enemyIdCounter++;
    s.enemies.push(e);
  }

  // 敵移動
  updateEnemies(s.enemies, dt);

  // 自動攻撃
  _updateSkills(s, dt);

  // 発射体更新
  _updateProjectiles(s, dt);

  // 衝突判定
  _checkCollisions(s);

  // 回避スコア
  _checkAvoids(s);

  // パーティクル
  _updateParticles(s, dt);

  // スコアポップアップ
  s.scorePopups = s.scorePopups.filter(p => { p.life -= dt; return p.life > 0; });

  // 画外の敵を除去
  s.enemies = s.enemies.filter(e => !e.offscreen && !e.dead);
}

// ---- スキル自動発射 ----

function _updateSkills(s, dt) {
  s.equip.forEach((slot, i) => {
    if (!slot) return;
    const master = getSkillById(slot.id);
    if (!master) return;

    s.skillTimers[i] += dt * 1000;
    if (s.skillTimers[i] >= master.fireRate) {
      s.skillTimers[i] = 0;
      _fireSkill(s, slot, master);
    }
  });
}

function _fireSkill(s, slot, master) {
  const p = s.player;
  const dmg = calcDamage(slot);

  if (master.type === 'area') {
    // 範囲攻撃：前方の敵を全てHIT
    s.enemies.forEach(e => {
      if (Math.abs(e.x - p.x) < (master.radius || 60) && e.x > p.x) {
        _hitEnemy(s, e, dmg, slot);
      }
    });
    _spawnParticles(s, p.x + 40, p.y - p.h / 2, master.color, 8);
  } else {
    // 発射体
    s.projectiles.push({
      x:     p.x + p.w / 2,
      y:     p.y - p.h * 0.5,
      w:     master.width,
      h:     master.height,
      vx:    master.type === 'rapid' ? 14 : 9,
      dmg,
      color: master.color,
      skillId: slot.id,
      slotRef: slot,
    });
  }
}

// ---- 発射体更新 ----

function _updateProjectiles(s, dt) {
  for (const proj of s.projectiles) {
    proj.x += proj.vx * dt * 60;
  }

  // 敵ヒット判定
  const toRemove = new Set();
  for (let pi = 0; pi < s.projectiles.length; pi++) {
    const proj = s.projectiles[pi];
    if (proj.x > s.canvas.width + 50) { toRemove.add(pi); continue; }

    const pb = { x: proj.x - proj.w/2, y: proj.y - proj.h/2, w: proj.w, h: proj.h };
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (rectsOverlap(pb, getEnemyHitbox(e))) {
        _hitEnemy(s, e, proj.dmg, proj.slotRef);
        toRemove.add(pi);
        break;
      }
    }
  }
  s.projectiles = s.projectiles.filter((_, i) => !toRemove.has(i));
}

// ---- 敵ヒット処理 ----

function _hitEnemy(s, e, dmg, slotRef) {
  e.hp -= dmg;
  _spawnParticles(s, e.x, e.y - e.h / 2, '#f5c518', 3);
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    const pts = Math.round(e.score * (1 + s.difficulty * 0.1));
    s.score += pts;
    s.kills += 1;
    if (slotRef) slotRef.kills = (slotRef.kills || 0) + 1;
    _addPopup(s, e.x, e.y - e.h, `+${pts}`);
    _spawnParticles(s, e.x, e.y - e.h / 2, e.color, 12);
  }
}

// ---- プレイヤー被弾判定（即死） ----

function _checkCollisions(s) {
  const phb = getHitbox(s.player);
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (rectsOverlap(phb, getEnemyHitbox(e))) {
      s.over = true;
      return;
    }
  }
}

// ---- 回避スコア ----

function _checkAvoids(s) {
  for (const e of s.enemies) {
    if (e.dead || s.avoidTracked.has(e._id)) continue;
    if (checkJumpAvoid(s.player, e)) {
      s.avoidTracked.add(e._id);
      s.score  += 50;
      s.avoids += 1;
      _addPopup(s, s.player.x, s.player.y - s.player.h - 10, 'DODGE! +50', '#4fc3f7');
    }
  }
}

// ---- パーティクル ----

function _spawnParticles(s, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    s.particles.push({
      x, y,
      vx:    (Math.random() - 0.5) * 5,
      vy:    (Math.random() - 0.5) * 5 - 2,
      life:  0.5 + Math.random() * 0.3,
      color,
      size:  2 + Math.random() * 3,
    });
  }
}

function _updateParticles(s, dt) {
  s.particles = s.particles.filter(p => {
    p.x   += p.vx * dt * 60;
    p.y   += p.vy * dt * 60;
    p.vy  += 0.15;
    p.life -= dt;
    return p.life > 0;
  });
}

function _addPopup(s, x, y, text, color = '#f5c518') {
  s.scorePopups.push({ x, y, text, color, life: 1.0 });
}

// ---- 描画 ----

function _draw(canvas, s) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  _drawBackground(ctx, canvas, s);
  _drawGround(ctx, canvas, s);

  // 発射体
  for (const proj of s.projectiles) {
    ctx.save();
    ctx.fillStyle = proj.color;
    ctx.shadowColor = proj.color;
    ctx.shadowBlur  = 6;
    ctx.fillRect(proj.x - proj.w/2, proj.y - proj.h/2, proj.w, proj.h);
    ctx.restore();
  }

  // 敵
  for (const e of s.enemies) drawEnemy(ctx, e);

  // プレイヤー
  drawPlayer(ctx, s.player);

  // パーティクル
  for (const p of s.particles) {
    ctx.save();
    ctx.globalAlpha = p.life * 2;
    ctx.fillStyle   = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    ctx.restore();
  }

  // スコアポップアップ
  ctx.save();
  ctx.font      = '900 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  for (const popup of s.scorePopups) {
    ctx.globalAlpha = popup.life;
    ctx.fillStyle   = popup.color;
    ctx.fillText(popup.text, popup.x, popup.y - (1 - popup.life) * 40);
  }
  ctx.restore();

  _drawHUD(ctx, canvas, s);

  // ゲームオーバー暗転
  if (s.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function _drawBackground(ctx, canvas, s) {
  // 空
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.8);
  grad.addColorStop(0, '#0d0d2e');
  grad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.8);

  // 遠景の木（視差スクロール）
  s.bgOffset = (s.bgOffset + 0.5) % canvas.width;
  ctx.font      = '24px serif';
  ctx.textAlign = 'center';
  const treePositions = [0.1, 0.3, 0.55, 0.75, 0.95];
  for (const pos of treePositions) {
    const tx = ((pos * canvas.width - s.bgOffset + canvas.width) % canvas.width);
    ctx.globalAlpha = 0.35;
    ctx.fillText('🌲', tx, canvas.height * 0.80);
    ctx.globalAlpha = 1;
  }
}

function _drawGround(ctx, canvas) {
  const gy = canvas.height * 0.80;
  ctx.fillStyle = '#2a3a2a';
  ctx.fillRect(0, gy, canvas.width, canvas.height - gy);
  // タイルライン
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(0, gy, canvas.width, 4);
  // タイル縞
  ctx.fillStyle = '#4a7a4a';
  for (let i = 0; i < canvas.width; i += 32) {
    ctx.fillRect(i, gy, 16, 6);
  }
}

function _drawHUD(ctx, canvas, s) {
  const W = canvas.width;
  const H = canvas.height;

  // 上部バー
  ctx.fillStyle = 'rgba(13,13,26,0.85)';
  ctx.fillRect(0, 0, W, 44);
  ctx.strokeStyle = '#2a2a4e';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(0,44); ctx.lineTo(W,44); ctx.stroke();

  // スコア（中央）
  ctx.save();
  ctx.font      = '16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.fillText(s.score.toLocaleString(), W / 2, 28);
  ctx.font      = '7px "Press Start 2P", monospace';
  ctx.fillStyle = '#7a7a9a';
  ctx.fillText('SCORE', W / 2, 12);
  ctx.restore();

  // 距離（右）
  ctx.save();
  ctx.font      = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7a7a9a';
  ctx.fillText('DIST', W - 12, 14);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(`${Math.floor(s.distance)}m`, W - 12, 30);
  ctx.restore();

  // 時間（左）
  const mm = String(Math.floor(s.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(s.elapsed % 60)).padStart(2, '0');
  ctx.save();
  ctx.font      = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7a7a9a';
  ctx.fillText('TIME', 12, 14);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(`${mm}:${ss}`, 12, 30);
  ctx.restore();

  // 下部スキルバー
  ctx.fillStyle = 'rgba(13,13,26,0.9)';
  ctx.fillRect(0, H - 60, W, 60);
  ctx.strokeStyle = '#2a2a4e';
  ctx.beginPath(); ctx.moveTo(0, H-60); ctx.lineTo(W, H-60); ctx.stroke();

  const slotW = 52;
  const startX = W / 2 - (s.equip.length * slotW) / 2;
  s.equip.forEach((slot, i) => {
    if (!slot) return;
    const master = getSkillById(slot.id);
    const sx = startX + i * slotW + 4;
    const sy = H - 54;

    // スロット背景
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#7b5ea7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sx, sy, 44, 44, 3);
    ctx.fill(); ctx.stroke();

    // クールダウンリング
    const progress = 1 - Math.min(s.skillTimers[i] / (master?.fireRate || 1000), 1);
    if (progress > 0) {
      ctx.save();
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(sx + 22, sy + 22, 19, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // アイコン
    ctx.font      = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(master?.icon || '?', sx + 22, sy + 30);

    // グレード
    ctx.save();
    ctx.font      = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5c518';
    ctx.fillText(slot.grade, sx + 22, H - 4);
    ctx.restore();
  });
}

// ---- ゲームオーバー処理 ----

async function _handleGameOver(s) {
  // 少し待ってからゲームオーバー画面へ
  await new Promise(r => setTimeout(r, 800));

  const user = getCurrentUser();
  if (user) {
    try {
      await saveScore(user.token, {
        score:      s.score,
        equip:      s.equip,
        totalKills: s.kills,
      });
    } catch (_) { /* オフライン時は無視 */ }
  }

  router.go('gameover', {
    score:    s.score,
    distance: Math.floor(s.distance),
    kills:    s.kills,
    avoids:   s.avoids,
  });
}

// ---- リサイズ ----

function _resizeCanvas(canvas) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

// ---- 入力バインド ----

function _bindInput(s) {
  // キーボード (Enter / Space)
  const onKey = (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      jump(s.player);
    }
  };
  document.addEventListener('keydown', onKey, { once: false });

  // タッチ（touchstart で遅延ゼロ）
  const onTouch = (e) => {
    e.preventDefault();
    jump(s.player);
  };
  document.getElementById('screen-game')
    .addEventListener('touchstart', onTouch, { passive: false });

  // クリーンアップ用に参照を保持
  s._cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.getElementById('screen-game')
      ?.removeEventListener('touchstart', onTouch);
  };
}
