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

let _raf   = null;
let _state = null;

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
  const equip = getEquip();
  return {
    canvas,
    player:         createPlayer(canvas),
    enemies:        [],
    projectiles:    [],
    particles:      [],
    scorePopups:    [],
    pits:           [],       // 落とし穴リスト
    pitSpawnTimer:  0,
    equip,
    skillTimers:    equip.map(() => 0),
    score:          0,
    distance:       0,
    kills:          0,
    avoids:         0,
    difficulty:     0,
    spawnTimer:     0,
    elapsed:        0,
    lastTime:       performance.now(),
    over:           false,
    overReason:     '',       // 'enemy' | 'pit'
    avoidTracked:   new Set(),
    enemyIdCounter: 0,
    bgOffset:       0,
  };
}

// ---- メインループ ----

function _loop(canvas, s) {
  const now = performance.now();
  const dt  = Math.min((now - s.lastTime) / 1000, 0.05);
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
  s.elapsed   += dt;
  s.distance  += dt * 60;
  s.difficulty = Math.floor(s.elapsed / 10);

  // 落とし穴：プレイヤー直下に穴があるか
  const pitUnder = _isPitUnder(s);
  const groundY  = pitUnder ? s.canvas.height + 100 : s.player.groundY;

  updatePlayer(s.player, groundY);

  // 落下死
  if (s.player.y > s.canvas.height + 20) {
    s.over       = true;
    s.overReason = 'pit';
    return;
  }

  // 敵スポーン
  s.spawnTimer += dt * 1000;
  if (s.spawnTimer >= getSpawnInterval(s.difficulty)) {
    s.spawnTimer = 0;
    const e = createEnemy(s.canvas, s.difficulty);
    e._id = s.enemyIdCounter++;
    s.enemies.push(e);
  }

  // 落とし穴スポーン（スコア1万点以上）
  _updatePits(s, dt);

  updateEnemies(s.enemies, dt);
  _updateSkills(s, dt);
  _updateProjectiles(s, dt);
  _checkCollisions(s);
  _checkAvoids(s);
  _updateParticles(s, dt);

  s.scorePopups = s.scorePopups.filter(p => { p.life -= dt; return p.life > 0; });
  s.enemies     = s.enemies.filter(e => !e.offscreen && !e.dead);
}

// ---- 落とし穴 ----

function _updatePits(s, dt) {
  // スコア10000未満は穴なし
  if (s.score < 10000) return;

  // 難易度：スコア1万ごとに穴が広く・頻繁になる
  const pitLevel   = Math.floor(s.score / 10000); // 1〜
  const pitW       = Math.min(50 + pitLevel * 15, 160); // 最大160px
  const pitInterval= Math.max(4000 - pitLevel * 300, 1500); // 最短1.5秒

  s.pitSpawnTimer = (s.pitSpawnTimer || 0) + dt * 1000;
  if (s.pitSpawnTimer >= pitInterval) {
    s.pitSpawnTimer = 0;
    s.pits.push({
      x:    s.canvas.width + 10,
      w:    pitW,
      speed: 2.5 + s.difficulty * 0.03,
    });
  }

  // 穴を左へ移動
  for (const pit of s.pits) {
    pit.x -= pit.speed * 60 * dt;
  }
  s.pits = s.pits.filter(pit => pit.x + pit.w > -20);
}

function _isPitUnder(s) {
  const px = s.player.x;
  return s.pits.some(pit => px + 10 > pit.x && px - 10 < pit.x + pit.w);
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
  const p   = s.player;
  const dmg = calcDamage(slot);

  if (master.type === 'area') {
    // ③ 範囲攻撃：大きな発射体として飛ばし、当たるまで消えない
    s.projectiles.push({
      x:       p.x + p.w / 2,
      y:       p.y - p.h * 0.5,
      w:       master.width  || 40,
      h:       master.height || 24,
      vx:      3.5,
      dmg,
      color:   master.color,
      slotRef: slot,
      isArea:  true,
      radius:  master.radius || 60,
    });
  } else {
    s.projectiles.push({
      x:       p.x + p.w / 2,
      y:       p.y - p.h * 0.5,
      w:       master.width,
      h:       master.height,
      vx:      master.type === 'rapid' ? 14 : 9,
      dmg,
      color:   master.color,
      slotRef: slot,
      isArea:  false,
    });
  }
}

// ---- 発射体更新 ----

