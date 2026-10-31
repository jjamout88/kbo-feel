'use strict';
// ============================================================================
// gfx.js — 저해상도(320x148) 도트 렌더러, 팔레트, 글자, 캐릭터·배경 절차적 생성
// 규칙: 외곽선은 검정 금지, 같은 계열 진한 색. 상승=빨강 / 하락=파랑.
// 캐릭터는 파워프로식: 머리·몸통·손·발만 (팔다리 없음)
// ============================================================================
const LW = 320, LH = 148;
const P = {
  // 남색 계열 (검정 대신 가장 어두운 색)
  n0: '#0a0e24', n1: '#141b3d', n2: '#1f2a5c', n3: '#2e3f86', n4: '#4a62b8', n5: '#7d95e0', n6: '#b4c4f4',
  // 노을
  s1: '#2a1f5c', s2: '#4a2a72', s3: '#7a3478', s4: '#b8466e', s5: '#e8705a', s6: '#ffaa6a',
  // 기아 빨강
  r0: '#4a0a18', r1: '#8a1226', r2: '#c8203a', r3: '#f0404a', r4: '#ff8080', r5: '#ffc0b8',
  // 흰색/회색 (푸른 기)
  w0: '#5a6488', w1: '#8a94b8', w2: '#c0c8e2', w3: '#e6ebf8', w4: '#ffffff',
  // 크림(종이)
  c0: '#5e4a30', c1: '#9a8258', c2: '#d4c094', c3: '#f2e6c4', c4: '#fff8e6',
  // 잔디
  g0: '#0e2a18', g1: '#174a26', g2: '#21652f', g3: '#2f803a', g4: '#4a9e48', g5: '#7cc060',
  // 흙
  d0: '#4a2818', d1: '#74402a', d2: '#9a5a38', d3: '#c07a4c', d4: '#e0a070',
  // 앰버(전광판)
  y0: '#6a3a06', y1: '#b06a10', y2: '#f0a020', y3: '#ffd040', y4: '#fff2a0',
  // 상승/하락
  up: '#ff4a5a', dn: '#4aa8ff', ok: '#5ad06a',
  wood: ['#5a3418', '#8a5428', '#c08040', '#e8b070', '#ffe0a8'],
};
// 부위 팔레트 [외곽, 어둠, 기본, 밝음, 하이라이트]
const PAL = {
  red: [P.r0, P.r1, P.r2, P.r3, P.r5],
  white: [P.w0, P.w1, P.w2, P.w3, P.w4],
  navy: [P.n0, P.n1, P.n2, P.n3, P.n4],
  gray: ['#3a3e52', '#62677e', '#9a9fb4', '#c8ccdc', '#f0f2f8'],
  wood: P.wood,
  brown: ['#3a2010', '#6a3a1c', '#9a5a2c', '#c4844a', '#e8b07a'],
  gold: [P.y0, P.y1, P.y2, P.y3, P.y4],
  skin: [
    ['#8a4a2a', '#c87a4a', '#f0b080', '#ffd0a4', '#ffe8cc'],
    ['#6a3418', '#a45c30', '#d08a58', '#eaaa78', '#ffd0a4'],
    ['#3e1e0c', '#6e3c1c', '#9a5a32', '#c07a48', '#e0a070'],
  ],
};
function teamPal(hex, dark) { const m = hex2rgb(hex), d = hex2rgb(dark); return [rgb2hex(mix(d, [0, 0, 20], 0.35)), rgb2hex(d), rgb2hex(m), rgb2hex(mix(m, [255, 255, 255], 0.3)), rgb2hex(mix(m, [255, 255, 255], 0.65))]; }
function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgb2hex(c) { return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }

const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const px = (c, x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };

