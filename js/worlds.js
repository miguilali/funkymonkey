'use strict';
const TILE = 48;
const VIEW_H = 13 * TILE;
const GRAVITY = 2400;
const MOVE = 300;
const JUMP = 880;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORLDS = [
  {
    name: 'MONDE 1', sub: 'LA JUNGLE PROFONDE', boss: 'KING CROC',
    theme: {
      sky: ['#8fd3f4', '#eaf9df'], sun: '#fff3b0',
      hillFar: '#7fc98f', hillNear: '#3e9e5c',
      grass: '#3fae5c', dirt: '#7a4a21', dirtDark: '#5b3617',
      deco: 'jungle', accent: '#ffd23f', enemy: '#7bc043', particle: 'firefly'
    },
    bossCfg: { type: 'croc', hp: 6, name: 'KING CROC' }
  },
  {
    name: 'MONDE 2', sub: 'LA SAVANE DORÉE', boss: 'RHYNOK',
    theme: {
      sky: ['#ffd89b', '#ffb36b'], sun: '#fff8d6',
      hillFar: '#d9a441', hillNear: '#b07a2a',
      grass: '#c9b458', dirt: '#9c6b2f', dirtDark: '#754e20',
      deco: 'savane', accent: '#ff8c42', enemy: '#a06a2c', particle: 'sand'
    },
    bossCfg: { type: 'rhyno', hp: 6, name: 'RHYNOK' }
  },
  {
    name: 'MONDE 3', sub: 'LE DÉSERT MYSTIQUE', boss: 'SCORPION PHARAON',
    theme: {
      sky: ['#ffe29a', '#ffc178'], sun: '#fffbe0',
      hillFar: '#e0b25f', hillNear: '#c68a3f',
      grass: '#e8c877', dirt: '#b07f35', dirtDark: '#8a5f24',
      deco: 'desert', accent: '#ffd700', enemy: '#5c4a1e', particle: 'sand'
    },
    bossCfg: { type: 'scorpion', hp: 7, name: 'SCORPION PHARAON' }
  },
  {
    name: 'MONDE 4', sub: 'LA FORÊT ENCHANTEE', boss: 'SORCIÈRE ARAIGNÉE',
    theme: {
      sky: ['#1b3a4b', '#2e6e5e'], sun: '#c8ffe0',
      hillFar: '#1f5c4d', hillNear: '#144232',
      grass: '#2e8b57', dirt: '#3d2f4f', dirtDark: '#2a2038',
      deco: 'foret', accent: '#7cffcb', enemy: '#8a4fbf', particle: 'spore'
    },
    bossCfg: { type: 'spider', hp: 7, name: 'SORCIÈRE ARAIGNÉE' }
  },
  {
    name: 'MONDE 5', sub: 'LE CANYON DES ESPRITS', boss: 'SULTAN MANÉ',
    theme: {
      sky: ['#f4a261', '#e76f51'], sun: '#fff1c9',
      hillFar: '#b5563a', hillNear: '#8a3b28',
      grass: '#d9822b', dirt: '#8a3b28', dirtDark: '#6b2c1e',
      deco: 'canyon', accent: '#ffe08a', enemy: '#c2571f', particle: 'dust'
    },
    bossCfg: { type: 'lion', hp: 8, name: 'SULTAN MANÉ' }
  },
  {
    name: 'MONDE 6', sub: 'LE MARAIS TOXIQUE', boss: 'VENOM REX',
    theme: {
      sky: ['#3e5641', '#5d7a52'], sun: '#d7f5a9',
      hillFar: '#44693f', hillNear: '#2e4d2b',
      grass: '#5a8f3c', dirt: '#4a3b2a', dirtDark: '#35291c',
      deco: 'marais', accent: '#8aff80', enemy: '#5da130', particle: 'bubble'
    },
    bossCfg: { type: 'python', hp: 8, name: 'VENOM REX' }
  },
  {
    name: 'MONDE 7', sub: 'LE VOLCAN DU CHAOS', boss: 'GORILLA KING',
    theme: {
      sky: ['#2b0f0f', '#7a1f0f'], sun: '#ff6b35',
      hillFar: '#571c14', hillNear: '#3a120d',
      grass: '#6b2c1e', dirt: '#4a1a12', dirtDark: '#33100b',
      deco: 'volcan', accent: '#ff8c42', enemy: '#e25822', particle: 'ember'
    },
    bossCfg: { type: 'gorilla', hp: 10, name: 'GORILLA KING' }
  }
];

