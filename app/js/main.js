'use strict';
// ============================================================================
// main.js — 루프, 화면 맞춤, 입력, 사운드, 저장, 씬 관리, UI 버튼
// ============================================================================
// LW, LH, P, mkc, rect, text 는 gfx.js 전역
const cv = document.getElementById('c'); const SC = 4; cv.width = LW * SC; cv.height = LH * SC;
const X = cv.getContext('2d'); X.imageSmoothingEnabled = false;
const [low, L] = mkc(LW, LH);
const Q = new URLSearchParams(location.search);
const App = { t: 0, scene: null, next: null, fade: 0, fadeDir: 0, shake: 0, flash: 0, toast: null, fast: false, test: Q.has('test') };
window.App = App;

// ---------- 저장 ----------
const SAVE_KEY = 'kbo_owner_save_v1', META_KEY = 'kbo_owner_meta_v1';
const Store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};
const Meta = Object.assign({ titles: [], runs: 0, best: null, tutorial: {}, tut: {}, sound: 1 }, Store.get(META_KEY) || {});
function saveMeta() { Store.set(META_KEY, Meta); }
function saveGame() { if (App.S) Store.set(SAVE_KEY, App.S); }
function loadGame() { const S = Store.get(SAVE_KEY); return S && S.v === 1 ? S : null; }
window.Meta = Meta;

// ---------- 화면 맞춤 (안전 영역 안에 비율 유지) ----------
function fit() {
  const r = document.getElementById('wrap').getBoundingClientRect();
  const s = Math.min(r.width / LW, r.height / LH);
  cv.style.width = Math.floor(LW * s) + 'px'; cv.style.height = Math.floor(LH * s) + 'px';
}
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();

// ---------- 입력 ----------
const Input = { ptrs: new Map(), hits: [], downHit: null, last: null };
const toLow = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * LW, y: (e.clientY - r.top) / r.height * LH, id: e.pointerId, cx: e.clientX, cy: e.clientY, sc: LW / r.width }; };
function hitTest(p) { for (let i = Input.hits.length - 1; i >= 0; i--) { const h = Input.hits[i]; if (p.x >= h.x - 2 && p.x <= h.x + h.w + 2 && p.y >= h.y - 2 && p.y <= h.y + h.h + 2) return h; } return null; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); Sound.unlock(); const p = toLow(e); Input.ptrs.set(e.pointerId, p); try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  const h = hitTest(p); if (h && !h.disabled) { Input.downHit = { id: h.id, pid: e.pointerId, t: App.t }; if (h.instant) { Sound.play('click'); h.fn(); Input.downHit = null; } return; }
  if (Coach.on) return;
  App.scene && App.scene.down && App.scene.down(p);
}, { passive: false });
cv.addEventListener('pointermove', e => { const p = toLow(e); if (Input.ptrs.has(e.pointerId)) Input.ptrs.set(e.pointerId, p); App.scene && App.scene.move && App.scene.move(p); });
const upH = e => {
  const p = toLow(e); Input.ptrs.delete(e.pointerId);
  if (Input.downHit && Input.downHit.pid === e.pointerId) { const h = hitTest(p); const d = Input.downHit; Input.downHit = null; if (h && h.id === d.id && !h.disabled) { Sound.play('click'); h.fn(); } return; }
  App.scene && App.scene.up && App.scene.up(p);
};
cv.addEventListener('pointerup', upH); cv.addEventListener('pointercancel', upH);
['touchend', 'click'].forEach(ev => document.addEventListener(ev, () => Sound.unlock(), { passive: true }));
addEventListener('keydown', e => { if (App.scene && App.scene.key) App.scene.key(e.code, e); });
// 즉시모드 버튼: 그리기 + 히트영역 등록
function btn(c, id, x, y, w, h, label, fn, o = {}) {
  const pressed = Input.downHit && Input.downHit.id === id;
  GFX.button(c, x, y, w, h, label, { ...o, down: pressed || o.down });
  Input.hits.push({ id, x, y, w, h, fn, disabled: o.disabled, instant: o.instant });
}
function hit(id, x, y, w, h, fn, o = {}) { Input.hits.push({ id, x, y, w, h, fn, instant: o.instant }); return Input.downHit && Input.downHit.id === id; }
window.btn = btn; window.hit = hit;