// ---- 음영 타원: 왼쪽 위 광원, 외곽선은 같은 계열 진한 색 ----
function ell(c, cx, cy, rx, ry, pal, o = {}) {
  const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
  const inside = (x, y) => { const a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry; return a * a + b * b <= 1; };
  const lx = o.lx != null ? o.lx : -0.55, ly = o.ly != null ? o.ly : -0.8;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inside(x, y)) continue;
    if (o.clip && !o.clip(x, y)) continue;
    let col;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    if (edge && !o.noOutline) col = pal[0];
    else if (o.flat) col = pal[2];
    else {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; const d = nx * lx + ny * ly;
      const dh = Math.hypot(nx - lx * 0.45, ny - ly * 0.45);
      col = (o.hi !== false && dh < 0.22) ? pal[4] : d > 0.35 ? pal[3] : d > -0.35 ? pal[2] : pal[1];
    }
    if (o.dither && ((x + y) & 1) && col === pal[1]) col = pal[2];
    c.fillStyle = col; c.fillRect(x, y, 1, 1);
  }
}
function disc(c, cx, cy, r, col) { c.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.5)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
function line(c, x0, y0, x1, y1, col, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; c.fillStyle = col;
  const o = Math.floor((w - 1) / 2);
  for (; ;) { c.fillRect(x0 - o, y0 - o, w, w); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
// 방망이: 손잡이→배럴, 끝으로 갈수록 굵어짐
function bat(c, hx, hy, ang, len, pal = PAL.wood) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const steps = Math.ceil(len * 2);
  const pts = [];
  for (let i = -4; i <= steps; i++) { const t = i / 2; const w = t < len * 0.45 ? 1 : t < len * 0.7 ? 1.5 : 2; pts.push([hx + ca * t, hy + sa * t, w]); }
  for (const [x, y, w] of pts) disc(c, x, y, Math.ceil(w), pal[0]);
  for (const [x, y, w] of pts) disc(c, x, y, Math.ceil(w) - 1 < 0 ? 0 : Math.max(0, Math.ceil(w) - 1), pal[2]);
  for (const [x, y, w] of pts) if (w > 1) px(c, x - sa * 0.6 - 0.3, y + ca * 0.6 * -1 - 0.3, pal[3]);
  // 노브
  disc(c, hx - ca * 2.5, hy - sa * 2.5, 1, pal[0]);
}

// ---- 픽셀 글자 (Galmuri, 알파 이진화 + 같은 계열 외곽선) ----
const TXC = new Map();
const FONT = { b: '12px GB', r: '12px G', s: '10px G9' };
function tex(str, f, col, out, shadow) {
  const key = str + '|' + f + col + out + shadow; let t = TXC.get(key); if (t) return t;
  const font = FONT[f] || f; const sz = parseInt(font);
  const [m, mc] = mkc(4, 4); mc.font = font; const w = Math.ceil(mc.measureText(str).width) + 2, h = sz + 4;
  m.width = w; m.height = h; mc.font = font; mc.textBaseline = 'alphabetic'; mc.fillStyle = '#fff'; mc.fillText(str, 1, sz);
  const d = mc.getImageData(0, 0, w, h); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 100 ? 255 : 0; mc.putImageData(d, 0, 0);
  const tint = cl => { const [o, oc] = mkc(w, h); oc.drawImage(m, 0, 0); oc.globalCompositeOperation = 'source-in'; oc.fillStyle = cl; oc.fillRect(0, 0, w, h); return o; };
  const [r, rc] = mkc(w + 2, h + 3);
  if (shadow) rc.drawImage(tint(shadow), 1, 3);
  if (out) { const o = tint(out); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) rc.drawImage(o, 1 + dx, 1 + dy); }
  rc.drawImage(tint(col), 1, 1);
  t = { c: r, w: w + 2, h: h + 3, tw: w - 2 }; TXC.set(key, t); if (TXC.size > 1500) TXC.delete(TXC.keys().next().value); return t;
}
// align: l/c/r, y = 글자 윗선
function text(c, str, x, y, o = {}) {
  str = String(str); const f = o.f || 'r', col = o.col || P.w4; const t = tex(str, f, col, o.out || null, o.sh || null); const sc = o.sc || 1;
  const w = t.tw * sc; let X = o.a === 'c' ? x - w / 2 : o.a === 'r' ? x - w : x;
  const yoff = f === 's' ? 2 : 1;
  c.drawImage(t.c, 0, 0, t.w, t.h, Math.round(X) - 2 * sc, Math.round(y) - (yoff + 1) * sc, t.w * sc, t.h * sc);
  return w;
}
function tw(str, f = 'r') { return tex(String(str), f, '#fff').tw; }
// 줄바꿈 (폭 기준)
function wrap(str, maxw, f = 'r') {   // 단어 단위 줄바꿈, 너무 긴 단어만 글자 단위
  const out = [];
  for (const para of String(str).split('\n')) {
    let cur = '';
    for (const word of para.split(' ')) {
      const cand = cur ? cur + ' ' + word : word;
      if (tw(cand, f) <= maxw) { cur = cand; continue; }
      if (cur) out.push(cur);
      if (tw(word, f) <= maxw) { cur = word; continue; }
      cur = ''; for (const ch of word) { if (tw(cur + ch, f) > maxw && cur) { out.push(cur); cur = ch; } else cur += ch; }
    }
    out.push(cur);
  }
  return out;
}
function textBox(c, str, x, y, w, o = {}) { const lines = wrap(str, w, o.f); const lh = o.lh || (o.f === 's' ? 11 : 14); lines.forEach((l, i) => text(c, l, o.a === 'c' ? x + w / 2 : x, y + i * lh, o)); return lines.length * lh; }

// ============================================================================
// 캐릭터 — 부위 좌표로 그림
// ============================================================================
const SPR = new Map();
function cached(key, w, h, draw) { let s = SPR.get(key); if (s) return s; const [c, x] = mkc(w, h); draw(x); SPR.set(key, c); return c; }

