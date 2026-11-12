'use strict';
function tileAt(lvl, tx, ty) {
  if (tx < 0 || tx >= lvl.W) return '#';
  if (ty < 0 || ty >= lvl.H) return '.';
  return lvl.grid[ty][tx];
}
function isSolid(lvl, tx, ty) {
  const c = tileAt(lvl, tx, ty);
  return c === '#' || c === '|';
}
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 34; this.h = 46;
    this.vx = 0; this.vy = 0;
    this.grounded = false; this.coyote = 0;
    this.hp = 3; this.inv = 0;
    this.atkCd = 0; this.atkTime = 0;
    this.face = 1;
    this.prevJump = false; this.prevAtk = false;
    this.dead = false;
  }
  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  attackBox() {
    if (this.atkTime <= 0) return null;
    return {
      x: this.face > 0 ? this.x + this.w - 8 : this.x - 40,
      y: this.y + 4, w: 48, h: 38
    };
  }
  update(dt, lvl, game) {
    const dir = (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
    if (dir !== 0) this.face = dir;
    const target = dir * MOVE;
    this.vx += (target - this.vx) * Math.min(1, dt * 14);
    const jumpHeld = Input.jump;
    if (jumpHeld && !this.prevJump && (this.grounded || this.coyote > 0)) {
      this.vy = -JUMP;
      this.grounded = false;
      this.coyote = 0;
      AudioSys.sfx('jump');
    }
    if (!jumpHeld && this.vy < -240) this.vy = -240;
    this.prevJump = jumpHeld;
    const atkHeld = Input.attack;
    if (atkHeld && !this.prevAtk && this.atkCd <= 0) {
      this.atkTime = 0.16;
      this.atkCd = 0.5;
      AudioSys.sfx('attack');
    }
    this.prevAtk = atkHeld;
    this.atkCd -= dt;
    this.atkTime -= dt;
    this.vy += GRAVITY * dt;
    if (this.vy > 1300) this.vy = 1300;
    this.moveCollide(dt, lvl);
    this.inv -= dt;
  }
  moveCollide(dt, lvl) {
    this.x += this.vx * dt;
    let b = this.box;
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 1) / TILE);
    if (this.vx > 0) {
      const tx = Math.floor((b.x + b.w - 1) / TILE);
      for (let ty = y0; ty <= y1; ty++) {
        if (isSolid(lvl, tx, ty)) { this.x = tx * TILE - this.w; this.vx = 0; break; }
      }
    } else if (this.vx < 0) {
      const tx = Math.floor(b.x / TILE);
      for (let ty = y0; ty <= y1; ty++) {
        if (isSolid(lvl, tx, ty)) { this.x = (tx + 1) * TILE; this.vx = 0; break; }
      }
    }
    this.y += this.vy * dt;
    b = this.box;
    const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 1) / TILE);
    this.grounded = false;
    if (this.vy > 0) {
      const ty = Math.floor((b.y + b.h - 1) / TILE);
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(lvl, tx, ty)) { this.y = ty * TILE - this.h; this.vy = 0; this.grounded = true; break; }
      }
    } else if (this.vy < 0) {
      const ty = Math.floor(b.y / TILE);
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(lvl, tx, ty)) { this.y = (ty + 1) * TILE; this.vy = 0; break; }
      }
    }
    if (this.grounded) this.coyote = 0.1;
    else this.coyote -= dt;
  }
  hurt(game, fromX) {
    if (this.inv > 0 || this.dead) return;
    this.hp--;
    this.inv = 1.4;
    this.vy = -360;
    this.vx = (this.x + this.w / 2 < fromX ? -1 : 1) * 280;
    AudioSys.sfx('hurt');
    game.updateHud();
    if (this.hp <= 0) {
      this.dead = true;
      game.onPlayerDeath();
    }
  }
}

class Enemy {
  constructor(sp, lvl) {
    this.w = 38; this.h = 34;
    this.x = sp.tx * TILE + (TILE - this.w) / 2;
    this.y = sp.ty * TILE - this.h;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.speed = 70 + lvl.index * 8;
    this.dead = false;
    this.deadT = 0;
  }
  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt, lvl) {
    if (this.dead) { this.deadT += dt; return; }
    this.x += this.dir * this.speed * dt;
    const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
    const tx = Math.floor(aheadX / TILE);
    const tyFoot = Math.floor((this.y + this.h + 4) / TILE);
    const tyBody = Math.floor((this.y + this.h / 2) / TILE);
    if (isSolid(lvl, tx, tyBody) || !isSolid(lvl, tx, tyFoot)) this.dir *= -1;
  }
}

class Projectile {
  constructor(x, y, vx, vy, g, type) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy; this.g = g;
    this.type = type;
    this.dead = false;
    this.t = 0;
    this.r = type === 'boulder' ? 20 : type === 'shock' ? 16 : 12;
  }
  get box() {
    if (this.type === 'shock') return { x: this.x - 14, y: this.y - 34, w: 28, h: 34 };
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }
  update(dt, lvl) {
    this.t += dt;
    this.vy += this.g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.type === 'shock') {
      if (this.t > 2.6) this.dead = true;
      const tx = Math.floor((this.vx > 0 ? this.x + 14 : this.x - 14) / TILE);
      if (isSolid(lvl, tx, Math.floor((this.y - 4) / TILE))) this.dead = true;
      return;
    }
    if (this.type === 'web' || this.type === 'bubble') {
      if (this.t > 3.2 || this.y < 20) this.dead = true;
      if (isSolid(lvl, Math.floor(this.x / TILE), Math.floor((this.y + this.r) / TILE))) this.dead = true;
      return;
    }
    if (isSolid(lvl, Math.floor(this.x / TILE), Math.floor((this.y + this.r) / TILE))) this.dead = true;
    if (this.y > VIEW_H + 100) this.dead = true;
  }
}