function generateWorld(index) {
  const rng = mulberry32(98765 + index * 4242);
  const H = 13, GY = 11, ARENA_W = 24;
  const W = 96 + index * 8 + ARENA_W;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));
  const bananas = [], enemies = [], deco = [];
  const setGround = (x) => { grid[GY][x] = '#'; grid[GY + 1][x] = '#'; };
  let x = 0;
  for (; x < 8; x++) setGround(x);
  const endX = W - ARENA_W;
  while (x < endX) {
    const r = rng();
    if (r < 0.3) {
      const len = 4 + Math.floor(rng() * 4);
      const sx = x;
      for (let i = 0; i < len && x < endX; i++, x++) setGround(x);
      const segW = x - sx;
      if (segW >= 4) {
        const roll = rng();
        if (roll < 0.42) enemies.push({ tx: sx + Math.floor(segW / 2), ty: GY });
        else if (roll < 0.58 && index >= 2) grid[GY - 1][sx + Math.floor(segW / 2)] = '^';
        else if (roll < 0.85) {
          for (let i = 1; i < segW - 1; i++) if (rng() < 0.55) bananas.push({ tx: sx + i, ty: GY - 1 });
        }
      }
    } else if (r < 0.56) {
      const gs = x;
      const gw = 2 + ((rng() < 0.25 + index * 0.05) ? 1 : 0);
      for (let i = 0; i < gw && x < endX; i++, x++) {}
      if (rng() < 0.55) {
        for (let i = 0; i < gw && gs + i < endX; i++) grid[GY - 3][gs + i] = '#';
        for (let i = 0; i < gw; i++) bananas.push({ tx: gs + i, ty: GY - 5 });
      } else {
        for (let i = 0; i < gw; i++) bananas.push({ tx: gs + i, ty: GY - 3 });
      }
    } else if (r < 0.76) {
      const sx = x;
      const len = 5 + Math.floor(rng() * 3);
      for (let i = 0; i < len && x < endX; i++, x++) setGround(x);
      const n = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) {
        const pw = 3;
        const px = sx + Math.floor(rng() * Math.max(1, x - sx - pw));
        const py = GY - 3;
        for (let i = 0; i < pw && px + i < endX; i++) grid[py][px + i] = '#';
        bananas.push({ tx: px + 1, ty: py - 1 });
        if (rng() < 0.35) enemies.push({ tx: px + 1, ty: py });
      }
    } else if (r < 0.9 && index >= 1) {
      const len = 7;
      const sx = x;
      for (let i = 0; i < len && x < endX; i++, x++) {
        setGround(x);
        const h = i <= 3 ? i + 1 : len - i;
        for (let k = 1; k <= Math.min(h, 3); k++) grid[GY - k][x] = '#';
      }
      bananas.push({ tx: sx + 3, ty: GY - 4 });
    } else {
      const len = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < len && x < endX; i++, x++) setGround(x);
    }
  }
  for (let i = x; i < W; i++) setGround(i);
  for (let y = 0; y < H; y++) grid[y][W - 1] = '#';
  const decoN = Math.floor(W / 5);
  for (let i = 0; i < decoN; i++) {
    deco.push({
      x: rng() * W * TILE,
      kind: Math.floor(rng() * 3),
      s: 0.7 + rng() * 0.8,
      layer: rng() < 0.5 ? 0 : 1
    });
  }
  return {
    index, grid, W, H, bananas, enemies, deco,
    gateX: (W - ARENA_W) * TILE,
    arenaX1: (W - ARENA_W) * TILE,
    arenaX2: (W - 1) * TILE,
    groundY: GY * TILE,
    spawnX: 2 * TILE
  };
}