function _updateProjectiles(s, dt) {
  for (const proj of s.projectiles) {
    proj.x += proj.vx * dt * 60;
  }

  const toRemove = new Set();
  for (let pi = 0; pi < s.projectiles.length; pi++) {
    const proj = s.projectiles[pi];
    if (proj.x > s.canvas.width + 60) { toRemove.add(pi); continue; }

    const pb = { x: proj.x - proj.w/2, y: proj.y - proj.h/2, w: proj.w, h: proj.h };
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (rectsOverlap(pb, getEnemyHitbox(e))) {
        if (proj.isArea) {
          // 爆発：範囲内の全敵にダメージ
          for (const ae of s.enemies) {
            if (!ae.dead && Math.abs(ae.x - proj.x) < (proj.radius || 60)) {
              _hitEnemy(s, ae, proj.dmg, proj.slotRef);
            }
          }
          _spawnParticles(s, proj.x, proj.y, proj.color, 14);
        } else {
          _hitEnemy(s, e, proj.dmg, proj.slotRef);
        }
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

// ---- 被弾判定 ----

function _checkCollisions(s) {
  const phb = getHitbox(s.player);
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (rectsOverlap(phb, getEnemyHitbox(e))) {
      s.over       = true;
      s.overReason = 'enemy';
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
      vx:   (Math.random() - 0.5) * 5,
      vy:   (Math.random() - 0.5) * 5 - 2,
      life: 0.5 + Math.random() * 0.3,
      color,
      size: 2 + Math.random() * 3,
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
    ctx.fillStyle   = proj.color;
    ctx.shadowColor = proj.color;
    ctx.shadowBlur  = proj.isArea ? 12 : 6;
    ctx.globalAlpha = proj.isArea ? 0.85 : 1;
    if (proj.isArea) {
      // 範囲攻撃は丸い形
      ctx.beginPath();
      ctx.ellipse(proj.x, proj.y, proj.w / 2, proj.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(proj.x - proj.w/2, proj.y - proj.h/2, proj.w, proj.h);
    }
    ctx.restore();
  }

  for (const e of s.enemies) drawEnemy(ctx, e);
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

  if (s.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function _drawBackground(ctx, canvas, s) {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.8);
  grad.addColorStop(0, '#0d0d2e');
  grad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.8);

  s.bgOffset = (s.bgOffset + 0.5) % canvas.width;
  ctx.font      = '24px serif';
  ctx.textAlign = 'center';
  for (const pos of [0.1, 0.3, 0.55, 0.75, 0.95]) {
    const tx = ((pos * canvas.width - s.bgOffset + canvas.width) % canvas.width);
    ctx.globalAlpha = 0.35;
    ctx.fillText('🌲', tx, canvas.height * 0.80);
    ctx.globalAlpha = 1;
  }
}

function _drawGround(ctx, canvas, s) {
  const gy = canvas.height * 0.80;
  const W  = canvas.width;

  // 落とし穴を除いた地面を描画
  // まず地面全体を描いてから穴を「消す」
  ctx.fillStyle = '#2a3a2a';
  ctx.fillRect(0, gy, W, canvas.height - gy);
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(0, gy, W, 4);
  ctx.fillStyle = '#4a7a4a';
  for (let i = 0; i < W; i += 32) {
    ctx.fillRect(i, gy, 16, 6);
  }

  // 穴を背景色で上書き（空洞に見せる）
  for (const pit of s.pits) {
    // 奈落の穴（暗い）
    ctx.fillStyle = '#050508';
    ctx.fillRect(pit.x, gy, pit.w, canvas.height - gy);
    // 穴の縁（警告感）
    ctx.fillStyle = '#e53935';
    ctx.fillRect(pit.x, gy, 3, 8);
    ctx.fillRect(pit.x + pit.w - 3, gy, 3, 8);
  }

  // 落とし穴警告アイコン（スコア10000以上になったら表示）
  if (s.score >= 8000) {
    for (const pit of s.pits) {
      if (pit.x < W + 100 && pit.x > -50) {
        ctx.save();
        ctx.font      = '16px serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.8;
        ctx.fillText('⚠️', pit.x + pit.w / 2, gy - 10);
        ctx.restore();
      }
    }
  }
}

function _drawHUD(ctx, canvas, s) {
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = 'rgba(13,13,26,0.85)';
  ctx.fillRect(0, 0, W, 44);
  ctx.strokeStyle = '#2a2a4e';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(0,44); ctx.lineTo(W,44); ctx.stroke();

  ctx.save();
  ctx.font      = '16px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.fillText(s.score.toLocaleString(), W / 2, 28);
  ctx.font      = '7px "Press Start 2P", monospace';
  ctx.fillStyle = '#7a7a9a';
  ctx.fillText('SCORE', W / 2, 12);
  ctx.restore();

  ctx.save();
  ctx.font      = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7a7a9a';
  ctx.fillText('DIST', W - 12, 14);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(`${Math.floor(s.distance)}m`, W - 12, 30);
  ctx.restore();

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

  const slotW  = 52;
  const startX = W / 2 - (s.equip.length * slotW) / 2;
  s.equip.forEach((slot, i) => {
    if (!slot) return;
    const master = getSkillById(slot.id);
    const sx = startX + i * slotW + 4;
    const sy = H - 54;

    ctx.fillStyle   = '#1a1a2e';
    ctx.strokeStyle = '#7b5ea7';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(sx, sy, 44, 44, 3);
    ctx.fill(); ctx.stroke();

    const progress = 1 - Math.min(s.skillTimers[i] / (master?.fireRate || 1000), 1);
    if (progress > 0) {
      ctx.save();
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(sx + 22, sy + 22, 19, -Math.PI/2, -Math.PI/2 + (1-progress)*Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.font      = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(master?.icon || '?', sx + 22, sy + 30);

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
  await new Promise(r => setTimeout(r, 800));

  const user = getCurrentUser();
  if (user) {
    try {
      await saveScore(user.token, { score: s.score, equip: s.equip, totalKills: s.kills });
    } catch (_) {}
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
  const onKey = (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      jump(s.player);
    }
  };
  document.addEventListener('keydown', onKey);

  const onTouch = (e) => {
    e.preventDefault();
    jump(s.player);
  };
  document.getElementById('screen-game')
    .addEventListener('touchstart', onTouch, { passive: false });

  s._cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.getElementById('screen-game')
      ?.removeEventListener('touchstart', onTouch);
  };
}
