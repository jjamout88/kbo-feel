'use strict';
// ============================================================================
// mg_field.js — 수비 위기 / 홈 쇄도 / 도루
// 퍼펙트 = 무조건 성공: 송구 게이지 정중앙, 3루 밟는 순간 GO, 다리 드는 순간 출발
// ============================================================================
const FWD = GFX.FW;
function camOf(x, y) { return { x: Math.max(160, Math.min(FWD.w - 160, x)), y: Math.max(74, Math.min(FWD.h - 74, y)) }; }
function drawWorld(c, cam) { c.drawImage(G_.fieldWorld(), Math.round(cam.x - 160), Math.round(cam.y - 74), LW, LH, 0, 0, LW, LH); }
const W2S = (cam, x, y) => [Math.round(x - cam.x + 160), Math.round(y - cam.y + 74)];
function fieldHUD(c, o, label) {
  G_.panel(c, 4, 4, 118, 27, { bg: P.n1, br: P.n3 }); text(c, label, 10, 7, { f: 's', col: P.y3 }); text(c, sitText(o.sit).split(' · ')[0], 10, 18, { f: 's', col: P.w2 });
}
// 송구 게이지
function gauge(c, g, y = 120) {
  const x = 60, w = 200; G_.panel(c, x - 4, y - 4, w + 8, 20, { bg: P.n0 });
  rect(c, x, y, w, 12, P.dn); const gw = Math.round(w * g.green), pw = Math.max(3, Math.round(w * g.perf)); rect(c, x + w / 2 - gw / 2, y, gw, 12, P.ok); rect(c, x + w / 2 - pw / 2, y, pw, 12, P.y3);
  const nx = x + Math.round(g.pos * w); rect(c, nx - 1, y - 3, 3, 18, P.w4); rect(c, nx, y - 3, 1, 18, P.n1);
  text(c, '송구! 초록에서 탭', 160, y - 16, { f: 'b', col: P.w4, a: 'c', out: P.n0 });
}

