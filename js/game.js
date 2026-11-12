'use strict';
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color || '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'boot';
    this.paused = false;
    this.camX = 0;
    this.shake = 0;
    this.time = 0;
    this.lvl = null;
    this.projectiles = [];
    this.particles = [];
    this.boss = null;
    this.bossStarted = false;
    this.score = 0;
    this.worldIndex = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    this.canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  }
  viewW() {
    return this.canvas.width / (this.canvas.height / VIEW_H);
  }
  startWorld(i) {
    this.worldIndex = i;
    this.lvl = generateWorld(i);
    this.player = new Player(this.lvl.spawnX, this.lvl.groundY - 50);
    this.enemies = this.lvl.enemies.map(sp => new Enemy(sp, this.lvl));
    this.bananas = this.lvl.bananas.map(b => ({ tx: b.tx, ty: b.ty, taken: false }));
    this.projectiles = [];
    this.particles = [];
    this.boss = null;
    this.bossStarted = false;
    this.score = 0;
    this.camX = 0;
    this.shake = 0;
    this.time = 0;
    this.state = 'play';
    this.paused = false;
    this.updateHud();
  }
  spawnShock(x, dir, speed) {
    this.projectiles.push(new Projectile(x, this.lvl.groundY, dir * (speed || 380), 0, 0, 'shock'));
  }
  spawnMinion(x) {
    const e = new Enemy({ tx: Math.floor(x / TILE), ty: 11 }, this.lvl);
    e.speed = 110;
    this.enemies.push(e);
  }
  spawnParticles(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: -Math.random() * 300 - 60,
        life: 0.5 + Math.random() * 0.4,
        t: 0, col,
        s: 3 + Math.random() * 4
      });
    }
  }
  updateHud() {
    if (window.UI) UI.updateHud(this);
  }
  showBanner(txt) {
    if (window.UI) UI.banner(txt);
  }
  startBoss() {
    this.bossStarted = true;
    const cfg = WORLDS[this.worldIndex].bossCfg;
    const arena = { x1: this.lvl.arenaX1, x2: this.lvl.arenaX2, gy: this.lvl.groundY };
    this.boss = new Boss(cfg, arena);
    this.boss.setState('idle', 1.2);
    this.showBanner('⚠ BOSS : ' + cfg.name + ' ⚠');
    AudioSys.sfx('roar');
  }
  bossCombat() {
    const P = this.player, B = this.boss;
    if (B.state === 'dying' || B.state === 'gone' || B.state === 'sleep') return;
    const bb = B.box;
    const ab = P.attackBox();
    if (ab && rectsOverlap(ab, bb)) {
      if (B.hurt(this)) return;
    }
    if (rectsOverlap(P.box, bb)) {
      if (B.vulnerable && P.vy > 120 && P.y + P.h - bb.y < 34) {
        if (B.hurt(this)) P.vy = -560;
      } else {
        P.hurt(this, bb.x + bb.w / 2);
      }
    }
  }
  onPlayerDeath() {
    if (this.state !== 'play') return;
    this.state = 'dead';
    AudioSys.sfx('die');
    if (window.UI) UI.show('dead');
  }
  onBossDefeated() {
    if (this.state !== 'play') return;
    this.state = 'complete';
    AudioSys.sfx('win');
    this.spawnParticles(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, 30, '#ffd23f');
    if (window.UI) UI.worldComplete(this);
  }
  update(dt) {
    if (this.state !== 'play' || this.paused || !this.lvl) return;
    this.time += dt;
    const lvl = this.lvl, P = this.player;
    P.update(dt, lvl, this);
    if (!this.bossStarted && P.x + P.w > lvl.gateX + TILE * 2) this.startBoss();
    if (this.boss && this.boss.state !== 'gone') {
      this.boss.update(dt, this);
      this.bossCombat();
    }
    if (this.bossStarted && this.boss && this.boss.state !== 'dying' && this.boss.state !== 'gone') {
      if (P.x < lvl.gateX + 6) {
        P.x = lvl.gateX + 6;
        if (P.vx < 0) P.vx = 0;
      }
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.update(dt, lvl);
      const eb = e.box;
      if (rectsOverlap(P.box, eb)) {
        if (P.vy > 120 && P.y + P.h - eb.y < 24) {
          e.dead = true;
          P.vy = -540;
          AudioSys.sfx('stomp');
          this.score += 2;
          this.updateHud();
          this.spawnParticles(eb.x + eb.w / 2, eb.y, 8, '#ffffff');
        } else {
          P.hurt(this, eb.x + eb.w / 2);
        }
      }
      const ab = P.attackBox();
      if (ab && rectsOverlap(ab, eb) && !e.dead) {
        e.dead = true;
        this.score += 2;
        this.updateHud();
        this.spawnParticles(eb.x + eb.w / 2, eb.y + eb.h / 2, 8, '#ffffff');
      }
    }
    for (const b of this.bananas) {
      if (b.taken) continue;
      const bb = { x: b.tx * TILE + 9, y: b.ty * TILE + 9, w: 30, h: 30 };
      if (rectsOverlap(P.box, bb)) {
        b.taken = true;
        this.score++;
        AudioSys.sfx('coin');
        this.updateHud();
      }
    }
    const bx0 = Math.floor(P.box.x / TILE), bx1 = Math.floor((P.box.x + P.box.w) / TILE);
    const by0 = Math.floor(P.box.y / TILE), by1 = Math.floor((P.box.y + P.box.h) / TILE);
    for (let tx = bx0; tx <= bx1; tx++) {
      for (let ty = by0; ty <= by1; ty++) {
        if (tileAt(lvl, tx, ty) === '^' && P.inv <= 0) {
          P.hurt(this, P.x + P.w / 2 + (P.vx >= 0 ? 40 : -40));
        }
      }
    }
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      pr.update(dt, lvl);
      if (!pr.dead && rectsOverlap(P.box, pr.box)) {
        pr.dead = true;
        P.hurt(this, pr.x);
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
    for (const pt of this.particles) {
      pt.t += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 900 * dt;
    }
    this.particles = this.particles.filter(p => p.t < p.life);
    const viewW = this.viewW();
    let target = P.x + P.w / 2 - viewW * 0.45;
    const maxX = lvl.W * TILE - viewW;
    if (this.bossStarted) {
      const lo = Math.min(lvl.gateX - 40, maxX);
      const hi = Math.max(lvl.gateX - 40, maxX);
      target = Math.max(lo, Math.min(target, hi));
    } else {
      target = Math.max(0, Math.min(target, maxX));
    }
    this.camX += (target - this.camX) * Math.min(1, dt * 8);
    this.shake = Math.max(0, this.shake - dt);
    if (P.y > VIEW_H + 160) {
      P.hp = 0;
      this.updateHud();
      this.onPlayerDeath();
    }
  }
  render() {
    if (!this.lvl || !this.player) return;
    const ctx = this.ctx, cw = this.canvas.width, chh = this.canvas.height;
    const scale = chh / VIEW_H;
    const viewW = cw / scale;
    const th = WORLDS[this.worldIndex].theme;
    const t = this.time;
    const shX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 24 : 0;
    const shY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 24 : 0;
    const camX = this.camX + shX;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const grad = ctx.createLinearGradient(0, 0, 0, chh);
    grad.addColorStop(0, th.sky[0]);
    grad.addColorStop(1, th.sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, chh);

    ctx.setTransform(scale, 0, 0, scale, 0, shY);
    drawBackground(ctx, th, camX, viewW, t);
    drawDeco(ctx, this.lvl, th, camX, viewW, t);
    drawGate(ctx, this.lvl, th, camX, viewW, t);
    drawTiles(ctx, this.lvl, th, camX, viewW);
    drawBananas(ctx, this.bananas, t);
    for (const e of this.enemies) if (!e.dead) drawEnemy(ctx, e, th, t);
    for (const pr of this.projectiles) drawProjectile(ctx, pr, t);
    if (this.boss && this.boss.state !== 'gone') drawBoss(ctx, this.boss, t);
    drawPlayer(ctx, this.player, t);
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    if (this.boss && this.bossStarted && this.boss.state !== 'gone') drawBossBar(ctx, this.boss, viewW);
  }
}

