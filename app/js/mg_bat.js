'use strict';
// ============================================================================
// mg_bat.js — 타격 미니게임 (한 타석 / 홈런 더비)
// 타이밍만: 아무 데나 탭하면 스윙. 컨택=타이밍 판정 폭, 파워=장타·홈런, 선구=볼 미리 보임(파란 테두리)
// 존 밖 공을 치면 빗맞기 쉬움. 에이스=공 빠름·무브 큼·판정 폭 좁음. 퍼펙트(존 안 + 타이밍 정중앙) = 무조건 안타
// ============================================================================
Scenes.bat = (o) => {
  const S = App.S, derby = !!o.derby, st = o.stats || K.effStats(S), ace = o.ace ? 1 : 0, tac = o.tactic || S.tactic; App.curAce = ace;
  const lefty = S.me.hand === 'L';
  const ZONE = { x0: 149, x1: 171, y0: 92, y1: 118 }, REL = { x: 160, y: 69 };
  const CONTACT_T = 0.92, LEAD = 0.085;
  const TB = window.BAL_BAT || { perf: 0.02, good: 0.11, good_hit: 0.62, qExp: 1.8, mid: 0.2, midFoul: 0.34, bloop: 0.05, weakFoul: 0.47, outZone: 0.5 };
  const WIN = (S.easy ? 1.25 : 1) * (0.65 + 0.7 * st.con / 99) * (1 - 0.18 * ace) * (tac === 'fullswing' ? 0.85 : 1) * (derby ? 1.15 : 1);
  const PERF = TB.perf * WIN * WIN, GOOD = TB.good * WIN;
  const PT = [{ n: '직구', kmh: 146, dur: 0.64, brk: 0, drop: 0 }, { n: '슬라이더', kmh: 133, dur: 0.72, brk: 9, drop: 2 }, { n: '커브', kmh: 119, dur: 0.84, brk: -4, drop: 9 }, { n: '포크', kmh: 131, dur: 0.74, brk: 0, drop: 10 }];
  const FIELD = [[70, 64], [160, 61], [250, 64], [120, 76], [200, 76], [84, 96], [236, 96]];
  const sit = o.sit || { inn: 9, top: false, outs: 0, bases: [false, false, false], kia: 0, opp: 0 };
  const G = { phase: 'ready', pt: 0, b: 0, s: 0, ball: null, swing: -1, swingCur: null, swingBallT: 0, bunt: false, msg: null, freeze: 0, slow: 0, burst: null, trail: [], hit: null, fw: [], res: null, endT: 0, pitchN: 0, hr: 0, last: null,
    fielders: FIELD.map(([x, y]) => ({ x, y, hx: x, hy: y, run: 0 })) };
  const R = Math.random;
  const eyeLead = () => (0.12 + 0.33 * st.eye / 99) * (tac === 'eye' ? 2 : 1);
  function say(txt, col, big, sub) { G.msg = { txt, col, big, sub, t: 0 }; }
  function newPitch() {
    G.pitchN++; let p = derby ? PT[0] : PT[(R() * 4) | 0]; const sp = ace ? 1.12 : 1;
    p = { ...p, dur: p.dur / sp * (derby ? 1.08 : 1), kmh: Math.round(p.kmh * (ace ? 1.05 : 1)), brk: p.brk * (ace ? 1.3 : 1), drop: p.drop * (ace ? 1.3 : 1) };
    let tx, ty; const inZ = derby || R() < 0.58;
    if (inZ) { tx = ZONE.x0 + 2 + R() * (ZONE.x1 - ZONE.x0 - 4); ty = ZONE.y0 + 2 + R() * (ZONE.y1 - ZONE.y0 - 4); if (derby) { tx = 160 + (R() - 0.5) * 12; ty = 104 + (R() - 0.5) * 12; } }
    else { const side = (R() * 4) | 0; tx = side === 0 ? ZONE.x0 - 4 - R() * 10 : side === 1 ? ZONE.x1 + 4 + R() * 10 : 152 + R() * 16; ty = side === 2 ? ZONE.y0 - 4 - R() * 8 : side === 3 ? ZONE.y1 + 4 + R() * 10 : ZONE.y0 + R() * 26; }
    G.ball = { p, t: 0, tx, ty, x: REL.x, y: REL.y, r: 0.6, inZone: tx >= ZONE.x0 - 1 && tx <= ZONE.x1 + 1 && ty >= ZONE.y0 - 1 && ty <= ZONE.y1 + 1, judged: 0 };
    G.last = p;
    if (window.BOT) window.BOT.plan = { dt: (R() - 0.5) * 2 * BOT.jt, take: !G.ball.inZone && R() < BOT.eye };
  }
  function ballPos(b, t) { const u = Math.min(t, 1.15); const x = REL.x + (b.tx - b.p.brk - REL.x) * u + b.p.brk * u * u * u; const y = REL.y + (b.ty - b.p.drop - REL.y) * u + b.p.drop * u * u * u - Math.sin(u * Math.PI) * 4; return { x, y, r: 0.6 + 2.6 * u * u }; }
  function trySwing() { if (G.phase !== 'pitch' || G.bunt || G.swing >= 0 || !G.ball || G.ball.t > 1.02) return; G.swing = 0; G.swingBallT = G.ball.t; Sound.play('swing'); }
  function tryBunt() { if (derby) return; if (!['ready', 'windup', 'pitch'].includes(G.phase) || G.swing >= 0 || (G.ball && G.ball.t > 0.75)) return; G.bunt = !G.bunt; Sound.play('click'); }
  function judge() {
    const b = G.ball; if (G.swing < 0) return null;
    const ideal = CONTACT_T - LEAD / b.p.dur; const err = (G.swingBallT - ideal) * b.p.dur; const pow = st.pow / 99; const ae = Math.abs(err);
    G.timing = ae <= PERF ? '저스트!' : err < 0 ? (ae > GOOD ? '너무 빨랐다' : '조금 빨랐다') : (ae > GOOD ? '너무 늦었다' : '조금 늦었다');
    if (ae <= PERF && b.inZone) {
      const hrP = (0.05 + 0.38 * pow * (1 - 0.35 * ace)) * (tac === 'fullswing' ? 1.5 : 1) * (derby ? 1.35 : 1);
      const r = R(); return { type: r < hrP ? 'HR' : r < hrP + 0.3 ? '2B' : r < hrP + 0.33 ? '3B' : '1B', q: 0.95, err, perfect: 1 };
    }
    if (ae > GOOD) return { type: 'miss' };
    const q = Math.pow(1 - ae / GOOD, TB.qExp) * (b.inZone ? 1 : TB.outZone) * (1 - 0.2 * ace); const r = R();
    let type;
    if (q > 0.55) type = r < pow * 0.14 * q * (tac === 'fullswing' ? 1.5 : 1) * (derby ? 1.5 : 1) ? 'HR' : r < TB.good_hit ? (q > 0.75 && R() < 0.35 + 0.3 * pow ? '2B' : '1B') : (R() < 0.5 ? 'FO' : 'GO');
    else if (q > 0.3) type = r < TB.mid ? '1B' : r < TB.mid + TB.midFoul ? 'foul' : (R() < 0.5 ? 'GO' : 'FO');
    else type = r < TB.bloop ? '1B' : r < TB.bloop + TB.weakFoul ? 'foul' : (R() < 0.55 ? 'GO' : 'FO');
    return { type, q, err };
  }
  function finish(res, delay = 1.5) { G.res = res; G.phase = 'over'; G.endT = delay; }
  function contact(j) {
    const b = G.ball, q = j.q; const big = j.perfect || j.type === 'HR';
    Sound.play(big ? 'kkang' : q > 0.45 ? 'ttak' : 'tuk', q);
    G.freeze = (0.05 + 0.1 * q) * (big ? 1.4 : 1); shake(1 + 4 * q); App.flash = big ? 0.6 : q > 0.6 ? 0.25 : 0;
    G.burst = { x: b.x, y: b.y, t: App.t, q }; G.trail = [];
    if (j.type === 'foul') { G.hit = { kind: 'foul', x: b.x, y: b.y, vx: (j.err > 0 ? 1 : -1) * 150 * (lefty ? -1 : 1), vy: -110, r: 2, t: 0 }; G.phase = 'foul'; say('파울', P.w2, 1, q < 0.3 ? '빗맞았다' : '아깝다!'); G.ball = null; return; }
    let side = Math.max(-1, Math.min(1, -j.err * 11)); if (lefty) side = -side;
    const hr = j.type === 'HR'; const ty = { HR: 26, '3B': 60, '2B': 64, '1B': 78, FO: 66, GO: 92 }[j.type];
    const x1 = 160 - side * (j.type === 'GO' ? 70 : 125) + (R() - 0.5) * 30;
    const dist = hr ? Math.round(110 + 25 * q + R() * 10) : Math.round({ '3B': 100, '2B': 92, '1B': 60, FO: 80, GO: 30 }[j.type] * (0.9 + 0.2 * q));
    G.hit = { kind: j.type, x0: b.x, y0: b.y, x: b.x, y: b.y, x1, y1: ty, arc: hr ? 46 : j.type === 'GO' ? 4 : 30, dur: hr ? 1.4 : j.type === 'GO' ? 0.7 : 0.95, t: 0, r: 2.6, dist, perfect: j.perfect, q };
    if (!hr) { let bi = 0, bd = 1e9; G.fielders.forEach((f, i) => { const dd = Math.hypot(f.x - x1, f.y - ty); if (dd < bd) { bd = dd; bi = i; } }); G.hit.fi = bi; }
    if (hr) G.slow = 0.55;
    say(j.perfect ? 'PERFECT!' : q > 0.55 ? '잘 맞았다!' : '맞았다', P.y3, 2, j.perfect ? '저스트 미트' : '');
    G.ball = null; G.phase = 'fly'; G.pt = 0; G.lastJ = j;
  }
  function buntContact() {
    const b = G.ball; Sound.play('tuk'); G.freeze = 0.05; shake(1); G.burst = { x: b.x, y: b.y, t: App.t, q: 0.15 };
    const hitP = (0.15 + 0.35 * st.spd / 99) * (tac === 'bunt' ? 1.5 : 1);
    const res = R() < hitP ? 'BH' : sit.bases.some(Boolean) ? 'SAC' : 'GO';
    G.hit = { kind: 'bunt', x0: b.x, y0: b.y, x: b.x, y: b.y, x1: 160 + (R() < 0.5 ? -40 : 40), y1: 112, t: 0, r: 1.3, res };
    G.ball = null; G.phase = 'buntroll'; G.pt = 0; say(res === 'BH' ? '번트 안타!' : res === 'SAC' ? '희생 번트' : '번트 아웃', res === 'GO' ? P.n6 : P.y3, 2);
  }
  function derbyNext(isHR) { if (isHR) G.hr++; if (G.pitchN >= 10) { G.phase = 'over'; G.endT = 1.6; G.res = { derby: G.hr }; say(`홈런 ${G.hr}개!`, P.y3, 3); } else { G.phase = 'ready'; G.pt = 0; } }
  const self = {
    update(dt) {
      G.pt += 0; if (G.msg) G.msg.t += dt;
      if (G.freeze > 0) { G.freeze -= dt; return; }
      if (G.slow > 0) { G.slow -= dt; dt *= 0.35; }
      if (App.test) dt *= 1;
      G.pt += dt; if (G.swing >= 0) G.swing += dt;
      if (window.BOT && G.phase === 'pitch' && G.ball && G.swing < 0 && !G.bunt) { const b = G.ball, pl = BOT.plan; if (!pl.take && b.t >= CONTACT_T - LEAD / b.p.dur + pl.dt / b.p.dur) trySwing(); }
      if (G.phase === 'ready' && G.pt > (G.pitchN ? 0.5 : 0.9)) { G.phase = 'windup'; G.pt = 0; }
      else if (G.phase === 'windup' && G.pt > 0.62) { G.phase = 'pitch'; G.pt = 0; newPitch(); }
      else if (G.phase === 'pitch') {
        const b = G.ball; b.t += dt / b.p.dur; const q = ballPos(b, b.t); b.x = q.x; b.y = q.y; b.r = q.r; G.trail.push({ x: b.x, y: b.y }); if (G.trail.length > 6) G.trail.shift();
        if (G.bunt && !b.judged && b.t >= CONTACT_T) { b.judged = 1; if (b.inZone ? R() < (tac === 'bunt' ? 0.95 : 0.8) : R() < (tac === 'bunt' ? 0.6 : 0.3)) { buntContact(); return; } }
        if (!b.judged && b.t >= CONTACT_T) { const j = judge(); if (j && j.type !== 'miss') { b.judged = 1; contact(j); return; } if (j) b.judged = 1; }
        if (b.t >= 1.08) {
          Sound.play('mitt'); G.ball = null; G.trail = []; const swung = G.swing >= 0 || G.bunt;
          if (derby) { say(swung ? '헛스윙' : '…', P.w1, 1); G.phase = 'result'; G.pt = 0; G.derbyMiss = 1; }
          else if (swung || b.inZone) { G.s++; say(G.s >= 3 ? '삼진' : '스트라이크', P.r4, G.s >= 3 ? 2 : 1, G.bunt ? '번트 실패' : swung ? '헛스윙' : '루킹'); shake(1); G.phase = 'result'; G.pt = 0; }
          else { G.b++; say(G.b >= 4 ? '볼넷!' : '볼', G.b >= 4 ? P.y3 : P.w4, G.b >= 4 ? 2 : 1, '잘 골랐다'); G.phase = 'result'; G.pt = 0; }
          G.bunt = false;
        }
      }
      else if (G.phase === 'result' && G.pt > 0.75) {
        G.swing = -1; G.msg = null;
        if (derby) { G.derbyMiss = 0; derbyNext(false); }
        else if (G.s >= 3) { finish({ res: 'K' }, 0.4); say('삼진', P.dn, 2); }
        else if (G.b >= 4) { finish({ res: 'BB' }, 0.4); say('볼넷 출루', P.y3, 2); }
        else { G.phase = 'ready'; G.pt = 0; }
      }
      else if (G.phase === 'foul') { const h = G.hit; h.t += dt; h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 90 * dt; h.r = Math.max(0.6, h.r - dt * 2); if (h.t > 0.8) { G.hit = null; if (!derby && G.s < 2) G.s++; G.swing = -1; if (derby) derbyNext(false); else { G.phase = 'ready'; G.pt = 0; G.msg = null; } } }
      else if (G.phase === 'buntroll') { const h = G.hit; h.t += dt; const u = Math.min(1, h.t / 1.1), e = 1 - Math.pow(1 - u, 2); h.x = h.x0 + (h.x1 - h.x0) * e; h.y = h.y0 + (h.y1 - h.y0) * e - Math.abs(Math.sin(u * 9)) * 2 * (1 - u); if (h.t > 1.5) { finish({ res: h.res, q: 0.2 }, 0.6); } }
      else if (G.phase === 'fly') {
        const h = G.hit; h.t += dt; const u = Math.min(1, h.t / h.dur);
        h.x = h.x0 + (h.x1 - h.x0) * u; h.y = h.y0 + (h.y1 - h.y0) * u - Math.sin(u * Math.PI) * h.arc; h.r = Math.max(0.6, 2.6 * (1 - u) + 0.6);
        G.trail.push({ x: h.x, y: h.y }); if (G.trail.length > (h.kind === 'HR' ? 22 : 12)) G.trail.shift();
        if (h.fi != null) { const f = G.fielders[h.fi]; f.run = 1; const k = h.kind === 'FO' || h.kind === 'GO' ? 2.2 : 1.1; f.x += (h.x1 - f.x) * Math.min(1, dt * k); f.y += (h.y1 - f.y) * Math.min(1, dt * k); }
        if (u >= 1 && !h.landed) {
          h.landed = 1; const k = h.kind;
          if (k === 'HR') { App.flash = 0.8; shake(5); say('홈런!!', P.y3, 3, `비거리 ${h.dist}m`); Sound.play('roar'); for (let i = 0; i < 18; i++) G.fw.push({ x: 30 + R() * 260, y: 8 + R() * 40, t: -i * 0.12, c: [P.y3, P.r3, P.w4, P.dn][i % 4] }); }
          else if (k === 'FO' || k === 'GO') { say(k === 'FO' ? '잡혔다' : '땅볼 아웃', P.n6, 2, k === 'FO' ? '플라이 아웃' : ''); Sound.play('mitt'); }
          else { say({ '1B': '안타!', '2B': '2루타!', '3B': '3루타!' }[k], P.y3, 2, `타구 ${h.dist}m`); Sound.play('crowd'); }
        }
        if (h.landed && h.t > h.dur + (h.kind === 'HR' ? 1.6 : 0.9)) {
          G.hit = null; G.trail = []; G.slow = 0; G.fielders.forEach(f => { f.x = f.hx; f.y = f.hy; f.run = 0; });
          if (derby) { G.swing = -1; derbyNext(h.kind === 'HR'); } else finish({ res: h.kind, perfect: !!h.perfect, q: h.q }, 0.2);
        }
      }
      else if (G.phase === 'over') { G.endT -= dt; if (G.endT <= 0 && !G.ended) { G.ended = 1; if (derby) o.onEnd(G.hr); else o.onEnd(G.res); } }
      G.fielders.forEach(f => { if (!f.run) { f.x += (f.hx - f.x) * dt * 2; f.y += (f.hy - f.y) * dt * 2; } });
      G.fw.forEach(f => f.t += dt); G.fw = G.fw.filter(f => f.t < 1.4);
    },
    down(p) { trySwing(); },   // 화면 아무 데나 탭 = 스윙 (번트 버튼 제외)
    key(code) { if (code === 'Space') trySwing(); if (code === 'KeyB') tryBunt(); },
    draw(c) {
      G_.stadium(c, G_.THEMES[o.theme || 'home'], o.trust != null ? o.trust : S.trust, App.t, G.hit && G.hit.kind === 'HR' ? 1 : 0.1, (c2, x, y, w, h) => {
        if (derby) { text(c2, `HR ${G.hr}`, x + w / 2, y + 2, { f: 'b', col: P.y3, a: 'c' }); text(c2, `${Math.max(0, 10 - G.pitchN)}구 남음`, x + w / 2, y + 12, { f: 's', col: P.y2, a: 'c' }); }
        else { text(c2, 'KIA', x + 3, y + 1, { f: 's', col: P.r4 }); text(c2, sit.kia, x + 34, y + 1, { f: 's', col: P.y3, a: 'r' }); text(c2, K.TEAMS[o.opp || 'LG'].name, x + 3, y + 11, { f: 's', col: P.w2 }); text(c2, sit.opp, x + 34, y + 11, { f: 's', col: P.y3, a: 'r' }); text(c2, G.last ? G.last.kmh + 'km' : '', x + w - 3, y + 6, { f: 's', col: P.y3, a: 'r' }); }
      });
      // 불꽃
      G.fw.forEach(f => { if (f.t < 0) return; const r = f.t * 24; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; const x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r + f.t * f.t * 8; rect(c, x, y, 1, 1, f.t > 1 ? P.w1 : f.c); } });
      // 수비수
      const opp = o.opp || 'LG';
      G.fielders.forEach(f => c.drawImage(G_.pitcherSprite('idle', opp), Math.round(f.x - 12), Math.round(f.y - 24)));
      let pf = 'set'; if (G.phase === 'windup') pf = G.pt < 0.25 ? 'set' : G.pt < 0.45 ? 'lift' : 'stride'; else if (G.phase === 'pitch' && G.ball && G.ball.t < 0.3) pf = 'rel'; else if (G.phase === 'pitch') pf = 'fol';
      c.drawImage(G_.pitcherSprite(pf, opp), 148, 57);
      // 스트라이크 존
      if (['ready', 'windup', 'pitch'].includes(G.phase)) { c.save(); c.globalAlpha = 0.5; const z = ZONE; rect(c, z.x0, z.y0, z.x1 - z.x0, 1, P.w4); rect(c, z.x0, z.y1, z.x1 - z.x0 + 1, 1, P.w4); rect(c, z.x0, z.y0, 1, z.y1 - z.y0, P.w4); rect(c, z.x1, z.y0, 1, z.y1 - z.y0, P.w4); c.restore(); for (const [cx, cy] of [[z => z.x0, z => z.y0]]) { } }
      G.trail.forEach((p, i) => { c.save(); c.globalAlpha = (i + 1) / G.trail.length * 0.45; rect(c, p.x, p.y, 2, 2, P.w4); c.restore(); });
      const b = G.ball; const behind = b && b.t < 0.97;
      if (b && behind) drawBall(c, b.x, b.y, b.r, !b.inZone && b.t >= 1 - eyeLead() && !derby);
      // 타자
      const fr = batterFrame(); const sp = G_.batterSprite(fr, look(S));
      if (lefty) { c.save(); c.translate(LW, 0); c.scale(-1, 1); c.drawImage(sp, (LW - 188) - G_.BAX, 147 - G_.BAY); c.restore(); } else c.drawImage(sp, 132 - G_.BAX, 147 - G_.BAY);
      if (b && !behind) drawBall(c, b.x, b.y, b.r, !b.inZone && b.t >= 1 - eyeLead() && !derby);
      if (G.hit) drawBall(c, G.hit.x, G.hit.y, G.hit.r);
      // 스윙 타이밍 피드백
      if (G.timing && G.swing >= 0 && G.swing < 0.9) { const good = G.timing === '저스트!'; text(c, G.timing, 160, 124, { f: 'b', col: good ? P.y3 : P.w2, a: 'c', out: P.n0 }); }
      if (G.phase === 'ready' || G.phase === 'windup') G.timing = null;
      if (G.burst) { const k = (App.t - G.burst.t) / 0.35; if (k < 1) drawBurst(c, G.burst.x, G.burst.y, k, G.burst.q); else G.burst = null; }
      // HUD
      if (!derby) {
        G_.panel(c, 4, 4, 92, 36, { bg: P.n1, br: P.n3 });
        text(c, `${sit.inn}회${sit.top ? '초' : '말'} ${sit.outs}아웃`, 9, 7, { f: 's', col: P.w3 });
        [['B', G.b, 3, P.ok], ['S', G.s, 2, P.y3]].forEach(([l, n, m, col], i) => { const y = 21 + i * 9; text(c, l, 9, y - 3, { f: 's', col: P.w2 }); for (let k = 0; k < m; k++) G_.disc(c, 21 + k * 7, y + 2, 2, k < n ? col : P.n3); });
        G_.bases(c, 78, 26, sit.bases, 6);
      }
      // 능력치 칩 + 조작 안내
      rect(c, 0, 138, 92, 10, 'rgba(10,14,36,0.7)'); text(c, `컨택${st.con} 파워${st.pow} 선구${st.eye}`, 3, 138, { f: 's', col: P.w2 });
      if (G.pitchN <= 1 && !derby && ['ready', 'windup'].includes(G.phase)) text(c, '아무 데나 탭 = 스윙 · 파란 테두리 공은 볼', 196, 126, { f: 's', col: P.w4, a: 'c', out: P.n0 });
      if (G.last && ['pitch', 'result', 'fly', 'foul'].includes(G.phase)) text(c, G.last.n, 316, 44, { f: 's', col: P.w2, a: 'r' });
      // 버튼
      const sw = G.swing >= 0 && G.swing < 0.2; G_.ell(c, 287, 120 + (sw ? 1 : 0), 22, 20, G_.PAL.red); text(c, '스윙', 287, 114 + (sw ? 1 : 0), { f: 'b', col: P.w4, a: 'c', out: P.r0 });
      if (!derby) btn(c, 'bunt', 262, 62, 52, 16, G.bunt ? '번트 중' : '번트', tryBunt, { kind: G.bunt ? 'gold' : 'navy', f: 's', instant: true });
      if (window.BOT && BOT.bunt && G.phase === 'windup' && !G.bunt) tryBunt();
      // 메시지
      drawMsg(c, G.msg);
    },
  };
  function batterFrame() { if (G.bunt && ['windup', 'pitch', 'buntroll'].includes(G.phase)) return 'bunt'; if (G.phase === 'buntroll') return 'bunt'; if (G.swing >= 0) { const s = G.swing; return s < 0.035 ? 'sw1' : s < 0.08 ? 'sw2' : s < 0.16 ? 'sw3' : s < 0.42 ? 'sw4' : 'idle0'; } if (G.phase === 'windup' && G.pt > 0.3) return 'load'; if (G.phase === 'over' && G.res && ['HR'].includes(G.res.res)) return 'joy'; return (App.t * 1.6 | 0) % 2 ? 'idle0' : 'idle1'; }
  return self;
};
function drawBall(c, x, y, r, ballHint) {
  x = Math.round(x); y = Math.round(y); const R_ = Math.max(1, Math.round(r));
  if (ballHint) { G_.disc(c, x, y, R_ + 2, P.dn); }
  if (R_ <= 1) { rect(c, x, y, 2, 2, P.w4); return; }
  G_.disc(c, x, y, R_, ballHint ? '#2a6ad0' : '#7f86a6'); G_.disc(c, x, y, Math.max(1, R_ - 1), '#dfe3f0'); G_.disc(c, x - 1, y - 1, Math.max(0, R_ - 2), P.w4);
  if (R_ >= 2) { px(c, x - R_ + 1, y, P.r2); px(c, x + R_ - 1, y - 1, P.r2); }
}
function drawBurst(c, x, y, k, q) { const n = 8 + Math.round(q * 8), R_ = 6 + q * 20; c.save(); c.globalAlpha = 1 - k; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + q; const r0 = R_ * k * 0.3, r1 = R_ * (0.4 + k * 0.8) * (i % 2 ? 0.6 : 1); for (let s = r0; s < r1; s++) rect(c, x + Math.cos(a) * s, y + Math.sin(a) * s, i % 2 ? 1 : 2, i % 2 ? 1 : 2, s < r0 + (r1 - r0) * 0.5 ? P.c4 : P.y3); } G_.disc(c, x, y, Math.max(1, Math.round(R_ * 0.35 * (1 - k))), P.w4); c.restore(); }
function drawMsg(c, m) {
  if (!m) return; const a = Math.min(1, m.t / 0.12); const sc = m.big >= 3 ? 3 : m.big >= 2 ? 2 : 1; const y = 46;
  const h = 14 * sc; c.save(); c.globalAlpha = 0.72 * a; rect(c, 0, y - 3, LW, h + 6 + (m.sub ? 11 : 0), P.n1); c.restore(); rect(c, 0, y - 3, LW, 1, P.n4);
  text(c, m.txt, 160, y, { f: 'b', col: m.col || P.w4, a: 'c', sc, out: P.n0 }); if (m.sub && a >= 1) text(c, m.sub, 160, y + h + 1, { f: 's', col: P.w3, a: 'c' });
}
window.drawMsg = drawMsg; window.drawBall = drawBall;