// ============================================================================
// 수비 위기
// ============================================================================
Scenes.field = (o) => {
  const S = App.S, st = o.stats, ace = o.ace ? 1 : 0, shift = o.tactic === 'shift' ? 1.3 : 1, R = Math.random;
  const IF = S.me.pos !== 'OF'; const home = FWD.home;
  const start = IF ? [205, 278] : [240, 168];
  const me = { x: start[0], y: start[1], dir: -Math.PI / 2, fr: 0, dive: 0 };
  const spd = (IF ? 44 : 40) + 22 * st.def / 99;
  const EZ = S.easy ? 1.25 : 1; const catchR = (5 + 3 * st.def / 99) * shift * EZ, diveR = catchR + (7 + 4 * st.def / 99) * shift;
  const G = { phase: 'pre', t: 0, ball: null, target: null, gauge: null, res: null, msg: null, endT: 0, runner: null, thr: null, perfect: false };
  // 타구 설정
  if (IF) {
    const side = (R() < 0.5 ? -1 : 1), off = (16 + R() * 24) * side;
    const dx = me.x - home[0], dy = me.y - home[1], L = Math.hypot(dx, dy); const px_ = -dy / L, py_ = dx / L;
    const pass = [me.x + px_ * off, me.y + py_ * off]; const vx = (pass[0] - home[0]), vy = (pass[1] - home[1]); const vl = Math.hypot(vx, vy);
    G.ball = { kind: 'gr', x: home[0], y: home[1] - 4, vx: vx / vl * (100 + 20 * ace), vy: vy / vl * (100 + 20 * ace), h: 0 };
  } else {
    const ang = -Math.PI / 2 + (R() - 0.5) * 2.6, dist = 50 + R() * 50; const Lx = me.x + Math.cos(ang) * dist, Ly = me.y + Math.sin(ang) * dist * 0.9;
    G.ball = { kind: 'fly', x0: home[0], y0: home[1] - 4, x1: Lx, y1: Ly, u: 0, dur: 2.0 - 0.2 * ace, x: home[0], y: home[1], h: 0 };
  }
  const bot = window.BOT && BOT.field;
  function catchCheck(bx, by) {
    const d = Math.hypot(me.x - bx, me.y - by);
    if (d <= catchR) return 'catch'; if (d <= diveR) return 'dive'; return null;
  }
  function caught(kind) {
    me.dive = kind === 'dive' ? 1 : 0; Sound.play(kind === 'dive' ? 'slide' : 'mitt'); shake(kind === 'dive' ? 3 : 1);
    G.msg = { txt: kind === 'dive' ? '다이빙 캐치!' : '잡았다!', col: P.y3, big: 2, t: 0 };
    G.phase = 'gauge'; G.t = 0; G.dive = kind === 'dive';
    G.gauge = { pos: 0, dir: 1, green: (IF ? 0.2 + 0.16 * st.def / 99 : 0.14 + 0.14 * st.def / 99) * shift * EZ * (G.dive ? 0.75 : 1), perf: 0.045, period: IF ? 0.85 : 1.1, cycles: 0 };
    if (bot) G.botTap = 0.5 + (R() - 0.5) * 2 * bot.jt;
  }
  function missed(kind) { G.phase = 'over'; G.endT = 1.6; G.res = { res: kind }; G.msg = { txt: kind === 'drop' ? '놓쳤다…' : '빠졌다…', col: P.dn, big: 2, t: 0, sub: '안타 허용' }; Sound.play('down'); }
  function tap() {
    if (G.phase !== 'gauge') return; const g = G.gauge; const d = Math.abs(g.pos - 0.5);
    const perfect = d <= g.perf / 2, ok = d <= g.green / 2;
    G.phase = 'throw'; G.t = 0; G.perfect = perfect; G.ok = ok || perfect; Sound.play('whoosh');
    const tgt = IF ? FWD.b1 : FWD.home; G.thr = { x0: me.x, y0: me.y, x1: tgt[0], y1: tgt[1], u: 0, dur: Math.hypot(tgt[0] - me.x, tgt[1] - me.y) / (IF ? 230 : 210) };
    G.runner = IF ? { x0: home[0], y0: home[1], x1: FWD.b1[0], y1: FWD.b1[1] } : { x0: FWD.b3[0], y0: FWD.b3[1], x1: home[0], y1: home[1] };
    G.msg = { txt: perfect ? 'PERFECT 송구!' : ok ? '좋은 송구!' : '송구가 빗나갔다', col: ok ? P.y3 : P.dn, big: 2, t: 0 };
  }
  let ptr = null;
  return {
    update(dt) {
      G.t += dt; if (G.msg) G.msg.t += dt;
      if (G.phase === 'pre') { if (G.t > 0.7) { G.phase = 'live'; G.t = 0; Sound.play(IF ? 'ttak' : 'kkang'); } return; }
      if (G.phase === 'live') {
        // 이동
        let tx = null, ty = null;
        if (bot) { const b = G.ball; const aim = b.kind === 'fly' ? [b.x1, b.y1] : (() => { let best = null; for (let k = 0; k < 120; k++) { const t2 = k * 0.02, bx = b.x + b.vx * t2, by = b.y + b.vy * t2; if (Math.hypot(bx - me.x, by - me.y) <= spd * (t2 - bot.react)) { best = [bx, by]; break; } } return best || [b.x + b.vx, b.y + b.vy]; })(); if (G.t > bot.react) { tx = aim[0] + bot.err * Math.sin(G.t * 3); ty = aim[1]; } }
        else if (ptr) { tx = ptr.x + G.cam.x - 160; ty = ptr.y + G.cam.y - 74; }
        if (tx != null) { const dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy); if (d > 1) { const m = Math.min(d, spd * dt); me.x += dx / d * m; me.y += dy / d * m; me.dir = Math.atan2(dy, dx); me.fr = (G.t * 8 | 0) % 2 + 1; } else me.fr = 0; } else me.fr = 0;
        const b = G.ball;
        if (b.kind === 'gr') { b.x += b.vx * dt; b.y += b.vy * dt; const k = catchCheck(b.x, b.y); if (k) return caught(k); if (Math.hypot(b.x - home[0], b.y - home[1]) > Math.hypot(me.x - home[0], me.y - home[1]) + 26) return missed('hit'); }
        else { b.u += dt / b.dur; const u = Math.min(1, b.u); b.x = b.x0 + (b.x1 - b.x0) * u; b.y = b.y0 + (b.y1 - b.y0) * u; b.h = Math.sin(u * Math.PI) * 70; if (u >= 1) { const k = catchCheck(b.x1, b.y1); if (k) return caught(k); return missed('drop'); } }
      }
      if (G.phase === 'gauge') { const g = G.gauge; g.pos += g.dir * dt / (g.period / 2); if (g.pos >= 1) { g.pos = 1; g.dir = -1; g.cycles++; } if (g.pos <= 0) { g.pos = 0; g.dir = 1; g.cycles++; } if (g.cycles >= 4) { tap(); } if (bot && G.t > 0.3 && Math.abs(g.pos - G.botTap) < 0.02) tap(); }
      if (G.phase === 'throw') { const th = G.thr; th.u += dt / th.dur; if (th.u >= 1 && !G.landed) { G.landed = 1; G.phase = 'over'; G.endT = 1.4; G.res = { res: G.ok ? 'out' : 'hit', dive: G.dive, perfect: G.perfect }; G.msg = { txt: G.ok ? '아웃!' : '세이프…', col: G.ok ? P.y3 : P.dn, big: 3, t: 0, sub: G.ok ? (G.perfect ? '완벽한 송구' : '') : '실점 허용' }; Sound.play(G.ok ? 'roar' : 'down'); if (G.ok) shake(2); } }
      if (G.phase === 'over') { G.endT -= dt; if (G.endT <= 0 && !G.ended) { G.ended = 1; o.onEnd(G.res); } }
    },
    down(p) { if (G.phase === 'gauge') return tap(); ptr = p; },
    move(p) { if (ptr && ptr.id === p.id) ptr = p; },
    up(p) { if (ptr && ptr.id === p.id) ptr = null; },
    key(code) { if (code === 'Space') tap(); },
    draw(c) {
      const b = G.ball; const fx = G.phase === 'throw' && G.thr ? [G.thr.x0 + (G.thr.x1 - G.thr.x0) * Math.min(1, G.thr.u), G.thr.y0 + (G.thr.y1 - G.thr.y0) * Math.min(1, G.thr.u)] : null;
      const fx2 = fx || (b.kind === 'fly' ? [(me.x + b.x1) / 2, (me.y + b.y1) / 2 - 10] : [(me.x + b.x) / 2, (me.y + b.y) / 2]);
      const tc = camOf(fx2[0], fx2[1]); G.cam = G.cam || tc; G.cam = { x: G.cam.x + (tc.x - G.cam.x) * 0.12, y: G.cam.y + (tc.y - G.cam.y) * 0.12 }; const cam = G.cam;
      drawWorld(c, cam);
      // 낙하 지점 그림자
      if (b.kind === 'fly' && G.phase === 'live') { const [sx, sy] = W2S(cam, b.x1, b.y1); const k = Math.min(1, b.u); c.save(); c.globalAlpha = 0.25 + 0.35 * k; G_.ell(c, sx, sy, 3 + 5 * k, 2 + 3 * k, [P.g0, P.g0, P.g0, P.g0, P.g0], { flat: true, noOutline: true }); c.restore();
        c.save(); c.globalAlpha = 0.6; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; px(c, sx + Math.cos(a) * catchR, sy + Math.sin(a) * catchR * 0.8, P.y3); } c.restore(); }
      // 수비수(나)
      const [mx, my] = W2S(cam, me.x, me.y);
      G_.drawTop(c, mx, my, me.dir, me.fr, G_.TOP_KIA, S.me.skin, { dive: me.dive && G.phase !== 'live', throw: G.phase === 'throw' && G.t < 0.2 });
      if (G.phase === 'live') { c.save(); c.globalAlpha = 0.35; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; px(c, mx + Math.cos(a) * diveR, my + Math.sin(a) * diveR * 0.8, P.w4); } c.restore(); text(c, '나', mx, my - 24, { f: 's', col: P.y3, a: 'c', out: P.n0 }); }
      // 공
      if (G.phase === 'live') { const [bx, by] = W2S(cam, b.x, b.y); if (b.kind === 'fly') { c.save(); c.globalAlpha = 0.35; G_.disc(c, bx, by, 1, P.g0); c.restore(); drawBall(c, bx, by - b.h * 0.55, 1.6 + b.h / 40); } else drawBall(c, bx, by, 1.4); }
      // 주자/송구
      if (G.runner) { const u = Math.min(1, G.t / (G.thr.dur + 0.15)); const r = G.runner; const [rx, ry] = W2S(cam, r.x0 + (r.x1 - r.x0) * u, r.y0 + (r.y1 - r.y0) * u); G_.drawTop(c, rx, ry, Math.atan2(r.y1 - r.y0, r.x1 - r.x0), (G.t * 8 | 0) % 2 + 1, G_.topTeam(o.opp)); }
      if (fx) { const [tx, ty] = W2S(cam, fx[0], fx[1]); drawBall(c, tx, ty - Math.sin(Math.min(1, G.thr.u) * Math.PI) * 6, 1.5); }
      // 손가락 목표
      if (ptr && G.phase === 'live') { c.save(); c.globalAlpha = 0.6; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + App.t * 3; px(c, ptr.x + Math.cos(a) * 5, ptr.y + Math.sin(a) * 5, P.w4); } c.restore(); }
      fieldHUD(c, o, IF ? '수비 위기 · 유격수' : '수비 위기 · 중견수');
      if (G.phase === 'pre' || (G.phase === 'live' && G.t < 1.2)) text(c, IF ? '땅볼! 누르고 있는 쪽으로 달림' : '뜬공! 그림자 원 안으로', 160, 30, { f: 'b', col: P.w4, a: 'c', out: P.n0 });
      if (G.phase === 'gauge') gauge(c, G.gauge);
      drawMsg(c, G.msg);
    },
  };
};