// ---- 타자 (포수 시점 뒷모습). 64x60, 발 중심 (24,56) ----
const BK = 1.35, BW = 88, BH = 82, BAX = Math.round(24 * BK), BAY = Math.round(53 * BK);   // 타자 스프라이트 배율/크기/발 기준점
const BAT_FR = {
  idle0: { hands: [[34, 26], [36, 28]], ang: -1.3, len: 22, body: [24, 37], head: [23, 15], feet: [[15, 52], [33, 52]], tilt: 0 },
  idle1: { hands: [[34, 27], [36, 29]], ang: -1.26, len: 22, body: [24, 38], head: [23, 16], feet: [[15, 52], [33, 52]], tilt: 0 },
  load: { hands: [[37, 24], [39, 26]], ang: -1.05, len: 22, body: [23, 37], head: [22, 15], feet: [[14, 52], [35, 48]], tilt: -1 },
  sw1: { hands: [[36, 31], [38, 32]], ang: -0.55, len: 23, body: [25, 38], head: [24, 16], feet: [[15, 52], [37, 52]], tilt: 1 },
  sw2: { hands: [[38, 33], [40, 34]], ang: -0.04, len: 24, body: [26, 38], head: [25, 16], feet: [[15, 52], [37, 52]], tilt: 2 },
  sw3: { hands: [[31, 32], [29, 33]], ang: -2.75, len: 23, body: [26, 38], head: [26, 16], feet: [[16, 52], [37, 52]], tilt: 3, front: 1 },
  sw4: { hands: [[17, 23], [20, 24]], ang: -0.55, len: 22, body: [25, 38], head: [25, 16], feet: [[17, 51], [37, 52]], tilt: 3, behind: 1 },
  bunt: { hands: [[31, 31], [41, 29]], ang: -0.12, len: 18, body: [25, 38], head: [24, 17], feet: [[17, 52], [34, 52]], tilt: 2 },
  joy: { hands: [[9, 11], [39, 11]], ang: null, body: [24, 34], head: [24, 13], feet: [[16, 48], [33, 48]], tilt: 0 },
  sad: { hands: [[19, 40], [30, 40]], ang: 1.9, len: 20, body: [24, 39], head: [24, 20], feet: [[17, 53], [31, 53]], tilt: 0 },
};
function drawBatter(c, fr, look) {
  const F = BAT_FR[fr], k = BK; const skin = PAL.skin[look.skin || 0]; const helm = look.helm || PAL.red; const jer = PAL.white; const glove = look.glove || PAL.navy;
  const bx = F.body[0] * k, by = F.body[1] * k, hx = F.head[0] * k, hy = F.head[1] * k;
  const drawBat = () => { if (F.ang != null) { const h = F.hands[0]; bat(c, h[0] * k, h[1] * k, F.ang, F.len * k); } };
  if (F.ang != null && !F.front) drawBat();
  F.feet.forEach(([x, y]) => ell(c, x * k, y * k, 5.5 * k, 3 * k, PAL.navy, { hi: false }));
  const R = 11 * k;
  ell(c, bx, by, R, R, jer);
  ell(c, bx, by, R, R, PAL.gray, { clip: (x, y) => y > by + 5, noOutline: true });
  for (let x = Math.floor(bx - R); x <= bx + R; x++) { const a = (x + 0.5 - bx) / R; if (a * a < 0.9) { px(c, x, by + 5, P.n2); px(c, x, by + 6, P.n1); px(c, x, by + 4, P.n3); } }
  if (!F.front) drawNum(c, bx - 2 + F.tilt * 0.6, by - 9, look.num || 1, P.r2, P.r0, 2);
  ell(c, hx + 6 * k, hy + 4.5 * k, 2.6 * k, 3 * k, skin, { hi: false });
  ell(c, hx, hy, 11.5 * k, 10.5 * k, helm);
  for (let i = 0; i < 9; i++) { const yy = hy + 6.5 * k + (i > 6 ? 1 : 0); px(c, hx + 7.5 * k + i, yy, helm[1]); px(c, hx + 7.5 * k + i, yy + 1, helm[0]); }
  if (!F.behind) { rect(c, hx - 6, hy - 9, 4, 2, helm[4]); }
  if (F.ang != null && F.front) drawBat();
  F.hands.forEach(([x, y], i) => ell(c, x * k, y * k, 3.3 * k, 3.3 * k, i ? glove : (look.glove2 || glove)));
}
// 3x5 숫자 (s배)
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
function drawNum(c, x, y, n, col, out, s = 1) {
  const str = String(n); const w = (str.length * 4 - 1) * s; x = Math.round(x - w / 2 + s); y = Math.round(y);
  const dot = (X, Y, cl) => rect(c, X, Y, s, s, cl);
  for (const pass of [0, 1]) for (let k = 0; k < str.length; k++) { const g = DIG[+str[k]]; for (let i = 0; i < 15; i++) if (g[i] === '1') { const X = x + (k * 4 + (i % 3)) * s, Y = y + ((i / 3) | 0) * s; if (pass === 0) dot(X + 1, Y + 1, out); else dot(X, Y, col); } }
}
function batterSprite(fr, look) { const key = 'bat|' + fr + '|' + (look.skin || 0) + '|' + (look.num || 1) + '|' + (look.helmKey || 'r'); return cached(key, BW, BH, c => drawBatter(c, fr, look)); }

// ---- 투수 (정면, 작게). 24x26, 발 중심 (12,24) ----
const PIT_FR = {
  set: { head: [12, 7], body: [12, 16], g: [[10, 15], [14, 15]], feet: [[9, 24], [15, 24]] },
  lift: { head: [12, 6], body: [12, 15], g: [[10, 13], [14, 13]], feet: [[12, 24], [17, 18]] },
  stride: { head: [11, 8], body: [11, 16], g: [[5, 13], [19, 9]], feet: [[6, 24], [18, 23]] },
  rel: { head: [12, 10], body: [12, 17], g: [[6, 17], [16, 14]], feet: [[7, 24], [17, 24]], ball: 1 },
  fol: { head: [13, 11], body: [12, 18], g: [[7, 19], [17, 21]], feet: [[8, 24], [16, 21]] },
  idle: { head: [12, 7], body: [12, 16], g: [[6, 17], [18, 17]], feet: [[9, 24], [15, 24]] },
};
function drawPitcher(c, fr, tp, skin = 0) {
  const F = PIT_FR[fr]; const sk = PAL.skin[skin];
  F.feet.forEach(([x, y]) => ell(c, x, y, 2.5, 1.5, PAL.navy, { hi: false }));
  ell(c, F.body[0], F.body[1], 4.5, 5.5, PAL.gray);
  ell(c, F.head[0], F.head[1], 5, 4.6, sk);
  ell(c, F.head[0], F.head[1] - 2, 5.2, 3, tp, { clip: (x, y) => y < F.head[1] - 1 });
  rect(c, F.head[0] - 2, F.head[1] + 1, 1, 2, P.n1); rect(c, F.head[0] + 1, F.head[1] + 1, 1, 2, P.n1);
  ell(c, F.g[0][0], F.g[0][1], 2.4, 2.4, PAL.brown, { hi: false });
  ell(c, F.g[1][0], F.g[1][1], 1.8, 1.8, sk, { hi: false });
}
function pitcherSprite(fr, team) { const T = K.TEAMS[team]; return cached('pit|' + fr + team, 24, 26, c => drawPitcher(c, fr, teamPal(T.c, T.d))); }

