'use strict';
const Input = { left: false, right: false, jump: false, attack: false };

function bindButton(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;
  const on = (e) => {
    e.preventDefault();
    Input[prop] = true;
    AudioSys.init();
    el.classList.add('pressed');
  };
  const off = (e) => {
    e.preventDefault();
    Input[prop] = false;
    el.classList.remove('pressed');
  };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
}

function setupInput() {
  bindButton('btn-left', 'left');
  bindButton('btn-right', 'right');
  bindButton('btn-jump', 'jump');
  bindButton('btn-atk', 'attack');
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') Input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') Input.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') Input.jump = true;
    if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'Enter') Input.attack = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') Input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') Input.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') Input.jump = false;
    if (e.code === 'KeyX' || e.code === 'KeyJ' || e.code === 'Enter') Input.attack = false;
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