// ============================================================================
// 홈 쇄도 (2루 주자 → 단타 → 3루 돌면서 GO/STOP)
// ============================================================================
Scenes.run = (o) => {
  const S = App.S, st = o.stats, c0 = o.c, R = Math.random; const spdT = o.tactic === 'speed' ? 1.5 : 1;
  const depth = c0.depth != null ? c0.depth : R(), arm = c0.arm != null ? c0.arm : R();
  const home = FWD.home, b2 = FWD.b2, b3 = FWD.b3;
  const ang = Math.PI / 2 + (R() - 0.5) * 1.3, dist = 165 + 85 * depth; const land = [home[0] + Math.cos(ang) * dist, home[1] - Math.sin(ang) * dist];
  const OFp = [[120, 200], [240, 165], [360, 200]]; let fi = 0, bd = 1e9; OFp.forEach((p, i) => { const d = Math.hypot(p[0] - land[0], p[1] - land[1]); if (d < bd) { bd = d; fi = i; } });
  const G = { phase: 'pre', t: 0, me: { x: b2[0], y: b2[1], seg: 0, d: 0 }, ball: { x0: home[0], y0: home[1], u: 0, dur: 0.9 + 0.5 * depth }, of: { x: OFp[fi][0], y: OFp[fi][1], has: false }, dec: null, res: null, msg: null, thr: null, endT: 0 };
  const rs = (50 + 28 * st.spd / 99) * (o.tactic === 'speed' ? 1.08 : 1);
  const L1 = Math.hypot(b3[0] - b2[0], b3[1] - b2[1]), L2 = Math.hypot(home[0] - b3[0], home[1] - b3[1]);
  const EZ = S.easy ? 1.3 : 1; const preWin = 24 * spdT, postWin = 14 * spdT * EZ, perfWin = 3.2 * spdT * EZ;
  const bot = window.BOT && BOT.run;
  function decide(go) {
    if (G.dec || G.phase !== 'live') return; const d = G.me.d - L1;   // 3루 기준 거리 (음수=도착 전)
    if (d < -preWin) return;
    if (!go) { G.dec = { go: false }; G.msg = { txt: 'STOP', col: P.w3, big: 2, t: 0, sub: '3루에서 멈춤' }; Sound.play('click'); return; }
    const perfect = Math.abs(d) <= perfWin; const late = Math.max(0, d) / postWin;
    let p = perfect ? 1 : Math.max(0.08, Math.min(0.92, 0.3 + 0.4 * st.spd / 99 + 0.3 * depth - 0.25 * arm - late * 0.35 - (d < 0 ? 0.05 : 0)));
    G.dec = { go: true, perfect, safe: R() < p }; G.msg = { txt: perfect ? 'PERFECT 스타트!' : 'GO!', col: P.y3, big: 2, t: 0 }; Sound.play(perfect ? 'kkang' : 'whoosh');
  }
  return {
    update(dt) {
      G.t += dt; if (G.msg) G.msg.t += dt;
      if (G.phase === 'pre') { if (G.t > 0.6) { G.phase = 'live'; G.t = 0; Sound.play('ttak', 0.7); } return; }
      if (G.phase === 'live') {
        const b = G.ball; b.u = Math.min(1, b.u + dt / b.dur);
        const of = G.of; if (!of.has) { const dx = land[0] - of.x, dy = land[1] - of.y, d = Math.hypot(dx, dy); if (d > 2) { const m = Math.min(d, 55 * dt); of.x += dx / d * m; of.y += dy / d * m; } else if (b.u >= 1) { of.has = true; G.pickT = G.t; Sound.play('mitt'); } }
        // 주자
        const m = G.me; const stopAt3 = G.dec && !G.dec.go; const target = stopAt3 ? L1 : L1 + L2;
        if (!G.dec && m.d - L1 > postWin) { G.dec = { go: false, auto: 1 }; G.msg = { txt: '멈춤', col: P.w3, big: 2, t: 0, sub: '타이밍을 놓쳤다' }; }
        m.d = Math.min(target, m.d + rs * dt * (stopAt3 && m.d > L1 - 6 ? 0.3 : 1));
        if (m.d <= L1) { const u = m.d / L1; m.x = b2[0] + (b3[0] - b2[0]) * u; m.y = b2[1] + (b3[1] - b2[1]) * u; } else { const u = (m.d - L1) / L2; m.x = b3[0] + (home[0] - b3[0]) * u; m.y = b3[1] + (home[1] - b3[1]) * u; }
        if (bot && !G.dec) { const d = m.d - L1; if (d >= bot.at) decide(!bot.stop); }
        // 송구
        if (G.dec && G.dec.go && of.has && !G.thr) { const remain = (L1 + L2 - m.d) / rs; const fd = Math.hypot(home[0] - of.x, home[1] - of.y); const want = G.dec.safe ? remain + 0.18 : Math.max(0.25, remain - 0.18); G.thr = { x0: of.x, y0: of.y, u: 0, dur: want }; Sound.play('whoosh'); }
        if (G.thr) G.thr.u = Math.min(1, G.thr.u + dt / G.thr.dur);
        if (stopAt3 && m.d >= L1 - 0.5 && G.t > 0.5 && !G.res) { G.res = { res: 'hold' }; G.phase = 'over'; G.endT = 1.3; }
        if (G.dec && G.dec.go && m.d >= L1 + L2 - 0.5 && !G.res) { const safe = G.dec.perfect || G.dec.safe; G.res = { res: safe ? 'safe' : 'out', perfect: G.dec.perfect }; G.phase = 'over'; G.endT = 1.5; G.msg = { txt: safe ? '세이프!!' : '아웃…', col: safe ? P.y3 : P.dn, big: 3, t: 0, sub: safe ? '홈 쇄도 성공' : '홈에서 태그' }; Sound.play('slide'); setTimeout(() => Sound.play(safe ? 'roar' : 'down'), 150); shake(3); }
        if (G.dec && G.dec.go && !of.has && m.d >= L1 + L2 - 0.5 && !G.res) { }
      }
      if (G.phase === 'over') { G.endT -= dt; if (G.endT <= 0 && !G.ended) { G.ended = 1; o.onEnd(G.res); } }
    },
    down(p) { if (G.phase !== 'live' || G.dec) return; if (p.x >= 200) decide(true); else if (p.x < 120 && p.y > 100) decide(false); },
    key(code) { if (code === 'Space' || code === 'KeyG') decide(true); if (code === 'KeyS') decide(false); },
    draw(c) {
      const m = G.me; const tc = camOf((m.x * 2 + G.of.x) / 3, (m.y * 2 + G.of.y) / 3 + 10); G.cam = G.cam || tc; G.cam = { x: G.cam.x + (tc.x - G.cam.x) * 0.1, y: G.cam.y + (tc.y - G.cam.y) * 0.1 }; const cam = G.cam;
      drawWorld(c, cam);
      // 타구
      const b = G.ball; if (!G.of.has) { const u = b.u; const bx = b.x0 + (land[0] - b.x0) * u, by = b.y0 + (land[1] - b.y0) * u; const [sx, sy] = W2S(cam, bx, by); drawBall(c, sx, sy - Math.sin(u * Math.PI) * 18, 1.5); }
      // 3루 타이밍 링
      if (G.phase === 'live' && !G.dec) { const d = G.me.d - L1; const [qx, qy] = W2S(cam, b3[0], b3[1]); const k = Math.max(0, Math.min(1, -d / preWin)); const rr = 4 + 18 * k; const col = Math.abs(d) <= perfWin ? P.y3 : d > -preWin ? P.w4 : P.n5; c.save(); c.globalAlpha = 0.85; for (let i = 0; i < 32; i++) { const a = i / 32 * 6.28; px(c, qx + Math.cos(a) * rr, qy + Math.sin(a) * rr * 0.8, col); } c.restore(); }
      const [ox, oy] = W2S(cam, G.of.x, G.of.y); G_.drawTop(c, ox, oy, Math.atan2(home[1] - G.of.y, home[0] - G.of.x), G.of.has ? 0 : (G.t * 8 | 0) % 2 + 1, G_.topTeam(o.opp), 0, { throw: !!G.thr && G.thr.u < 0.2 });
      const [cx_, cy_] = W2S(cam, home[0], home[1] + 6); G_.drawTop(c, cx_, cy_, -Math.PI / 2, 0, G_.topTeam(o.opp));
      if (G.thr) { const u = G.thr.u; const tx = G.thr.x0 + (home[0] - G.thr.x0) * u, ty = G.thr.y0 + (home[1] - G.thr.y0) * u; const [sx, sy] = W2S(cam, tx, ty); drawBall(c, sx, sy - Math.sin(u * Math.PI) * 10, 1.5); }
      const [mx, my] = W2S(cam, m.x, m.y); G_.drawTop(c, mx, my, m.d < L1 ? Math.atan2(b3[1] - b2[1], b3[0] - b2[0]) : Math.atan2(home[1] - b3[1], home[0] - b3[0]), G.phase === 'live' ? (G.t * 9 | 0) % 2 + 1 : 0, G_.TOP_KIA, S.me.skin, { dive: G.res && G.res.res !== 'hold' }); text(c, '나', mx, my - 24, { f: 's', col: P.y3, a: 'c', out: P.n0 });
      fieldHUD(c, o, '홈 쇄도 · 2루 주자');
      G_.panel(c, 198, 4, 118, 27, { bg: P.n1, br: P.n3 });
      text(c, `타구 ${depth > 0.66 ? '깊음' : depth > 0.33 ? '보통' : '얕음'}`, 204, 7, { f: 's', col: depth > 0.5 ? P.ok : P.r4 }); text(c, `외야 어깨 ${arm > 0.66 ? '강함' : arm > 0.33 ? '보통' : '약함'}`, 204, 18, { f: 's', col: arm < 0.5 ? P.ok : P.r4 });
      if (G.phase === 'live' && !G.dec) { btn(c, 'stop', 8, 112, 64, 30, 'STOP', () => decide(false), { kind: 'navy', instant: true }); G_.ell(c, 284, 118, 26, 22, G_.PAL.red); text(c, 'GO', 284, 112, { f: 'b', col: P.w4, a: 'c', out: P.r0, sc: 1 }); text(c, '3루를 밟는 순간!', 160, 30, { f: 'b', col: P.w4, a: 'c', out: P.n0 }); }
      drawMsg(c, G.msg);
    },
  };
};

