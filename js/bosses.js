'use strict';
class Boss {
  constructor(cfg, arena) {
    this.type = cfg.type;
    this.name = cfg.name;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.arena = arena;
    const sizes = {
      croc: [130, 110], rhyno: [140, 120], scorpion: [150, 90],
      spider: [130, 110], lion: [130, 130], python: [170, 100], gorilla: [140, 160]
    };
    const s = sizes[this.type];
    this.w = s[0]; this.h = s[1];
    this.x = arena.x2 - this.w - 80;
    this.y = arena.gy - this.h;
    this.vx = 0; this.vy = 0;
    this.state = 'sleep';
    this.timer = 0;
    this.vulnerable = false;
    this.flash = 0;
    this.face = -1;
    this.dead = false;
    this.cycle = 0;
    this.grounded = true;
    this.landAction = null;
    this.baseY = arena.gy - 260;
    this.t = 0;
    this.dyingT = 0;
    this.lastDrop = 0;
    this.shots = 0;
    this.shotT = 0;
    this.slammed = false;
    this.descendFrom = this.y;
  }
  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  setState(s, t) { this.state = s; this.timer = t; }
  hurt(game) {
    if (!this.vulnerable || this.dead || this.state === 'gone') return false;
    this.hp--;
    this.flash = 0.25;
    this.vulnerable = false;
    AudioSys.sfx('bosshit');
    game.shake = 0.3;
    game.spawnParticles(this.x + this.w / 2, this.y + this.h / 2, 12, '#ffffff');
    if (this.hp <= 0) {
      this.dead = true;
      this.state = 'dying';
      this.dyingT = 0;
      AudioSys.sfx('die');
    } else {
      this.setState('recover', 0.7);
    }
    return true;
  }
  update(dt, game) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'gone') return;
    if (this.state === 'dying') {
      this.dyingT += dt;
      if (this.dyingT > 1.8) {
        game.onBossDefeated();
        this.state = 'gone';
      }
      return;
    }
    if (this.state === 'sleep') return;
    const A = this.arena, P = game.player;
    const cx = this.x + this.w / 2, pcx = P.x + P.w / 2;
    if (this.state !== 'charge' && this.state !== 'dash' && this.state !== 'lunge') {
      this.face = pcx < cx ? -1 : 1;
    }
    this['upd_' + this.type](dt, game, A, P);
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      this.x = Math.max(A.x1 + 6, Math.min(this.x, A.x2 - 6 - this.w));
      if (this.y + this.h >= A.gy) {
        this.y = A.gy - this.h;
        this.vy = 0; this.vx = 0;
        this.grounded = true;
        if (this.landAction) {
          const f = this.landAction;
          this.landAction = null;
          f(game);
        }
      }
    }
  }
  clampArena(A) {
    this.x = Math.max(A.x1 + 6, Math.min(this.x, A.x2 - 6 - this.w));
  }
  upd_croc(dt, game, A) {
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.cycle++;
          this.setState(this.cycle % 2 === 0 ? 'tele' : 'telejump', this.cycle % 2 === 0 ? 0.7 : 0.6);
        }
        break;
      case 'tele':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.setState('charge', 3);
          this.vx = this.face * 720;
          AudioSys.sfx('roar');
        }
        break;
      case 'charge':
        this.x += this.vx * dt;
        if (this.x <= A.x1 + 6 || this.x + this.w >= A.x2 - 6) {
          this.clampArena(A);
          game.shake = 0.35;
          AudioSys.sfx('stomp');
          this.vx = 0;
          this.setState('stun', 1.7);
          this.vulnerable = true;
        }
        break;
      case 'telejump':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.grounded = false;
          this.vy = -950;
          const pcx = game.player.x + game.player.w / 2;
          this.vx = Math.max(-420, Math.min(420, (pcx - (this.x + this.w / 2)) / 0.7));
          this.landAction = (g) => {
            g.shake = 0.4;
            AudioSys.sfx('stomp');
            g.spawnShock(this.x + this.w / 2 - 40, -1);
            g.spawnShock(this.x + this.w / 2 + 40, 1);
            this.setState('stun', 1.4);
            this.vulnerable = true;
          };
          this.state = 'air';
        }
        break;
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('idle', 1.0);
        }
        break;
    }
  }
  upd_rhyno(dt, game, A) {
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) this.setState('tele', 0.8);
        break;
      case 'tele':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.setState('charge', 3);
          this.vx = this.face * 780;
          AudioSys.sfx('roar');
        }
        break;
      case 'charge':
        this.x += this.vx * dt;
        if (this.x <= A.x1 + 6 || this.x + this.w >= A.x2 - 6) {
          this.clampArena(A);
          game.shake = 0.45;
          AudioSys.sfx('stomp');
          for (let i = 0; i < 3; i++) {
            const rx = A.x1 + 80 + Math.random() * (A.x2 - A.x1 - 160);
            game.projectiles.push(new Projectile(rx, 40, (Math.random() - 0.5) * 60, 100, 1500, 'rock'));
          }
          this.vx = 0;
          this.setState('stun', 1.8);
          this.vulnerable = true;
        }
        break;
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('idle', 1.1);
        }
        break;
    }
  }
  upd_scorpion(dt, game, A) {
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        this.x += this.face * 70 * dt;
        this.clampArena(A);
        if (this.timer <= 0) {
          this.cycle++;
          if (this.cycle % 3 === 0 && game.enemies.filter(e => !e.dead).length < 4) {
            game.spawnMinion(this.x + this.w / 2);
          }
          this.setState('tele', 0.6);
        }
        break;
      case 'tele':
        this.timer -= dt;
        if (this.timer <= 0) {
          game.spawnShock(this.x + this.w / 2 + this.face * 70, this.face);
          game.shake = 0.35;
          AudioSys.sfx('stomp');
          this.setState('stun', 1.3);
          this.vulnerable = true;
        }
        break;
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('idle', 2.0);
        }
        break;
    }
  }
  upd_spider(dt, game, A) {
    switch (this.state) {
      case 'idle':
        this.y = this.baseY + Math.sin(this.t * 2) * 18;
        {
          const span = (A.x2 - A.x1) - this.w - 120;
          this.x = A.x1 + 60 + (Math.sin(this.t * 0.7) * 0.5 + 0.5) * span;
        }
        this.timer -= dt;
        if (this.t - this.lastDrop > 1.2) {
          this.lastDrop = this.t;
          game.projectiles.push(new Projectile(this.x + this.w / 2, this.y + this.h, 0, 60, 260, 'web'));
          AudioSys.sfx('shoot');
        }
        if (this.timer <= 0) {
          this.descendFrom = this.y;
          this.setState('descend', 1.4);
        }
        break;
      case 'descend': {
        this.timer -= dt;
        const p = Math.min(1, 1 - this.timer / 1.4);
        this.y = this.descendFrom + (A.gy - this.h - this.descendFrom) * p;
        if (this.timer <= 0) {
          this.setState('down', 1.6);
          this.vulnerable = true;
        }
        break;
      }
      case 'down':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.descendFrom = this.y;
          this.setState('ascend', 1.2);
        }
        break;
      case 'ascend': {
        this.timer -= dt;
        const p = Math.min(1, 1 - this.timer / 1.2);
        this.y = this.descendFrom + (this.baseY - this.descendFrom) * p;
        if (this.timer <= 0) this.setState('idle', 4);
        break;
      }
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('down', 0.8);
        }
        break;
    }
  }
  upd_lion(dt, game, A) {
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.shots = 0;
          this.shotT = 0;
          this.setState('fire', 2);
        }
        break;
      case 'fire':
        this.shotT -= dt;
        if (this.shotT <= 0 && this.shots < 2) {
          this.shots++;
          this.shotT = 0.45;
          const cx = this.x + this.w / 2, cy = this.y + 30;
          for (const sp of [-120, 0, 120]) {
            game.projectiles.push(new Projectile(cx, cy, this.face * 300 + sp, -420, 1100, 'fire'));
          }
          AudioSys.sfx('shoot');
        }
        this.timer -= dt;
        if (this.shots >= 2 && this.shotT <= 0) {
          this.setState('dash', 3);
          this.vx = this.face * 840;
          AudioSys.sfx('roar');
        }
        break;
      case 'dash':
        this.x += this.vx * dt;
        if (this.x <= A.x1 + 6 || this.x + this.w >= A.x2 - 6) {
          this.clampArena(A);
          game.shake = 0.3;
          this.vx = 0;
          this.setState('stun', 1.5);
          this.vulnerable = true;
        }
        break;
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('idle', 0.8);
        }
        break;
    }
  }
  upd_python(dt, game, A) {
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.cycle++;
          this.setState(this.cycle % 2 === 0 ? 'tele' : 'spit', this.cycle % 2 === 0 ? 0.6 : 0.4);
        }
        break;
      case 'tele':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.setState('lunge', 3);
          this.vx = this.face * 760;
          AudioSys.sfx('roar');
        }
        break;
      case 'lunge':
        this.x += this.vx * dt;
        if (this.x <= A.x1 + 6 || this.x + this.w >= A.x2 - 6) {
          this.clampArena(A);
          game.shake = 0.35;
          this.vx = 0;
          this.setState('stun', 1.6);
          this.vulnerable = true;
        }
        break;
      case 'spit':
        this.timer -= dt;
        if (!this.slammed) {
          this.slammed = true;
          const cx = this.x + this.w / 2;
          for (let i = -1; i <= 1; i++) {
            game.projectiles.push(new Projectile(cx, this.y + 10, this.face * 60 + i * 70, -240, -50, 'bubble'));
          }
          AudioSys.sfx('shoot');
        }
        if (this.timer <= 0) {
          this.slammed = false;
          this.setState('recover', 0.6);
        }
        break;
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('idle', 1.0);
        }
        break;
    }
  }
  upd_gorilla(dt, game, A, P) {
    const phase2 = this.hp <= this.maxHp / 2;
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.cycle++;
          this.setState(this.cycle % 3 === 0 ? 'throw' : 'telejump', this.cycle % 3 === 0 ? 0.5 : (phase2 ? 0.4 : 0.6));
        }
        break;
      case 'throw':
        this.timer -= dt;
        if (!this.slammed) {
          this.slammed = true;
          const cx = this.x + this.w / 2;
          for (const sp of [-120, 120]) {
            game.projectiles.push(new Projectile(cx, this.y + 20, this.face * 320 + sp, -520, 1200, 'boulder'));
          }
          AudioSys.sfx('shoot');
        }
        if (this.timer <= 0) {
          this.slammed = false;
          this.setState('recover', 0.5);
        }
        break;
      case 'telejump':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.grounded = false;
          this.vy = -1000;
          const pcx = P.x + P.w / 2;
          this.vx = Math.max(-460, Math.min(460, (pcx - (this.x + this.w / 2)) / 0.75));
          this.landAction = (g) => {
            g.shake = 0.5;
            AudioSys.sfx('stomp');
            const spd = phase2 ? 460 : 380;
            g.spawnShock(this.x + this.w / 2 - 40, -1, spd);
            g.spawnShock(this.x + this.w / 2 + 40, 1, spd);
            if (phase2) {
              for (let i = 0; i < 2; i++) {
                const rx = A.x1 + 60 + Math.random() * (A.x2 - A.x1 - 120);
                g.projectiles.push(new Projectile(rx, 40, 0, 150, 1400, 'rock'));
              }
            }
            this.setState('stun', phase2 ? 1.0 : 1.4);
            this.vulnerable = true;
          };
          this.state = 'air';
        }
        break;
      case 'stun':
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.vulnerable = false;
          this.setState('idle', phase2 ? 0.55 : 0.9);
        }
        break;
    }
  }
}