function hillLayer(ctx, col, off, hMin, hMax, step) {
  ctx.fillStyle = col;
  const i0 = Math.floor(off / step) - 1;
  const n = Math.ceil((VIEW_H * 2.2) / step) + 3;
  for (let i = i0; i < i0 + n; i++) {
    const hx = i * step - off;
    const h = hMin + ((i * 73) % (hMax - hMin));
    ctx.beginPath();
    ctx.moveTo(hx - 50, VIEW_H);
    ctx.quadraticCurveTo(hx + step / 2, VIEW_H - h - 110, hx + step + 50, VIEW_H);
    ctx.fill();
  }
}

function drawBackground(ctx, th, camX, viewW, t) {
  ctx.fillStyle = th.sun;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(viewW * 0.75, 95, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (th.deco === 'desert') {
    const px = viewW * 0.3 + ((-camX * 0.15) % (viewW * 1.4));
    ctx.fillStyle = th.hillFar;
    ctx.beginPath();
    ctx.moveTo(px - 130, 520); ctx.lineTo(px, 300); ctx.lineTo(px + 130, 520);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 90, 520); ctx.lineTo(px + 180, 380); ctx.lineTo(px + 270, 520);
    ctx.closePath(); ctx.fill();
  }
  if (th.deco === 'volcan') {
    const px = viewW * 0.5 + ((-camX * 0.12) % (viewW * 1.6));
    ctx.fillStyle = th.hillNear;
    ctx.beginPath();
    ctx.moveTo(px - 220, 560); ctx.lineTo(px - 40, 240); ctx.lineTo(px + 40, 240); ctx.lineTo(px + 220, 560);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(px - 40, 232, 80, 10);
    ctx.globalAlpha = 0.4 + Math.sin(t * 3) * 0.15;
    ctx.fillStyle = '#ff8c42';
    ctx.fillRect(px - 55, 222, 110, 20);
    ctx.globalAlpha = 1;
  }
  hillLayer(ctx, th.hillFar, camX * 0.25, 120, 260, 300);
  hillLayer(ctx, th.hillNear, camX * 0.5, 90, 200, 240);
  const amb = th.particle;
  for (let i = 0; i < 22; i++) {
    const seed = i * 97;
    let x, y, col;
    if (amb === 'firefly') {
      x = (((seed * 31 + Math.sin(t * 0.7 + i) * 40) % viewW) + viewW) % viewW;
      y = 200 + (seed % 300) + Math.sin(t + i * 2) * 20;
      col = 'rgba(255,255,150,0.7)';
    } else if (amb === 'ember') {
      x = ((seed * 53 + t * 30 * (1 + (i % 3))) % viewW + viewW) % viewW;
      y = VIEW_H - ((t * 60 * (1 + (i % 2)) + seed) % VIEW_H);
      col = 'rgba(255,120,40,0.6)';
    } else if (amb === 'sand') {
      x = ((seed * 41 + t * 120) % viewW + viewW) % viewW;
      y = (seed * 17) % VIEW_H;
      col = 'rgba(230,210,150,0.35)';
    } else if (amb === 'spore') {
      x = ((seed * 29 + Math.sin(t * 0.5 + i) * 60) % viewW + viewW) % viewW;
      y = (seed * 13 + t * 20) % VIEW_H;
      col = 'rgba(180,255,220,0.4)';
    } else if (amb === 'bubble') {
      x = (seed * 37) % viewW;
      y = VIEW_H - ((t * 40 + seed * 3) % VIEW_H);
      col = 'rgba(150,255,180,0.3)';
    } else {
      x = ((seed * 43 + t * 80) % viewW + viewW) % viewW;
      y = (seed * 11) % 200;
      col = 'rgba(255,255,255,0.25)';
    }
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 3, 3);
  }
}