// ============================================================================
// 도루 (포수 시점)
// ============================================================================
Scenes.steal = (o) => {
  const S = App.S, st = o.stats, R = Math.random, ace = o.ace ? 1 : 0; const spdT = o.tactic === 'speed' ? 1.5 : 1;
  const acts = []; const nf = o.c.feints != null ? o.c.feints : (R() * 3) | 0;
  let tt = 0.8 + R() * 0.6; for (let i = 0; i < nf; i++) { const pk = R() < 0.35; acts.push({ t: tt, kind: pk ? 'pick' : 'look', dur: pk ? 0.9 : 0.7 }); tt += (pk ? 0.9 : 0.7) + 0.4 + R() * 0.7; }
  acts.push({ t: tt, kind: 'go', dur: 0.7 });
  const perf = 0.13 * spdT * (S.easy ? 1.3 : 1), good = 0.55;
  const G = { t: 0, phase: 'live', act: null, tap: null, res: null, msg: null, endT: 0, run: 0 };
  const bot = window.BOT && BOT.steal;
  function curAct() { return acts.find(a => G.t >= a.t && G.t < a.t + a.dur) || null; }
  function tap() {
    if (G.phase !== 'live' || G.tap) return; const a = curAct(); const go = acts[acts.length - 1];
    if (G.t < go.t) { G.tap = { early: true }; G.res = { res: 'pick' }; G.phase = 'over'; G.endT = 1.6; G.msg = { txt: '견제사!', col: P.dn, big: 3, t: 0, sub: '너무 빨리 뛰었다' }; Sound.play('down'); shake(2); return; }
    const dtp = G.t - go.t; const perfect = dtp <= perf; const p = perfect ? 1 : Math.max(0.1, Math.min(0.9, 0.35 + 0.45 * st.spd / 99 - 0.15 * ace - Math.max(0, dtp - perf) / good * 0.45));
    G.tap = { perfect, safe: R() < p, at: G.t }; G.phase = 'running'; G.msg = { txt: perfect ? 'PERFECT 스타트!' : '스타트!', col: P.y3, big: 2, t: 0 }; Sound.play(perfect ? 'kkang' : 'whoosh');
  }
  return {
    update(dt) {
      G.t += dt; if (G.msg) G.msg.t += dt; const go = acts[acts.length - 1];
      if (G.phase === 'live') { const a = curAct(); if (a !== G.act) { G.act = a; if (a && a.kind === 'go') Sound.play('tick'); if (a && a.kind === 'pick') Sound.play('whoosh'); }
        if (bot) { const want = bot.early ? go.t - 0.3 : go.t + bot.delay; if (G.t >= want) tap(); }
        if (G.t > go.t + good + 0.2) { G.phase = 'over'; G.endT = 1.2; G.res = { res: 'hold' }; G.msg = { txt: '못 뛰었다', col: P.w2, big: 2, t: 0, sub: '1루에 그대로' }; } }
      if (G.phase === 'running') { G.run = Math.min(1, G.run + dt / 1.0); if (G.run >= 1) { const safe = G.tap.perfect || G.tap.safe; G.phase = 'over'; G.endT = 1.5; G.res = { res: safe ? 'safe' : 'out', perfect: G.tap.perfect }; G.msg = { txt: safe ? '세이프!' : '아웃…', col: safe ? P.y3 : P.dn, big: 3, t: 0, sub: safe ? '도루 성공' : '태그 아웃' }; Sound.play('slide'); setTimeout(() => Sound.play(safe ? 'crowd' : 'down'), 150); shake(2); } }
      if (G.phase === 'over') { G.endT -= dt; if (G.endT <= 0 && !G.ended) { G.ended = 1; o.onEnd(G.res); } }
    },
    down(p) { tap(); }, key(code) { if (code === 'Space') tap(); },
    draw(c) {
      G_.stadium(c, G_.THEMES[o.theme || 'home'], S.trust, App.t, 0.1);
      const a = G.act; const go = acts[acts.length - 1]; const committed = G.t >= go.t;
      const pf = committed ? (G.t - go.t < 0.25 ? 'lift' : G.t - go.t < 0.45 ? 'stride' : 'rel') : a && a.kind === 'pick' ? (G.t - a.t < 0.3 ? 'set' : 'stride') : 'set';
      c.drawImage(G_.pitcherSprite(pf, o.opp), 148, 57);
      if (a && a.kind === 'look') { G_.icon(c, 'eye', 156, 46); text(c, '…', 172, 44, { f: 's', col: P.w2 }); }
      if (a && a.kind === 'pick' && G.t - a.t > 0.3) { const u = Math.min(1, (G.t - a.t - 0.3) / 0.4); drawBall(c, 160 + (246 - 160) * u, 72 + (98 - 72) * u, 1.4); text(c, '견제!', 200, 60, { f: 'b', col: P.r4, out: P.n0 }); }
      if (committed && G.t - go.t < 0.5) { const k = 1 - (G.t - go.t) / 0.5; c.save(); c.globalAlpha = k; text(c, '!', 172, 46, { f: 'b', col: P.y3, sc: 2, out: P.r0 }); c.restore(); }
      // 1루수 / 나
      c.drawImage(G_.pitcherSprite('idle', o.opp), 255 - 12, 104 - 24);
      const u = G.run; const rx = 246 + (160 - 246) * u, ry = 102 + (70 - 102) * u; c.drawImage(G_.pitcherSprite(G.phase === 'running' ? 'stride' : 'idle', 'KIA'), Math.round(rx - 12), Math.round(ry - 24)); text(c, '나', rx, ry - 30, { f: 's', col: P.y3, a: 'c', out: P.n0 });
      if (G.phase === 'running') { const v = Math.min(1, u * 1.3); drawBall(c, 160, 136 + (70 - 136) * v, 1.6); }
      G_.panel(c, 4, 4, 118, 27, { bg: P.n1, br: P.n3 }); text(c, '도루 · 1루 주자', 10, 7, { f: 's', col: P.y3 }); text(c, `주력 ${st.spd}`, 10, 18, { f: 's', col: P.w2 });
      if (G.phase === 'live') { text(c, '다리 들면 탭! 고개만 돌릴 땐 참기', 160, 124, { f: 'b', col: P.w4, a: 'c', out: P.n0 }); }
      drawMsg(c, G.msg);
    },
  };
};