// ---- 탑뷰 선수 (수비/주루 미니게임). 16x16 중심 (8,8), dir 라디안 ----
function drawTop(c, x, y, dir, frame, tp, skin = 0, o = {}) {
  const k = o.k || 1.7; const ca = Math.cos(dir), sa = Math.sin(dir); const pxp = -sa, pyp = ca;
  c.save(); c.globalAlpha = 0.35; ell(c, x, y + 3 * k, 4.5 * k, 2 * k, [P.g0, P.g0, P.g0, P.g0, P.g0], { flat: true, noOutline: true }); c.restore();
  if (o.dive) {
    ell(c, x - ca * 2 * k, y - sa * 2 * k, 4 * k, 4 * k, tp.body || PAL.white);
    ell(c, x + ca * 3 * k, y + sa * 3 * k, 3.5 * k, 3.5 * k, tp.cap);
    ell(c, x + (ca * 7 + pxp * 2) * k, y + (sa * 7 + pyp * 2) * k, 1.8 * k, 1.8 * k, PAL.brown, { hi: false });
    ell(c, x - ca * 7 * k, y - sa * 7 * k, 1.6 * k, 1.4 * k, PAL.navy, { hi: false });
    return;
  }
  const step = frame === 1 ? 1.6 : frame === 2 ? -1.6 : 0;
  ell(c, x + (-ca * 2 + pxp * 2 + ca * step) * k, y + (-sa * 2 + pyp * 2 + sa * step) * k, 1.6 * k, 1.4 * k, PAL.navy, { hi: false });
  ell(c, x + (-ca * 2 - pxp * 2 - ca * step) * k, y + (-sa * 2 - pyp * 2 - sa * step) * k, 1.6 * k, 1.4 * k, PAL.navy, { hi: false });
  ell(c, x, y + 0.5 * k, 4 * k, 3.5 * k, tp.body || PAL.white);
  const thr = o.throw ? 3 : 0;
  ell(c, x + (pxp * 4.5 + ca * (1 - step * 0.5)) * k, y + (pyp * 4.5 + sa * (1 - step * 0.5)) * k, 1.8 * k, 1.8 * k, PAL.brown, { hi: false });
  ell(c, x + (-pxp * 4.5 + ca * (1 + step * 0.5 + thr)) * k, y + (-pyp * 4.5 + sa * (1 + step * 0.5 + thr)) * k, 1.4 * k, 1.4 * k, PAL.skin[skin], { hi: false });
  ell(c, x, y - 2 * k, 3.2 * k, 3 * k, tp.cap);
  for (let i = -1; i <= 1; i++) for (let j = 0; j < 2; j++) px(c, x + ca * (3.5 * k + j) + pxp * i * 1.5, y - 2 * k + sa * (3.5 * k + j) + pyp * i * 1.5, tp.cap[j ? 0 : 1]);
}
const TOP_KIA = { cap: PAL.red, body: PAL.white };
const topTeam = t => { const T = K.TEAMS[t]; return { cap: teamPal(T.c, T.d), body: PAL.gray }; };

// ---- 정면 흉상 (대화 컷용). 48x44 ----
function drawBust(c, who, mood = 0, skin = 0) {
  const sk = PAL.skin[skin];
  const body = who === 'coach' ? PAL.navy : who === 'fan' ? PAL.red : who === 'press' ? PAL.gray : PAL.white;
  ell(c, 24, 44, 17, 12, body);
  if (who === 'me') drawNum(c, 23, 37, 0, P.r2, P.r0) && 0;
  ell(c, 24, 21, 15, 14, sk);
  // 모자/헬멧
  const cap = who === 'coach' ? PAL.navy : who === 'press' ? PAL.gray : PAL.red;
  if (who !== 'press') {
    ell(c, 24, 14, 15.5, 9, cap, { clip: (x, y) => y < 17 });
    for (let x = 10; x <= 38; x++) { px(c, x, 16, cap[1]); px(c, x, 17, cap[0]); }
    rect(c, 22, 8, 5, 4, who === 'coach' ? P.r2 : P.w4);
  } else { ell(c, 24, 11, 14, 6, PAL.brown, { clip: (x, y) => y < 13 }); }
  // 눈 (파워프로식: 세로 타원, 코 없음)
  const ey = 22;
  if (mood === 1) { // 웃음 ^^
    for (const ex of [17, 31]) { px(c, ex - 2, ey + 1, P.n1); px(c, ex - 1, ey, P.n1); px(c, ex, ey - 1, P.n1); px(c, ex + 1, ey, P.n1); px(c, ex + 2, ey + 1, P.n1); }
  } else {
    for (const ex of [17, 31]) { rect(c, ex - 1, ey - 2, 3, 5, P.n1); px(c, ex - 1, ey - 2, P.w4); }
  }
  if (mood === 2) { ell(c, 38, 15, 1.6, 2.6, [P.n4, P.n5, P.n6, P.w4, P.w4], { hi: false }); rect(c, 14, 18, 5, 1, P.n1); rect(c, 29, 18, 5, 1, P.n1); }
  // 입
  if (mood === 1) { rect(c, 21, 28, 6, 1, sk[0]); rect(c, 22, 29, 4, 1, P.r1); }
  else if (mood === 2) { rect(c, 22, 29, 4, 1, sk[0]); px(c, 21, 30, sk[0]); px(c, 26, 30, sk[0]); }
  else rect(c, 22, 28, 4, 1, sk[0]);
  // 볼터치
  rect(c, 12, 26, 3, 1, sk[3] === sk[3] ? '#ff9a8a' : 0); rect(c, 33, 26, 3, 1, '#ff9a8a');
  if (who === 'coach') { rect(c, 18, 26, 12, 2, P.w2); rect(c, 17, 27, 2, 1, P.w1); rect(c, 29, 27, 2, 1, P.w1); }  // 흰 콧수염
}
function bustSprite(who, mood, skin) { return cached('bust|' + who + mood + skin, 48, 56, c => drawBust(c, who, mood, skin)); }