function drawDeco(ctx, lvl, th, camX, viewW, t) {
  for (const d of lvl.deco) {
    const x = d.x - camX * (d.layer ? 0.75 : 0.45);
    if (x < -180 || x > viewW + 180) continue;
    const s = d.layer ? d.s : d.s * 0.7;
    const gy = 11 * TILE;
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(s, s);
    drawDecoItem(ctx, th, d.kind, t);
    ctx.restore();
  }
}

function drawDecoItem(ctx, th, kind, t) {
  switch (th.deco) {
    case 'jungle':
      if (kind === 0) {
        ctx.strokeStyle = '#6b4423';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(14, -80, 4, -150);
        ctx.stroke();
        ctx.fillStyle = th.hillFar;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.55;
          ctx.beginPath();
          ctx.moveTo(4, -150);
          ctx.quadraticCurveTo(4 + Math.cos(a) * 55, -150 + Math.sin(a) * 55 - 18, 4 + Math.cos(a) * 90, -150 + Math.sin(a) * 90 + 14);
          ctx.quadraticCurveTo(4 + Math.cos(a) * 50, -150 + Math.sin(a) * 50 + 12, 4, -150);
          ctx.fill();
        }
      } else if (kind === 1) {
        ctx.fillStyle = th.hillNear;
        ctx.beginPath();
        ctx.ellipse(0, -14, 34, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(22, -8, 22, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = th.hillNear;
        ctx.lineWidth = 5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 18 - 18, 0);
          ctx.quadraticCurveTo(i * 18 - 14 + Math.sin(t + i) * 6, -70, i * 18 - 10, -130 - i * 12);
          ctx.stroke();
        }
      }
      break;
    case 'savane':
      if (kind === 0) {
        ctx.strokeStyle = '#6b4423';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-4, -70);
        ctx.moveTo(-4, -50); ctx.lineTo(-26, -78);
        ctx.moveTo(-4, -50); ctx.lineTo(20, -80);
        ctx.stroke();
        ctx.fillStyle = th.hillNear;
        ctx.beginPath();
        ctx.ellipse(-2, -86, 52, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 1) {
        ctx.strokeStyle = th.grass;
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 8 - 16, 0);
          ctx.quadraticCurveTo(i * 8 - 14, -18, i * 8 - 10 + Math.sin(t * 2 + i) * 4, -32);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = th.dirtDark;
        ctx.beginPath();
        ctx.ellipse(0, -8, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'desert':
      if (kind === 0) {
        ctx.fillStyle = th.hillFar;
        ctx.beginPath();
        ctx.moveTo(-46, 0); ctx.lineTo(0, -84); ctx.lineTo(46, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.moveTo(0, -84); ctx.lineTo(46, 0); ctx.lineTo(10, 0);
        ctx.closePath(); ctx.fill();
      } else if (kind === 1) {
        ctx.fillStyle = '#4f7a3a';
        roundRect(ctx, -8, -60, 16, 60, 7); ctx.fill();
        roundRect(ctx, -26, -44, 18, 10, 5); ctx.fill();
        roundRect(ctx, -26, -60, 10, 26, 5); ctx.fill();
        roundRect(ctx, 8, -52, 18, 10, 5); ctx.fill();
        roundRect(ctx, 16, -68, 10, 26, 5); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.ellipse(0, -6, 40, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'foret':
      if (kind === 0) {
        ctx.fillStyle = '#0e2a20';
        ctx.fillRect(-6, -140, 12, 140);
        ctx.beginPath();
        ctx.moveTo(-42, -60); ctx.lineTo(0, -170); ctx.lineTo(42, -60);
        ctx.closePath(); ctx.fill();
      } else if (kind === 1) {
        ctx.fillStyle = '#d8cfc0';
        ctx.fillRect(-3, -22, 6, 22);
        ctx.globalAlpha = 0.85 + Math.sin(t * 3) * 0.15;
        ctx.fillStyle = th.accent;
        ctx.beginPath();
        ctx.ellipse(0, -26, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(0, -26, 26, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = '#0e2a20';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-16, -60, 6, -110);
        ctx.stroke();
      }
      break;
    case 'canyon':
      if (kind === 0) {
        ctx.fillStyle = th.hillNear;
        ctx.fillRect(-34, -110, 68, 110);
        ctx.fillStyle = th.dirtDark;
        ctx.fillRect(-34, -80, 68, 10);
        ctx.fillRect(-34, -46, 68, 10);
      } else if (kind === 1) {
        ctx.fillStyle = '#7a4a2b';
        roundRect(ctx, -7, -54, 14, 54, 6); ctx.fill();
        roundRect(ctx, -22, -38, 15, 9, 4); ctx.fill();
        roundRect(ctx, 7, -46, 15, 9, 4); ctx.fill();
      } else {
        ctx.fillStyle = th.dirtDark;
        ctx.beginPath();
        ctx.ellipse(0, -10, 30, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'marais':
      if (kind === 0) {
        ctx.strokeStyle = '#241a10';
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-18, -60, 8, -100);
        ctx.moveTo(-8, -55);
        ctx.quadraticCurveTo(-40, -70, -52, -100);
        ctx.moveTo(-2, -80);
        ctx.quadraticCurveTo(30, -95, 42, -120);
        ctx.stroke();
        ctx.fillStyle = 'rgba(138,255,128,0.25)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-30 + i * 26, -108 - i * 8, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === 1) {
        ctx.strokeStyle = th.grass;
        ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 9 - 14, 0);
          ctx.quadraticCurveTo(i * 9 - 10, -22, i * 9 - 6 + Math.sin(t * 1.5 + i) * 5, -44);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = 'rgba(138,255,128,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -10 - ((t * 20) % 40), 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'volcan':
      if (kind === 0) {
        ctx.fillStyle = '#241009';
        ctx.beginPath();
        ctx.moveTo(-26, 0); ctx.lineTo(-6, -90); ctx.lineTo(10, -90); ctx.lineTo(28, 0);
        ctx.closePath(); ctx.fill();
      } else if (kind === 1) {
        ctx.fillStyle = 'rgba(255,90,31,0.7)';
        ctx.fillRect(-16, -8, 32, 5);
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
        ctx.fillRect(-10, -14, 20, 5);
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = '#1a0a06';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-4, -46);
        ctx.moveTo(-4, -30); ctx.lineTo(-18, -44);
        ctx.moveTo(-4, -34); ctx.lineTo(12, -50);
        ctx.stroke();
      }
      break;
  }
}

function drawGate(ctx, lvl, th, camX, viewW, t) {
  const gx = lvl.gateX - camX;
  if (gx < -100 || gx > viewW + 100) return;
  const gy = 11 * TILE;
  ctx.fillStyle = '#5b3617';
  ctx.fillRect(gx + 6, gy - 120, 12, 120);
  ctx.fillRect(gx + 66, gy - 120, 12, 120);
  ctx.fillStyle = th.accent;
  ctx.fillRect(gx + 6, gy - 128, 72, 14);
  ctx.fillStyle = '#7a2010';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOSS', gx + 45, gy - 96);
  ctx.textAlign = 'left';
}

function drawTiles(ctx, lvl, th, camX, viewW) {
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const x1 = Math.min(lvl.W - 1, Math.floor((camX + viewW) / TILE) + 1);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = 0; ty < lvl.H; ty++) {
      const c = lvl.grid[ty][tx];
      if (c === '#') {
        const px = tx * TILE, py = ty * TILE;
        ctx.fillStyle = th.dirt;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = th.dirtDark;
        ctx.fillRect(px + 5, py + 12, 8, 8);
        ctx.fillRect(px + 28, py + 28, 10, 8);
        if (!isSolid(lvl, tx, ty - 1)) {
          ctx.fillStyle = th.grass;
          ctx.fillRect(px, py, TILE, 14);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(px, py, TILE, 4);
        }
      } else if (c === '^') {
        const px = tx * TILE, py = (ty + 1) * TILE;
        ctx.fillStyle = '#b8c0c8';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(px + k * 16 + 2, py);
          ctx.lineTo(px + k * 16 + 8, py - 26);
          ctx.lineTo(px + k * 16 + 14, py);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
}

function drawBananas(ctx, bananas, t) {
  for (const b of bananas) {
    if (b.taken) continue;
    const x = b.tx * TILE + 24;
    const y = b.ty * TILE + 24 + Math.sin(t * 3 + b.tx) * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5 + Math.sin(t * 2 + b.tx) * 0.15);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0.6, Math.PI * 1.6);
    ctx.arc(0, -3, 10, Math.PI * 1.55, 0.65, true);
    ctx.fill();
    ctx.fillStyle = '#8a5a1a';
    ctx.fillRect(-2, -14, 4, 5);
    ctx.restore();
  }
}

function drawEnemy(ctx, e, th, t) {
  const x = e.x, y = e.y, w = e.w, h = e.h;
  ctx.fillStyle = th.enemy;
  roundRect(ctx, x, y + 4, w, h - 4, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 4, w / 2.4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const ex = e.dir > 0 ? x + w * 0.6 : x + w * 0.4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex - 5, y + 12, 5, 0, Math.PI * 2);
  ctx.arc(ex + 5, y + 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(ex - 5 + e.dir * 2, y + 12, 2.2, 0, Math.PI * 2);
  ctx.arc(ex + 5 + e.dir * 2, y + 12, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ex - 10, y + 5); ctx.lineTo(ex - 1, y + 8);
  ctx.moveTo(ex + 10, y + 5); ctx.lineTo(ex + 1, y + 8);
  ctx.stroke();
  ctx.lineWidth = 1;
  const step = Math.sin(t * 12) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 6, y + h - 3 + step * 0.3, 8, 3);
  ctx.fillRect(x + w - 14, y + h - 3 - step * 0.3, 8, 3);
}

function drawProjectile(ctx, pr, t) {
  switch (pr.type) {
    case 'shock':
      ctx.fillStyle = 'rgba(255,140,66,0.85)';
      ctx.beginPath();
      ctx.moveTo(pr.x - 14, pr.y);
      ctx.quadraticCurveTo(pr.x, pr.y - 44, pr.x + 14, pr.y);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,120,0.9)';
      ctx.beginPath();
      ctx.moveTo(pr.x - 7, pr.y);
      ctx.quadraticCurveTo(pr.x, pr.y - 28, pr.x + 7, pr.y);
      ctx.fill();
      break;
    case 'rock':
    case 'boulder':
      ctx.fillStyle = pr.type === 'boulder' ? '#6b4a35' : '#8a8f96';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(pr.x + pr.r * 0.3, pr.y + pr.r * 0.3, pr.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'web':
      ctx.fillStyle = 'rgba(240,240,255,0.9)';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(240,240,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y - 10); ctx.lineTo(pr.x, pr.y - 30);
      ctx.stroke();
      break;
    case 'fire':
      ctx.fillStyle = 'rgba(255,120,40,0.9)';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,120,0.9)';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bubble':
      ctx.strokeStyle = 'rgba(138,255,128,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 11 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(138,255,128,0.25)';
      ctx.fill();
      ctx.lineWidth = 1;
      break;
  }
}

function drawPlayer(ctx, p, t) {
  if (p.dead) return;
  if (p.inv > 0 && Math.floor(t * 18) % 2 === 0) return;
  const w = p.w, h = p.h;
  ctx.save();
  ctx.translate(p.x + w / 2, p.y);
  if (p.face < 0) ctx.scale(-1, 1);
  const run = p.grounded && Math.abs(p.vx) > 40 ? Math.sin(t * 16) : 0;
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(-12 + run * 6, h - 16, 10, 16);
  ctx.fillRect(2 - run * 6, h - 16, 10, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-15 + run * 6, h - 5, 14, 5);
  ctx.fillRect(1 - run * 6, h - 5, 14, 5);
  ctx.fillStyle = '#f6f2e7';
  roundRect(ctx, -14, 14, 28, 24, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-9, 20, 3, 3);
  ctx.fillRect(4, 26, 3, 3);
  ctx.fillRect(-2, 33, 3, 3);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(-14, 34, 28, 5);
  ctx.fillStyle = '#f6f2e7';
  ctx.fillRect(10, 18, 8, 14);
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(2, 6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-9, 9, 4, 0, Math.PI * 2);
  ctx.arc(13, 9, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath();
  ctx.arc(5, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#191410';
  ctx.beginPath();
  ctx.ellipse(0, -4, 11, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  drawStar(ctx, 1, 6, 4.5);
  drawStar(ctx, 10, 6, 4.5);
  ctx.strokeStyle = '#5b3617';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(6, 12, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
  if (p.atkTime > 0) {
    const ab = p.attackBox();
    ctx.strokeStyle = 'rgba(255,224,102,0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ab.x + ab.w / 2, ab.y + ab.h / 2, 26, t * 30, t * 30 + Math.PI * 1.2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawBossBar(ctx, b, viewW) {
  const w = Math.min(420, viewW - 80);
  const x = (viewW - w) / 2, y = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x - 8, y - 8, w + 16, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#3a0d0d';
  ctx.fillRect(x, y, w, 18);
  const p = Math.max(0, b.hp / b.maxHp);
  ctx.fillStyle = '#e63946';
  ctx.fillRect(x, y, w * p, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(b.name + '  ' + b.hp + '/' + b.maxHp, viewW / 2, y + 13);
  ctx.textAlign = 'left';
}