function drawBoss(ctx, b, t) {
  const fl = b.flash > 0;
  const c = (col) => (fl ? '#ffffff' : col);
  const dying = b.state === 'dying';
  ctx.save();
  if (dying) {
    ctx.globalAlpha = Math.max(0, 1 - b.dyingT / 1.8);
    ctx.translate(0, -Math.sin(b.dyingT * 6) * 6);
  }
  const cx = b.x + b.w / 2;
  const shake = (b.state === 'tele' || b.state === 'telejump' || b.state === 'charge') ? Math.sin(t * 40) * 3 : 0;
  ctx.translate(cx + shake, b.y);
  if (b.face < 0) ctx.scale(-1, 1);
  ctx.translate(-b.w / 2, 0);
  const w = b.w, h = b.h;
  switch (b.type) {
    case 'croc': {
      ctx.fillStyle = c('#2e8b3a');
      roundRect(ctx, 0, h * 0.35, w, h * 0.65, 20); ctx.fill();
      ctx.fillStyle = c('#cfe8a0');
      roundRect(ctx, w * 0.15, h * 0.6, w * 0.7, h * 0.35, 12); ctx.fill();
      ctx.fillStyle = c('#2e8b3a');
      roundRect(ctx, w * 0.45, 0, w * 0.55, h * 0.45, 14); ctx.fill();
      ctx.fillStyle = c('#1d5c26');
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.28); ctx.lineTo(w, h * 0.22); ctx.lineTo(w, h * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(w * (0.58 + i * 0.1), h * 0.28);
        ctx.lineTo(w * (0.62 + i * 0.1), h * 0.38);
        ctx.lineTo(w * (0.66 + i * 0.1), h * 0.28);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath(); ctx.arc(w * 0.62, h * 0.14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(w * 0.64, h * 0.14, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c('#ffd23f');
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.02); ctx.lineTo(w * 0.56, -h * 0.12);
      ctx.lineTo(w * 0.62, 0); ctx.lineTo(w * 0.68, -h * 0.14);
      ctx.lineTo(w * 0.74, 0); ctx.lineTo(w * 0.8, -h * 0.12);
      ctx.lineTo(w * 0.86, h * 0.02);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c('#2e8b3a');
      ctx.beginPath();
      ctx.moveTo(6, h * 0.5);
      ctx.quadraticCurveTo(-w * 0.25, h * 0.35, -w * 0.3, h * 0.75);
      ctx.quadraticCurveTo(-w * 0.1, h * 0.6, 8, h * 0.72);
      ctx.fill();
      ctx.fillStyle = c('#256f2f');
      ctx.fillRect(w * 0.15, h * 0.9, w * 0.2, h * 0.1);
      ctx.fillRect(w * 0.6, h * 0.9, w * 0.2, h * 0.1);
      break;
    }
    case 'rhyno': {
      ctx.fillStyle = c('#8d99ae');
      roundRect(ctx, 0, h * 0.25, w, h * 0.75, 24); ctx.fill();
      ctx.fillStyle = c('#6c7689');
      roundRect(ctx, w * 0.55, 0, w * 0.45, h * 0.5, 16); ctx.fill();
      ctx.fillStyle = c('#e2e6ee');
      ctx.beginPath();
      ctx.moveTo(w * 0.86, h * 0.16); ctx.lineTo(w * 1.08, h * 0.02); ctx.lineTo(w * 0.92, h * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(w * 0.72, h * 0.16, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c('#6c7689');
      ctx.fillRect(w * 0.1, h * 0.9, w * 0.22, h * 0.1);
      ctx.fillRect(w * 0.62, h * 0.9, w * 0.22, h * 0.1);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      roundRect(ctx, w * 0.08, h * 0.35, w * 0.4, h * 0.18, 8); ctx.fill();
      break;
    }
    case 'scorpion': {
      ctx.fillStyle = c('#4a3728');
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.65, w * 0.42, h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c('#4a3728');
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.55);
      ctx.quadraticCurveTo(w * 0.05, h * 0.05, w * 0.45, h * 0.02);
      ctx.stroke();
      ctx.fillStyle = c('#ffd23f');
      ctx.beginPath();
      ctx.arc(w * 0.48, h * 0.02, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c('#3a2a1c');
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(w * 0.78, h * 0.6); ctx.lineTo(w * 1.02, h * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 1.06, h * 0.36, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(w * 0.3, -4, w * 0.35, 8);
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath(); ctx.arc(w * 0.86, h * 0.3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1;
      break;
    }
    case 'spider': {
      ctx.strokeStyle = c('#3a2450');
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        const lx = w * (0.15 + i * 0.22);
        ctx.beginPath();
        ctx.moveTo(lx, h * 0.55);
        ctx.quadraticCurveTo(lx - 24, h * 0.35, lx - 34, h * 0.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx + 10, h * 0.55);
        ctx.quadraticCurveTo(lx + 34, h * 0.35, lx + 44, h * 0.85);
        ctx.stroke();
      }
      ctx.fillStyle = c('#6a3b9e');
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.55, w * 0.38, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c('#8a4fbf');
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.28, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffdd55';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(w * (0.4 + i * 0.07), h * 0.24, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = c('#4a1d78');
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.14); ctx.lineTo(w * 0.5, -h * 0.35); ctx.lineTo(w * 0.72, h * 0.14);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(w * 0.24, h * 0.1, w * 0.52, 7);
      drawStar(ctx, w * 0.5, -h * 0.12, 6, c('#ffd23f'));
      if (b.state === 'descend' || b.state === 'down' || b.state === 'ascend') {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, 0);
        ctx.lineTo(w * 0.5, -600);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      break;
    }
    case 'lion': {
      ctx.fillStyle = c('#e8853a');
      roundRect(ctx, w * 0.1, h * 0.3, w * 0.8, h * 0.6, 22); ctx.fill();
      ctx.fillStyle = c('#a34d14');
      ctx.beginPath();
      ctx.arc(w * 0.62, h * 0.32, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c('#e8853a');
      ctx.beginPath();
      ctx.arc(w * 0.66, h * 0.32, w * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#331100';
      ctx.beginPath(); ctx.arc(w * 0.6, h * 0.28, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.72, h * 0.28, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c('#ffd23f');
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 0.9 + (i / 4) * Math.PI * 0.9;
        ctx.beginPath();
        ctx.moveTo(w * 0.66 + Math.cos(a) * w * 0.3, h * 0.3 + Math.sin(a) * w * 0.3);
        ctx.lineTo(w * 0.66 + Math.cos(a) * (w * 0.3 + 12), h * 0.3 + Math.sin(a) * (w * 0.3 + 12));
        ctx.strokeStyle = c('#ffd23f');
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillStyle = c('#7a4fd0');
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.06); ctx.lineTo(w * 0.62, -h * 0.3); ctx.lineTo(w * 0.74, h * 0.06);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c('#c9a227');
      ctx.fillRect(w * 0.2, h * 0.42, w * 0.4, 6);
      ctx.lineWidth = 1;
      break;
    }
    case 'python': {
      ctx.fillStyle = c('#2f8f4e');
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(w * (0.24 + i * 0.2), h * (0.72 - (i % 2) * 0.18), w * 0.16, h * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = c('#3fae5c');
      ctx.beginPath();
      ctx.ellipse(w * 0.82, h * 0.3, w * 0.17, h * 0.26, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffdd55';
      ctx.beginPath(); ctx.arc(w * 0.88, h * 0.22, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(w * 0.9, h * 0.22, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c('#e63946');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.98, h * 0.36);
      ctx.lineTo(w * 1.06, h * 0.42);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.85, w * 0.14, h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gorilla': {
      ctx.fillStyle = c('#2b2b33');
      roundRect(ctx, w * 0.05, h * 0.25, w * 0.9, h * 0.65, 26); ctx.fill();
      ctx.fillStyle = c('#8d99ae');
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.55, w * 0.24, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c('#2b2b33');
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.18, w * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c('#4a4a55');
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.26, w * 0.16, h * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.arc(w * 0.42, h * 0.15, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.58, h * 0.15, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c('#ffd23f');
      ctx.fillRect(w * 0.3, -h * 0.02, w * 0.4, 9);
      ctx.beginPath();
      ctx.moveTo(w * 0.3, -h * 0.02); ctx.lineTo(w * 0.36, -h * 0.12);
      ctx.lineTo(w * 0.42, -h * 0.02); ctx.lineTo(w * 0.48, -h * 0.14);
      ctx.lineTo(w * 0.54, -h * 0.02); ctx.lineTo(w * 0.62, -h * 0.12);
      ctx.lineTo(w * 0.7, -h * 0.02);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c('#2b2b33');
      ctx.fillRect(w * 0.0, h * 0.4, w * 0.16, h * 0.5);
      ctx.fillRect(w * 0.84, h * 0.4, w * 0.16, h * 0.5);
      break;
    }
  }
  ctx.restore();
  if (b.vulnerable && !dying) {
    drawStar(ctx, cx, b.y - 26, 10 + Math.sin(t * 8) * 2, '#ffd23f');
  }
}