// ---------- 사운드 (Web Audio 합성. 파일 없음) ----------
const Sound = {
  a: null, m: null,
  unlock() { if (this.a) { if (this.a.state === 'suspended') this.a.resume(); return; } try { this.a = new (window.AudioContext || window.webkitAudioContext)(); this.m = this.a.createGain(); this.m.gain.value = 0.7; this.m.connect(this.a.destination); const b = this.a.createBuffer(1, 1, 22050); const s = this.a.createBufferSource(); s.buffer = b; s.connect(this.m); s.start(0); } catch (e) { } },
  noise(sec, env) { const a = this.a, n = a.createBuffer(1, Math.max(1, a.sampleRate * sec | 0), a.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length, i); const s = a.createBufferSource(); s.buffer = n; return s; },
  tone(t, type, f0, f1, dur, vol, dest) { const a = this.a, o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(dest || this.m); o.start(t); o.stop(t + dur + 0.02); },
  filt(type, f, q) { const b = this.a.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; return b; },
  play(kind, q = 0) {
    if (!this.a || !Meta.sound || App.test) return; const a = this.a, t = a.currentTime, M = this.m;
    try {
      if (kind === 'ttak') { // 나무 딱!
        const V = 0.6 + 0.6 * q; const s = this.noise(0.03, u => Math.pow(1 - u, 6)); const g = a.createGain(); g.gain.value = 2.0 * V; s.connect(this.filt('bandpass', 2400, 1.2)).connect(g).connect(M); s.start(t);
        [[620, 0.5, 0.09], [1180, 0.3, 0.06], [1750, 0.18, 0.04]].forEach(([f, v, d]) => this.tone(t, 'triangle', f, f * 0.92, d * (1 + q), v * V)); this.tone(t, 'sine', 180, 110, 0.08, 0.4 * V);
      } else if (kind === 'kkang') { // 퍼펙트/홈런 깡~
        const V = 0.9, T = 0.9; const s = this.noise(0.012, u => Math.pow(1 - u, 3)); const g = a.createGain(); g.gain.value = 1.6; s.connect(this.filt('highpass', 3000)).connect(g).connect(M); s.start(t);
        this.tone(t, 'square', 4200, 2600, 0.018, 0.16);
        [[1560, 0.28, 1], [2310, 0.2, 0.8], [2870, 0.16, 0.65], [3480, 0.12, 0.5]].forEach(([f, v, d]) => { const o = a.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); const og = a.createGain(); og.gain.setValueAtTime(v * V, t); og.gain.exponentialRampToValueAtTime(0.0008, t + T * d); o.connect(og).connect(M); o.start(t); o.stop(t + T * d + 0.03); });
      } else if (kind === 'tuk') { const s = this.noise(0.05, u => Math.pow(1 - u, 4)); const g = a.createGain(); g.gain.value = 0.9; s.connect(this.filt('lowpass', 700)).connect(g).connect(M); s.start(t); this.tone(t, 'sine', 190, 90, 0.07, 0.5); }
      else if (kind === 'swing') { const s = this.noise(0.14, u => Math.sin(u * Math.PI) * 0.35); const f = this.filt('bandpass', 900, 1.5); f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.14); s.connect(f).connect(M); s.start(t); }
      else if (kind === 'mitt') this.tone(t, 'triangle', 220, 70, 0.1, 0.5);
      else if (kind === 'crowd' || kind === 'roar') { const Ln = kind === 'roar' ? 3.5 : 2, v = kind === 'roar' ? 0.7 : 0.4; const s = this.noise(Ln, (u, i) => Math.min(1, i / 6000) * Math.pow(1 - u, 1.3) * v * (1 + 0.25 * Math.sin(u * 40))); s.connect(this.filt('lowpass', kind === 'roar' ? 1900 : 1300)).connect(M); s.start(t); }
      else if (kind === 'boo') { const s = this.noise(1.6, u => Math.sin(u * Math.PI) * 0.35); s.connect(this.filt('lowpass', 420, 2)).connect(M); s.start(t); this.tone(t, 'sawtooth', 150, 110, 1.4, 0.05); }
      else if (kind === 'click') this.tone(t, 'square', 880, 660, 0.04, 0.08);
      else if (kind === 'card') { const s = this.noise(0.08, u => (1 - u) * 0.3); s.connect(this.filt('highpass', 2000)).connect(M); s.start(t); }
      else if (kind === 'coin') { this.tone(t, 'square', 988, 988, 0.06, 0.1); this.tone(t + 0.06, 'square', 1319, 1319, 0.12, 0.1); }
      else if (kind === 'up') { [523, 659, 784].forEach((f, i) => this.tone(t + i * 0.07, 'square', f, f, 0.08, 0.08)); }
      else if (kind === 'down') { [392, 330, 262].forEach((f, i) => this.tone(t + i * 0.08, 'triangle', f, f, 0.1, 0.12)); }
      else if (kind === 'fanfare') { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(t + i * 0.11, 'square', f, f, i === 5 ? 0.5 : 0.1, 0.09)); }
      else if (kind === 'alarm') { [880, 660, 880, 660].forEach((f, i) => this.tone(t + i * 0.12, 'square', f, f, 0.1, 0.07)); }
      else if (kind === 'whoosh') { const s = this.noise(0.25, u => Math.sin(u * Math.PI) * 0.3); const f = this.filt('bandpass', 600, 1); f.frequency.exponentialRampToValueAtTime(3000, t + 0.25); s.connect(f).connect(M); s.start(t); }
      else if (kind === 'slide') { const s = this.noise(0.35, u => (1 - u) * 0.4); s.connect(this.filt('lowpass', 900)).connect(M); s.start(t); }
      else if (kind === 'tick') this.tone(t, 'square', 1500, 1500, 0.02, 0.05);
      else if (kind === 'clap') { for (let i = 0; i < 2; i++) { const s = this.noise(0.05, u => Math.pow(1 - u, 5)); s.connect(this.filt('bandpass', 1500, 0.8)).connect(M); s.start(t + i * 0.18); } }
    } catch (e) { }
  },
};
window.Sound = Sound;