// ============================================================================
// 배경
// ============================================================================
let BGC = new Map();
function seeded(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
// 관중석: density 0~1, 응원 t
function crowd(c, x0, y0, w, h, density, t, hype = 0, seed = 3, home = P.r2) {
  const r = seeded(seed); const cols = [home, home, P.r3, P.w3, P.w2, P.n4, P.y3, home, P.r1];
  for (let y = y0; y < y0 + h; y += 3) for (let x = x0 + ((y / 3) & 1); x < x0 + w; x += 3) {
    const v = r(), cv = cols[(r() * cols.length) | 0], bob = hype > 0 && r() < hype ? ((Math.sin(t * 12 + x * 0.7) > 0) ? -1 : 0) : 0;
    if (v < density) { rect(c, x, y + bob, 2, 2, cv); px(c, x, y + bob, '#ffffff22'); }
    else if (((x + y) & 3) === 0) px(c, x, y + 1, P.n2);
  }
}
// 야구장 (포수 시점). 크롬/관중 제외 정적 레이어 캐시
function stadiumBase(theme) {
  const key = 'stad|' + theme.id; let s = BGC.get(key); if (s) return s;
  const [cv, c] = mkc(LW, LH); const r = seeded(11);
  // 하늘: 남색 → 노을
  const sky = theme.sky;
  for (let y = 0; y < 44; y++) { const t = y / 44; const i = Math.min(sky.length - 1, Math.floor(t * sky.length)); rect(c, 0, y, LW, 1, sky[i]); if (i + 1 < sky.length && ((y * 7 + 3) % sky.length === 0)) for (let x = (y & 1); x < LW; x += 2) px(c, x, y, sky[i + 1]); }
  // 디더 경계
  for (let y = 0; y < 44; y++) { const t = y / 44 * sky.length; const i = Math.floor(t), f = t - i; if (i + 1 < sky.length && f > 0.6) for (let x = (y & 1); x < LW; x += 2) px(c, x, y, sky[i + 1]); }
  for (let i = 0; i < 40; i++) { const x = r() * LW, y = r() * 22; px(c, x, y, r() < 0.3 ? P.w4 : P.n5); }
  // 원거리 관중석 (상단 지붕)
  rect(c, 0, 26, LW, 4, P.n1); for (let x = 0; x < LW; x += 6) rect(c, x, 26, 1, 4, P.n2);
  rect(c, 0, 30, LW, 20, P.n1);
  // 조명탑
  for (const lx of [34, 286]) {
    rect(c, lx - 1, 6, 3, 28, P.n2); rect(c, lx, 6, 1, 28, P.n3);
    rect(c, lx - 11, 2, 23, 9, P.n1); rect(c, lx - 10, 3, 21, 7, P.n0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { rect(c, lx - 9 + i * 4, 4 + j * 3, 3, 2, P.y4); px(c, lx - 9 + i * 4, 4 + j * 3, P.w4); }
  }
  // 전광판
  rect(c, 118, 12, 84, 30, P.n0); rect(c, 119, 13, 82, 28, P.n1); rect(c, 122, 15, 76, 20, '#05081a');
  rect(c, 156, 42, 8, 10, P.n2);
  // 외야 펜스 + 광고판
  rect(c, 0, 50, LW, 11, theme.wall[1]); rect(c, 0, 50, LW, 1, theme.wall[2]); rect(c, 0, 60, LW, 1, theme.wall[0]);
  const ads = [['바나나스닥', P.y3, P.n1], ['타이거즈 치킨', P.w4, P.r1], ['광주 은행', P.w4, P.n3], ['호랑이 우유', P.n1, P.c3], ['바나나스닥', P.y3, P.n1]];
  let ax = 8; ads.forEach(([t, fg, bg]) => { const w = tw(t, 's') + 8; rect(c, ax, 51, w, 9, bg); text(c, t, ax + w / 2, 51, { f: 's', col: fg, a: 'c' }); ax += w + 18; });
  // 잔디 (원근 줄무늬)
  for (let y = 61; y < LH; y++) { const band = Math.floor(Math.pow((y - 60) / 88, 0.6) * 9); rect(c, 0, y, LW, 1, band & 1 ? P.g3 : P.g2); }
  for (let y = 61; y < LH; y += 1) for (let x = 0; x < LW; x += 1) if (r() < 0.04) px(c, x, y, r() < 0.5 ? P.g4 : P.g1);
  // 내야 흙: 원근 타원 + 다이아몬드 잔디
  const inside = (x, y) => { const a = (x - 160) / 150, b = (y - 112) / 50; return a * a + b * b <= 1 && y > 62; };
  for (let y = 60; y < LH; y++) for (let x = 0; x < LW; x++) {
    if (!inside(x, y)) continue;
    const dia = Math.abs(x - 160) / 96 + Math.abs(y - 104) / 36 < 1;   // 내야 잔디
    if (dia && y > 72) { rect(c, x, y, 1, 1, (Math.floor((y - 60) / 6) & 1) ? P.g3 : P.g2); continue; }
    rect(c, x, y, 1, 1, r() < 0.12 ? P.d2 : r() < 0.05 ? P.d4 : P.d3);
  }
  // 흙/잔디 경계 외곽
  for (let y = 60; y < LH; y++) for (let x = 0; x < LW; x++) { if (inside(x, y) && !inside(x, y - 1) && y > 62) px(c, x, y, P.d1); }
  // 마운드
  ell(c, 160, 79, 16, 5, [P.d1, P.d2, P.d3, P.d4, P.d4], { hi: false }); rect(c, 156, 78, 8, 1, P.w3);
  // 베이스 & 파울라인
  line(c, 160, 140, -10, 96, P.w3); line(c, 160, 140, 330, 96, P.w3);
  for (const [bx, by] of [[160, 68], [252, 102], [68, 102]]) { rect(c, bx - 3, by - 1, 6, 3, P.w4); rect(c, bx - 3, by + 2, 6, 1, P.w1); }
  // 홈 플레이트 & 타석
  ell(c, 160, 138, 46, 9, [P.d1, P.d2, P.d3, P.d3, P.d4], { hi: false, noOutline: true });
  c.fillStyle = P.w4; c.beginPath(); c.moveTo(152, 136); c.lineTo(168, 136); c.lineTo(168, 139); c.lineTo(160, 143); c.lineTo(152, 139); c.fill();
  rect(c, 152, 136, 16, 1, P.w2);
  for (const bx of [120, 175]) { rect(c, bx, 126, 25, 1, P.w3); rect(c, bx, 126, 1, 22, P.w3); rect(c, bx + 24, 126, 1, 22, P.w3); }
  BGC.set(key, cv); return cv;
}
const THEMES = {
  home: { id: 'home', sky: [P.n0, P.n1, P.s1, P.s2, P.s3, P.s4, P.s5], wall: ['#0c2a1c', '#164a30', '#21653f'] },
  away: { id: 'away', sky: [P.n0, P.n0, P.n1, P.n2, P.s1, P.s2, P.s3], wall: ['#141b3d', '#1f2a5c', '#2e3f86'] },
  dome: { id: 'dome', sky: [P.n1, P.n1, P.n2, P.n2, P.n3, P.n3, P.n4], wall: ['#2a1a30', '#4a2a50', '#6a3a70'] },
};
function stadium(c, theme, trust, t, hype = 0, board) {
  c.drawImage(stadiumBase(theme), 0, 0);
  // 관중: 신뢰 = 관중 수
  const dens = 0.12 + 0.85 * Math.min(1, trust / 100);
  crowd(c, 0, 31, 118, 18, dens, t, hype, 5); crowd(c, 202, 31, 118, 18, dens, t, hype, 9); crowd(c, 118, 43, 38, 6, dens, t, hype, 13); crowd(c, 164, 43, 38, 6, dens, t, hype, 17);
  // 조명 번짐
  c.save(); c.globalAlpha = 0.12 + 0.03 * Math.sin(t * 2); for (const lx of [34, 286]) { disc(c, lx, 7, 16, P.y4); } c.restore();
  // 전광판 내용
  if (board) { c.save(); c.beginPath(); c.rect(122, 15, 76, 20); c.clip(); board(c, 122, 15, 76, 20); c.restore(); } else { text(c, 'TIGERS', 160, 19, { f: 'b', col: P.y3, a: 'c' }); }
}

// ---- 탑뷰 구장 (수비/주루). 480x400 월드 ----
const FW = { w: 480, h: 400, home: [240, 385], b1: [302, 323], b2: [240, 261], b3: [178, 323], mound: [240, 330], fence: 292 };
function fieldWorld() {
  const key = 'field'; let s = BGC.get(key); if (s) return s;
  const [cv, c] = mkc(FW.w, FW.h); const r = seeded(7); const [hx, hy] = FW.home;
  rect(c, 0, 0, FW.w, FW.h, P.n1);
  for (let y = 0; y < FW.h; y++) for (let x = 0; x < FW.w; x++) {
    const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy), a = Math.atan2(-dy, dx);
    if (a < Math.PI / 4 - 0.02 || a > Math.PI * 3 / 4 + 0.02) { if (dy < 0 && d < FW.fence + 8) px(c, x, y, ((x >> 3) + (y >> 3)) & 1 ? P.g1 : P.g0); continue; }
    if (d > FW.fence + 6) { px(c, x, y, r() < 0.5 ? P.n1 : P.n0); continue; }
    if (d > FW.fence) { px(c, x, y, P.g0); continue; }
    if (d > FW.fence - 12) { px(c, x, y, r() < 0.2 ? P.d1 : P.d2); continue; }   // 워닝 트랙
    const inf = Math.abs(x - 240) + Math.abs(y - 323) < 62 && d > 20;
    const dirt = d < 150 && !inf || d < 18;
    if (dirt) { px(c, x, y, r() < 0.1 ? P.d2 : r() < 0.05 ? P.d4 : P.d3); continue; }
    const stripe = (Math.floor((x + y) / 14) + Math.floor((x - y) / 14)) & 1;
    px(c, x, y, r() < 0.05 ? P.g4 : stripe ? P.g3 : P.g2);
  }
  // 펜스 선
  for (let a = Math.PI / 4; a <= Math.PI * 3 / 4; a += 0.002) { const x = hx + Math.cos(a) * FW.fence, y = hy - Math.sin(a) * FW.fence; rect(c, x, y, 2, 2, P.w2); }
  // 파울 라인
  line(c, hx, hy, hx + 300, hy - 300, P.w3); line(c, hx, hy, hx - 300, hy - 300, P.w3);
  // 마운드, 베이스
  ell(c, FW.mound[0], FW.mound[1], 11, 10, [P.d2, P.d3, P.d3, P.d3, P.d3], { flat: true }); rect(c, FW.mound[0] - 3, FW.mound[1], 6, 2, P.w3);
  for (const k of ['b1', 'b2', 'b3']) { const [x, y] = FW[k]; for (let i = -3; i <= 3; i++) rect(c, x - (3 - Math.abs(i)), y + i, (3 - Math.abs(i)) * 2 + 1, 1, P.w4); }
  c.fillStyle = P.w4; c.beginPath(); c.moveTo(hx - 4, hy - 4); c.lineTo(hx + 4, hy - 4); c.lineTo(hx + 4, hy); c.lineTo(hx, hy + 3); c.lineTo(hx - 4, hy); c.fill();
  BGC.set(key, cv); return cv;
}

// ============================================================================
// UI 조각
// ============================================================================
function panel(c, x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const bg = o.bg || P.n1, br = o.br || P.n4, dk = o.dk || P.n0;
  rect(c, x + 1, y, w - 2, h, dk); rect(c, x, y + 1, w, h - 2, dk);
  rect(c, x + 1, y + 1, w - 2, h - 2, br); rect(c, x + 2, y + 2, w - 4, h - 4, bg);
  if (!o.flat) rect(c, x + 2, y + 2, w - 4, 1, o.hl || 'rgba(255,255,255,0.08)');
  if (o.alpha) { }
}
function paper(c, x, y, w, h) { rect(c, x + 2, y + 2, w, h, 'rgba(10,14,36,0.5)'); rect(c, x, y, w, h, P.c3); rect(c, x, y, w, 1, P.c4); rect(c, x, y + h - 1, w, 1, P.c1); rect(c, x + w - 1, y, 1, h, P.c2); }
// 버튼: kind red|navy|gold|ghost
function button(c, x, y, w, h, label, o = {}) {
  const kind = o.kind || 'red', dn = o.down ? 1 : 0, off = o.disabled;
  const pal = off ? ['#2a2f48', '#3a4060', '#4a5070', '#6a7090'] : kind === 'navy' ? [P.n0, P.n2, P.n3, P.n4] : kind === 'gold' ? [P.y0, P.y1, P.y2, P.y3] : kind === 'ghost' ? [P.n0, P.n1, P.n1, P.n2] : [P.r0, P.r1, P.r2, P.r3];
  x = Math.round(x); y = Math.round(y);
  if (!dn) { rect(c, x + 1, y + h, w - 2, 1, pal[0]); }
  rect(c, x + 1, y + dn, w - 2, h, pal[0]); rect(c, x, y + 1 + dn, w, h - 2, pal[0]);
  rect(c, x + 1, y + 1 + dn, w - 2, h - 2, pal[2]); rect(c, x + 1, y + 1 + dn, w - 2, 1, pal[3]); rect(c, x + 1, y + h - 2 + dn, w - 2, 1, pal[1]);
  if (label != null) text(c, label, x + w / 2 + (o.icon ? 5 : 0), y + Math.round((h - (o.f === 's' ? 8 : 10)) / 2) + dn, { f: o.f || 'b', col: off ? '#9aa0b8' : kind === 'gold' ? P.n0 : P.w4, a: 'c', out: off ? null : pal[0] });
  if (o.icon) icon(c, o.icon, x + w / 2 - tw(label, o.f || 'b') / 2 - 6, y + (h - 9) / 2 + dn);
}
function bar(c, x, y, w, h, v, max, col, bg = P.n0) { rect(c, x, y, w, h, bg); const f = Math.round(w * Math.max(0, Math.min(1, v / max))); rect(c, x, y, f, h, col); if (h > 2 && f > 0) rect(c, x, y, f, 1, 'rgba(255,255,255,0.35)'); }

// ---- 아이콘 9x9 (문자열 도트) ----
const ICONS = {
  lock: ['..aaaaa..', '.a.....a.', '.a.....a.', 'bbbbbbbbb', 'bcccccccb', 'bccc.cccb', 'bccc.cccb', 'bcccccccb', 'bbbbbbbbb'],
  up: ['....a....', '...aaa...', '..aaaaa..', '.aaaaaaa.', 'aaaaaaaaa', '...aaa...', '...aaa...', '...aaa...', '.........'],
  dn: ['.........', '...aaa...', '...aaa...', '...aaa...', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', '...aaa...', '....a....'],
  star: ['....a....', '...aaa...', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', '..aa.aa..', '.aa...aa.', '.a.....a.', '.........'],
  ball: ['..aaaaa..', '.abbbbba.', 'abbcbcbba', 'abbcbcbba', 'abbbbbbba', 'abbcbcbba', 'abbcbcbba', '.abbbbba.', '..aaaaa..'],
  coin: ['..aaaaa..', '.abbbbba.', 'abbcccbba', 'abcbbbcba', 'abbbccbba', 'abbbbbcba', 'abcccccba', '.abbbbba.', '..aaaaa..'],
  bed: ['.........', 'a........', 'abb......', 'abbcccccc', 'acccccccc', 'aaaaaaaaa', 'a.......a', '.........', '.........'],
  sweat: ['....a....', '...aba...', '..abba...', '.abbbba..', '.abbbcba.', '.abbbbba.', '..abbba..', '...aaa...', '.........'],
  fire: ['....a....', '...aa....', '..aaba...', '..abba.a.', '.abbbbaa.', '.abccbba.', 'abcccbba.', '.abccba..', '..aaaa...'],
  crown: ['.........', 'a...a...a', 'aa.aaa.aa', 'abaabaaba', 'abbbbbbba', 'abcbcbcba', 'abbbbbbba', 'aaaaaaaaa', '.........'],
  bat: ['.......aa', '......aba', '.....aba.', '....aba..', '...aba...', '..aba....', '.aba.....', 'cc.......', 'cc.......'],
  glove: ['..a.a.a..', '.abababa.', '.abbbbba.', 'aabbbbbba', 'abbbccbba', 'abbbccbba', '.abbbbba.', '..abbba..', '...aaa...'],
  shoe: ['.........', '..aaaa...', '..abba...', '..abbaaa.', '.abbbbbba', 'abbbbbbba', 'accccccca', 'aaaaaaaaa', '.........'],
  eye: ['.........', '..aaaaa..', '.abbbbba.', 'abbcccbba', 'abcccccba', 'abbcccbba', '.abbbbba.', '..aaaaa..', '.........'],
  bunt: ['.........', '.........', 'c........', 'caaaaaaaa', 'cabbbbbbba'.slice(0, 9), 'caaaaaaaa', 'c........', '.........', '.........'],
  cap: ['.........', '..aaaaa..', '.abbbbba.', 'abbcbbbba', 'abbbbbbba', 'aaaaaaaaa', '....aaaaa', '.........', '.........'],
  mic: ['...aaa...', '..abbba..', '..abcba..', '..abbba..', '..abbba..', '.a.aaa.a.', '..a...a..', '...aaa...', '....a....'],
  chart: ['.........', '.......a.', '......aa.', '.a...a.a.', 'aa..a..a.', 'a.aa...a.', 'a......a.', 'aaaaaaaaa', '.........'],
  tear: ['.........', '..a...a..', '..b...b..', '.........', '.........', '..aaaaa..', '.a.....a.', '.........', '.........'],
};
const ICOL = {
  lock: [P.w2, P.y2, P.y1], up: [P.up], dn: [P.dn], star: [P.y3], ball: [P.w1, P.w4, P.r2], coin: [P.y1, P.y3, P.y0], bed: [P.w1, P.r2, P.w3],
  sweat: [P.n4, P.n6, P.w4], fire: [P.r1, P.r3, P.y3], crown: [P.y1, P.y3, P.r2], bat: [P.wood[1], P.wood[3], P.n3], glove: [PAL.brown[0], PAL.brown[3], PAL.brown[1]],
  shoe: [P.n0, P.w3, P.r2], eye: [P.n3, P.w4, P.n1], bunt: [P.wood[1], P.wood[3], P.n3], cap: [P.r0, P.r2, P.w4], mic: [P.w1, P.w3, P.r2], chart: [P.up], tear: [P.n4, P.dn],
};
function icon(c, name, x, y, cols) { const g = ICONS[name]; if (!g) return; const cl = cols || ICOL[name]; x = Math.round(x); y = Math.round(y); g.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = 'abc'.indexOf(row[i]); if (k >= 0) px(c, x + i, y + j, cl[Math.min(k, cl.length - 1)]); } }); }

