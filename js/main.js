'use strict';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem('funky_monkey_save'));
    if (s && typeof s.unlocked === 'number') return s;
  } catch (e) {}
  return { unlocked: 0, totalBananas: 0 };
}
function writeSave(s) {
  try { localStorage.setItem('funky_monkey_save', JSON.stringify(s)); } catch (e) {}
}

const UI = {
  screens: ['title', 'map', 'dead', 'complete', 'win', 'pause'],
  show(name) {
    for (const s of this.screens) {
      document.getElementById('screen-' + s).classList.toggle('hidden', s !== name);
    }
    const inGame = name === null;
    document.getElementById('controls').classList.toggle('hidden', !inGame);
    document.getElementById('hud').classList.toggle('hidden', name === 'title' || name === 'map' || name === 'win');
  },
  banner(txt) {
    const b = document.getElementById('banner');
    b.textContent = txt;
    b.classList.remove('hidden', 'anim');
    void b.offsetWidth;
    b.classList.add('anim');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.add('hidden'), 2200);
  },
  updateHud(game) {
    if (!game.player) return;
    let s = '';
    for (let i = 0; i < 3; i++) s += i < game.player.hp ? '❤️' : '🖤';
    document.getElementById('hearts').textContent = s;
    document.getElementById('bananas').textContent = '🍌 ' + game.score;
  },
  buildMap(save) {
    const map = document.getElementById('worldgrid');
    map.innerHTML = '';
    WORLDS.forEach((w, i) => {
      const unlocked = i <= save.unlocked;
      const btn = document.createElement('button');
      btn.className = 'worldbtn' + (unlocked ? '' : ' locked');
      btn.innerHTML = unlocked
        ? '<span class="wnum">' + (i + 1) + '</span><span class="wname">' + w.sub + '</span><span class="wboss">👑 ' + w.boss + '</span>'
        : '<span class="wnum">🔒</span><span class="wname">' + w.sub + '</span>';
      if (unlocked) btn.addEventListener('click', () => startWorld(i));
      map.appendChild(btn);
    });
  },
  worldComplete(game) {
    const save = loadSave();
    save.unlocked = Math.max(save.unlocked, Math.min(game.worldIndex + 1, WORLDS.length - 1));
    save.totalBananas = (save.totalBananas || 0) + game.score;
    writeSave(save);
    if (game.worldIndex === WORLDS.length - 1) {
      document.getElementById('win-score').textContent = '🍌 Bananes récoltées : ' + game.score;
      this.show('win');
    } else {
      document.getElementById('complete-title').textContent = WORLDS[game.worldIndex].sub + ' TERMINÉ !';
      document.getElementById('complete-score').textContent = '🍌 Bananes : ' + game.score + ' — Boss ' + WORLDS[game.worldIndex].boss + ' vaincu !';
      this.show('complete');
    }
  }
};

let game;
let currentWorld = 0;

function startWorld(i) {
  currentWorld = i;
  AudioSys.init();
  AudioSys.startMusic();
  game.startWorld(i);
  UI.show(null);
  UI.updateHud(game);
  document.getElementById('worldname').textContent = WORLDS[i].name + ' — ' + WORLDS[i].sub;
}

function goMap() {
  UI.buildMap(loadSave());
  UI.show('map');
}

function setupUI() {
  document.getElementById('btn-play').addEventListener('click', () => { AudioSys.init(); goMap(); });
  document.getElementById('btn-map-title').addEventListener('click', () => UI.show('title'));
  document.getElementById('btn-retry').addEventListener('click', () => startWorld(currentWorld));
  document.getElementById('btn-dead-map').addEventListener('click', goMap);
  document.getElementById('btn-next').addEventListener('click', () => startWorld(Math.min(currentWorld + 1, WORLDS.length - 1)));
  document.getElementById('btn-complete-map').addEventListener('click', goMap);
  document.getElementById('btn-win-map').addEventListener('click', goMap);
  document.getElementById('btn-resume').addEventListener('click', () => {
    game.paused = false;
    UI.show(null);
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    game.paused = false;
    goMap();
  });
  document.getElementById('pausebtn').addEventListener('click', () => {
    if (game.state !== 'play') return;
    game.paused = true;
    UI.show('pause');
  });
  const muteBtn = document.getElementById('btn-mute');
  muteBtn.addEventListener('click', () => {
    AudioSys.muted = !AudioSys.muted;
    muteBtn.textContent = AudioSys.muted ? '🔇 Son : OFF' : '🔊 Son : ON';
  });
}

function boot() {
  game = new Game(document.getElementById('game'));
  setupInput();
  setupUI();
  UI.show('title');
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

window.addEventListener('load', boot);