// ---------- 씬 ----------
function go(scene, fade = true) { if (fade) { App.next = scene; App.fadeDir = 1; } else { App.scene = scene; scene.enter && scene.enter(); } }
function toast(txt, col) { App.toast = { txt, col: col || P.w4, t: 0 }; }
window.go = go; window.toast = toast;
function shake(n) { App.shake = Math.max(App.shake, n); }
window.shake = shake;

// ---------- 코치 튜토리얼: 처음 한 번만, 코치가 말풍선으로 알려줌 ----------
const Coach = {
  q: null,
  once(key, pages, then) {
    Meta.tut = Meta.tut || {};
    if (Meta.tut[key]) { if (then) then(); return false; }
    Meta.tut[key] = 1; saveMeta(); this.q = { pages, i: 0, t: 0, then }; return true;
  },
  get on() { return !!this.q; },
  step(dt) { if (this.q) this.q.t += dt; },
  next() { const q = this.q; if (!q) return; const full = q.pages[q.i]; if (q.t * 40 < full.length) { q.t = 99; return; } q.i++; q.t = 0; if (q.i >= q.pages.length) { this.q = null; if (q.then) q.then(); } },
  draw(c) {
    const q = this.q; if (!q) return;
    c.save(); c.globalAlpha = 0.55; rect(c, 0, 0, LW, LH, P.n0); c.restore();
    c.drawImage(GFX.bustSprite('coach', q.i === q.pages.length - 1 ? 1 : 0, 0), 4, 88);
    GFX.panel(c, 54, 92, 262, 52, { bg: P.c3, br: P.c1, dk: P.c0 });
    GFX.panel(c, 60, 84, 34, 13, { bg: P.n2, br: P.n4 }); text(c, '코치', 77, 86, { f: 's', a: 'c' });
    const full = q.pages[q.i]; const shown = full.slice(0, Math.floor(q.t * 40));
    GFX.textBox(c, shown, 62, 99, 246, { col: P.n1, lh: 13 });
    text(c, `${q.i + 1}/${q.pages.length}`, 310, 134, { f: 's', col: P.c1, a: 'r' });
    if (shown.length >= full.length && (App.t * 2 | 0) % 2) text(c, '▼', 276, 134, { f: 's', col: P.r2 });
    Input.hits.push({ id: 'coach', x: 0, y: 0, w: LW, h: LH, fn: () => Coach.next() });
  },
};
window.Coach = Coach;