// 팀 배지 (로고 없이 구단명 칩)
function badge(c, team, x, y, w = 30, h = 13) { const T = K.TEAMS[team]; const pal = teamPal(T.c, T.d); rect(c, x + 1, y, w - 2, h, pal[0]); rect(c, x, y + 1, w, h - 2, pal[0]); rect(c, x + 1, y + 1, w - 2, h - 2, pal[2]); rect(c, x + 1, y + 1, w - 2, 1, pal[3]); text(c, T.name, x + w / 2, y + (h - 10) / 2, { f: 'b', col: P.w4, a: 'c', out: pal[0] }); }

// 루상 다이아몬드
function bases(c, x, y, b, s = 6) {
  const pos = [[x + s, y], [x, y - s], [x - s, y]];
  pos.forEach(([bx, by], i) => { for (let k = -3; k <= 3; k++) rect(c, bx - (3 - Math.abs(k)), by + k, (3 - Math.abs(k)) * 2 + 1, 1, b[i] ? P.y3 : P.n3); for (let k = -2; k <= 2; k++) if (!b[i]) rect(c, bx - (2 - Math.abs(k)), by + k, (2 - Math.abs(k)) * 2 + 1, 1, P.n1); });
}
// B S O 점
function bso(c, x, y, bl, st, ou) {
  const row = (lab, n, max, col, yy) => { text(c, lab, x, yy - 1, { f: 's', col: P.w3 }); for (let i = 0; i < max; i++) { disc(c, x + 10 + i * 6, yy + 3, 2, i < n ? col : P.n3); } };
  row('B', bl, 3, P.ok, y); row('S', st, 2, P.y3, y + 8); row('O', ou, 2, P.up, y + 16);
}

const GFX = { BAX, BAY, BW, BH, LW, LH, P, PAL, mkc, rect, px, ell, disc, line, bat, text, tw, wrap, textBox, tex, batterSprite, pitcherSprite, drawTop, TOP_KIA, topTeam, bustSprite, stadium, stadiumBase, THEMES, crowd, fieldWorld, FW, panel, paper, button, bar, icon, badge, bases, bso, teamPal, drawNum, seeded, BAT_FR, drawBatter };
window.GFX = GFX;