// ---------- 루프 ----------
let last = performance.now(), acc = 0; const DT = 1 / 60;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= DT) { step(DT); acc -= DT; }
  render(); requestAnimationFrame(frame);
}
function step(dt) {
  App.t += dt;
  if (App.fadeDir) { App.fade += dt * 5 * App.fadeDir; if (App.fade >= 1 && App.fadeDir > 0) { App.fade = 1; App.fadeDir = -1; App.scene = App.next; App.next = null; App.scene.enter && App.scene.enter(); } if (App.fade <= 0 && App.fadeDir < 0) { App.fade = 0; App.fadeDir = 0; } }
  Coach.step(dt);
  if (App.scene && App.scene.update && !(Coach.on && !App.fadeDir)) App.scene.update(dt);
  App.shake = Math.max(0, App.shake - dt * 25); App.flash = Math.max(0, App.flash - dt * 4);
  if (App.toast) { App.toast.t += dt; if (App.toast.t > 2.2) App.toast = null; }
}
function render() {
  Input.hits = [];
  rect(L, 0, 0, LW, LH, P.n0);
  if (App.scene && App.scene.draw) App.scene.draw(L);
  if (!App.fadeDir || App.fade < 0.5) Coach.draw(L);
  if (App.toast) { const T = App.toast, a = Math.min(1, T.t * 6, (2.2 - T.t) * 4); L.save(); L.globalAlpha = a; const w = GFX.tw(T.txt, 'b') + 16; GFX.panel(L, LW / 2 - w / 2, 4, w, 18, { bg: P.n1 }); text(L, T.txt, LW / 2, 8, { f: 'b', col: T.col, a: 'c' }); L.restore(); }
  if (App.flash > 0) { L.save(); L.globalAlpha = Math.min(0.85, App.flash); rect(L, 0, 0, LW, LH, P.c4); L.restore(); }
  if (App.fade > 0) { L.save(); L.globalAlpha = App.fade; rect(L, 0, 0, LW, LH, P.n0); L.restore(); }
  const sh = App.shake, ox = sh ? Math.round((Math.random() - 0.5) * sh) * SC : 0, oy = sh ? Math.round((Math.random() - 0.5) * sh) * SC : 0;
  X.fillStyle = P.n0; X.fillRect(0, 0, cv.width, cv.height); X.drawImage(low, ox, oy, LW * SC, LH * SC);
}
// 테스트용: 프레임 수동 진행
window.advance = (n, dt = DT, nr) => { for (let i = 0; i < n; i++) step(dt); if (!nr) render(); };
window.Input = Input; window.hits = () => Input.hits.map(h => h.id + (h.disabled ? '!' : '')); window.tapId = id => { const h = Input.hits.find(h => h.id === id); if (h && !h.disabled) { h.fn(); return true; } return false; }; window.saveGame = saveGame; window.loadGame = loadGame; window.saveMeta = saveMeta; window.Store = Store; window.SAVE_KEY = SAVE_KEY;

Promise.all(['12px GB', '12px G', '10px G9'].map(f => document.fonts.load(f))).catch(() => { }).then(() => {
  window.ready = 1; go(Scenes.title(), false);
  if (!Q.has('manual')) requestAnimationFrame(frame); else render();
});
