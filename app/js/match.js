'use strict';
// ============================================================================
// match.js — 경기 중계 화면 (자동 이닝 + 승부처 진입/복귀)
// ============================================================================
const KIND_KO = { bat: '타격', fld: '수비 위기', run: '홈 쇄도', steal: '도루' };
const HOWTO = {
  bat: '줄어드는 원이 가운데 원에 닿을 때 탭 (노랑 = 저스트).\n파란 테두리 공은 볼. 퍼펙트 타이밍은 무조건 안타.',
  fld: '노란 원을 탭하면 그쪽으로 달려감.\n잡으면 송구 게이지를 초록에서 탭.',
  run: '"지금!"이 뜰 때 GO (3루 근처는 슬로모션).\n위험하면 STOP.',
  steal: '"지금!"이 뜨면 탭 (노란 링 = 퍼펙트).\n일찍 눌러도 괜찮지만 견제구 땐 참기.',
};
function sitText(s) {
  const b = s.bases; const runners = b[0] && b[1] && b[2] ? '만루' : b.some(Boolean) ? [b[0] ? '1' : '', b[1] ? '2' : '', b[2] ? '3' : ''].filter(Boolean).join('·') + '루' : '주자 없음';
  const d = s.kia - s.opp; const sc = d > 0 ? `${d}점 앞섬` : d < 0 ? `${-d}점 뒤짐` : '동점';
  return `${s.inn}회${s.top ? '초' : '말'} ${s.outs}아웃 ${runners} · ${sc}`;
}
window.sitText = sitText;

Scenes.match = (fx, ace) => {
  const S = App.S, R = App.R; let M, init = false;
  const st = { feed: [], timer: 0.8, phase: 'play', clutch: null, flashSide: null, flashT: 0, pop: null, endT: 0, splash: null };
  const theme = () => fx.home ? 'home' : (fx.opp === '키움' ? 'dome' : 'away');
  const say = (txt, o = {}) => { st.feed.push({ txt, t: App.t, ...o }); if (st.feed.length > 6) st.feed.shift(); };
  const speed = () => (App.test ? 8 : 1);
  // 빨리감기 템포 (초): 승부처가 아닌 구간은 전광판만 빠르게
  const TEMPO = { half: 0.15, pa: 0.12, me: 0.4, kiaRun: 0.55, oppRun: 0.4, halfEnd: 0.18 };
  const self = {
    enter() {
      if (!init) {
        init = true; M = new K.Match(S, R, { fixture: fx, ace, post: S.phase === 'post' ? { round: S.post.round } : null }); self.M = M;
        say(`${K.STADIUM[fx.home ? 'KIA' : fx.opp]} 구장, 경기 시작`, { col: P.y3 });
        if (M.ace) say('상대 선발은 에이스', { col: P.r4 });
        if (M.meRest) say(`${S.me.name}, 오늘은 벤치에서 휴식`, { col: P.w1 });
        if (fx.home && S.trust < 20) { say('관중석이 텅 비었다…', { col: P.dn }); Sound.play('boo'); }
        else if (fx.home && S.trust >= 80) { say('만원 관중!', { col: P.up }); Sound.play('crowd'); }
      }
    },
    update(dt) {
      st.flashT = Math.max(0, st.flashT - dt); if (st.pop) { st.pop.t += dt; if (st.pop.t > 0.8) st.pop = null; }
      if (st.splash) { st.splash.t += dt; if (st.splash.t > (App.test ? 0.2 : 1.6)) st.splash = null; else return; }
      if (st.phase === 'clutchIntro') { st.clutch.t += dt; if (App.test && st.clutch.t > 0.2) self.startClutch(); return; }
      if (st.phase === 'end') { st.endT += dt; if (st.endT > (App.test ? 0.3 : 2.2)) { st.phase = 'done'; go(Scenes.result(M)); } return; }
      if (st.phase !== 'play') return;
      st.timer -= dt * speed();
      while (st.timer <= 0 && st.phase === 'play') {
        const e = M.next();
        if (e.type === 'half') { st.timer += TEMPO.half; }
        else if (e.type === 'pa') {
          const kia = e.side === 'kia';
          if (e.runs || e.me || e.res === 'HR') say(e.txt, { col: e.me ? P.y3 : kia ? P.w4 : P.w2, kia });
          if (e.runs) { st.flashSide = e.side; st.flashT = 0.6; st.pop = { side: e.side, n: e.runs, t: 0 }; Sound.play(kia ? (e.res === 'HR' ? 'roar' : 'crowd') : 'tuk'); }
          else if (Math.random() < 0.25) Sound.play('tick');
          st.timer += e.runs ? (kia ? TEMPO.kiaRun : TEMPO.oppRun) : e.me ? TEMPO.me : TEMPO.pa;
          if (e.walkoff) say('끝내기!', { col: P.y3 });
        }
        else if (e.type === 'halfEnd') { st.timer += TEMPO.halfEnd; }
        else if (e.type === 'clutch') { st.phase = 'clutchIntro'; st.clutch = { e, t: 0 }; Sound.play('alarm'); }
        else if (e.type === 'end') { st.phase = 'end'; say(e.win ? '경기 종료! 타이거즈 승리!' : '경기 종료. 타이거즈 패배.', { col: e.win ? P.up : P.dn }); Sound.play(e.win ? 'roar' : 'down'); }
        else break;
      }
    },
    startClutch() {
      const e = st.clutch.e; st.phase = 'mini'; Meta.tutorial[e.kind] = 1; saveMeta();
      const opts = { c: e, S, ace: e.ace, stats: K.effStats(S), tactic: S.tactic, sit: e.sit, opp: fx.opp, home: fx.home, trust: S.trust, theme: theme(),
        onEnd: res => { const ev = M.resolve(res); st.phase = 'play'; st.timer = 0.5; st.clutch = null; say((ev.ok ? '★ ' : '') + ev.txt, { col: ev.ok ? P.y3 : P.dn, kia: 1 }); st.splash = { ok: ev.ok, txt: ev.ok ? '성공!' : '실패…', sub: ev.txt, t: 0, walk: ev.walkoff }; if (ev.ok) Sound.play('roar'); else Sound.play('down'); go(self); } };
      const sc = e.kind === 'bat' ? Scenes.bat(opts) : e.kind === 'fld' ? Scenes.field(opts) : e.kind === 'run' ? Scenes.run(opts) : Scenes.steal(opts);
      go(sc);
    },
    draw(c) {
      const sit = M.sit();
      // 배경: 전광판 + 위쪽 관중(신뢰 = 관중 수)
      rect(c, 0, 0, LW, LH, '#060918');
      G_.crowd(c, 0, 0, LW, 12, 0.12 + 0.85 * Math.min(1, S.trust / 100), App.t, st.flashSide === 'kia' && st.flashT > 0 ? 1 : 0.05, 3);
      rect(c, 0, 12, LW, 1, P.n3);
      for (let y = 14; y < LH; y += 3) for (let x = (y / 3 & 1); x < LW; x += 3) px(c, x, y, '#0e1430');
      // 머리줄
      G_.badge(c, fx.home ? fx.opp : 'KIA', 6, 16, 30, 12); text(c, 'vs', 44, 17, { f: 's', col: P.w1, a: 'c' }); G_.badge(c, fx.home ? 'KIA' : fx.opp, 52, 16, 30, 12);
      text(c, K.STADIUM[fx.home ? 'KIA' : fx.opp] + (M.ace ? ' · 상대 에이스' : ''), 88, 17, { f: 's', col: M.ace ? P.r4 : P.w1 });
      if (st.phase === 'play' && (App.t * 3 | 0) % 2) text(c, '▶▶ 빨리감기', LW - 6, 17, { f: 's', col: P.y2, a: 'r' });
      lineScore(c, 6, 31, M, fx, sit, st);
      // 상황
      G_.panel(c, 6, 82, 96, 32, { bg: P.n1, br: P.n3 });
      text(c, `${sit.inn}회${sit.top ? '초' : '말'}`, 12, 86, { f: 'b', col: P.w4 }); text(c, `${sit.outs}아웃`, 12, 100, { f: 's', col: P.w2 });
      G_.bases(c, 76, 102, sit.bases, 6); for (let i = 0; i < 2; i++) G_.disc(c, 50 + i * 7, 104, 2, i < sit.outs ? P.up : P.n3);
      // 내 승부처
      G_.panel(c, 106, 82, 120, 32, { bg: P.n1, br: P.n3 });
      text(c, M.meRest ? '오늘은 휴식' : '내 승부처', 112, 86, { f: 's', col: P.y3 });
      if (!M.meRest) { let x = 112; M.my.cl.forEach(cl => { G_.icon(c, cl.kind === 'bat' ? 'bat' : cl.kind === 'fld' ? 'glove' : 'shoe', x, 100, cl.ok ? null : [P.n3, P.n4, P.n2]); x += 12; }); const left = Object.keys(M.plan).length; for (let i = 0; i < left; i++) { G_.disc(c, x + 4, 104, 3, P.n3); G_.disc(c, x + 4, 104, 2, P.n1); x += 12; } }
      // 오늘 내 기록
      G_.panel(c, 230, 82, 84, 32, { bg: P.n1, br: P.n3 });
      text(c, S.me.name, 236, 86, { f: 's', col: P.w3 }); const m = M.my; text(c, `${m.ab}타수 ${m.h}안타` + (m.rbi ? ` ${m.rbi}점` : ''), 236, 99, { f: 's', col: P.w4 });
      // 자막
      rect(c, 0, 118, LW, 30, 'rgba(10,14,36,0.92)'); rect(c, 0, 118, LW, 1, P.n4); rect(c, 0, 118, 3, 30, P.r2);
      const f = st.feed.slice(-2); f.forEach((l, i) => { const last = i === f.length - 1; c.save(); c.globalAlpha = last ? Math.min(1, (App.t - l.t) * 8) : 0.5; text(c, l.txt, 8, 121 + i * 13, { f: last ? 'r' : 's', col: l.col || P.w4 }); c.restore(); });
      if (st.flashT > 0 && st.flashSide === 'kia') { c.save(); c.globalAlpha = st.flashT * 0.3; rect(c, 0, 0, LW, LH, P.r3); c.restore(); }
      if (st.phase === 'clutchIntro') clutchIntro(c, st.clutch, () => self.startClutch());
      if (st.splash) { const sp = st.splash; const a = Math.min(1, sp.t * 5); c.save(); c.globalAlpha = 0.85 * a; rect(c, 0, 42, LW, 40, sp.ok ? P.r1 : P.n2); c.restore(); rect(c, 0, 42, LW, 1, sp.ok ? P.y3 : P.n4);
        text(c, sp.walk ? '끝내기!!' : sp.txt, 160, 46, { f: 'b', col: sp.ok ? P.y3 : P.n6, a: 'c', sc: 2, out: sp.ok ? P.r0 : P.n0 }); text(c, sp.sub, 160, 70, { f: 's', col: P.w4, a: 'c' }); }
      if (st.phase === 'end') { c.save(); c.globalAlpha = 0.6; rect(c, 0, 13, LW, 105, P.n0); c.restore(); G_.panel(c, 80, 36, 160, 44, { bg: P.n1, br: M.win ? P.up : P.n4 }); text(c, '경기 종료', 160, 40, { f: 's', col: P.w2, a: 'c' }); text(c, `KIA ${M.score.kia} : ${M.score.opp} ${K.TEAMS[fx.opp].name}`, 160, 53, { f: 'b', col: M.win ? P.y3 : P.w3, a: 'c' }); text(c, M.win ? '승리' : '패배', 160, 67, { f: 's', col: M.win ? P.up : P.dn, a: 'c' }); }
    },
  };
  return self;
};
// 이닝별 득점 전광판 (연장이면 마지막 9이닝)
function lineScore(c, x, y, M, fx, sit, st) {
  const w = 308, h = 48; rect(c, x, y, w, h, P.n0); rect(c, x + 1, y + 1, w - 2, h - 2, '#03050f'); rect(c, x, y, w, 1, P.n3); rect(c, x, y + h - 1, w, 1, P.n3);
  const away = fx.home ? fx.opp : 'KIA', home = fx.home ? 'KIA' : fx.opp; const sideOf = t => t === 'KIA' ? 'kia' : 'opp';
  const nInn = Math.max(9, M.line.kia.length, M.line.opp.length, sit.inn); const first = Math.max(1, nInn - 8);
  const cx = i => x + 50 + (i - first) * 21, rx = x + 246, hx = x + 280;
  for (let i = first; i < first + 9; i++) text(c, i, cx(i) + 9, y + 3, { f: 's', col: i === sit.inn ? P.y3 : P.n5, a: 'c' });
  text(c, 'R', rx + 9, y + 3, { f: 's', col: P.r4, a: 'c' }); text(c, 'H', hx + 9, y + 3, { f: 's', col: P.n5, a: 'c' });
  rect(c, rx - 3, y + 3, 1, h - 6, P.n3);
  [[away, 0], [home, 1]].forEach(([t, r]) => {
    const yy = y + 15 + r * 16; const sd = sideOf(t); const T = K.TEAMS[t];
    rect(c, x + 4, yy, 3, 12, T.c); text(c, T.name, x + 10, yy + 1, { f: 'b', col: t === 'KIA' ? P.w4 : P.w2 });
    const L = M.line[sd]; const cur = M.halfOpen && ((r === 0) === sit.top);
    for (let i = first; i < first + 9; i++) {
      const v = L[i - 1]; const live = cur && i === sit.inn;
      if (live) { rect(c, cx(i), yy - 1, 18, 14, (App.t * 4 | 0) % 2 ? '#1a2350' : '#121a3a'); text(c, M.halfRuns, cx(i) + 9, yy + 1, { f: 'b', col: P.y4, a: 'c' }); }
      else if (v != null) text(c, v, cx(i) + 9, yy + 1, { f: 'b', col: v ? P.y3 : P.y0, a: 'c' });
    }
    const flash = st.flashT > 0 && st.flashSide === sd;
    text(c, M.score[sd], rx + 9, yy + 1, { f: 'b', col: flash ? P.w4 : P.y3, a: 'c' }); text(c, M.hits[sd], hx + 9, yy + 1, { f: 'b', col: P.y1, a: 'c' });
    if (st.pop && st.pop.side === sd) { const k = st.pop.t; c.save(); c.globalAlpha = Math.max(0, 1 - k); text(c, '+' + st.pop.n, rx + 22, yy - 4 - k * 10, { f: 'b', col: sd === 'kia' ? P.up : P.n6, out: P.n0 }); c.restore(); }
  });
}
function scoreBox(c, x, y, M, fx, sit, st) {
  G_.panel(c, x, y, 100, 36, { bg: P.n1, br: P.n3 });
  const away = fx.home ? fx.opp : 'KIA', home = fx.home ? 'KIA' : fx.opp;
  const sc = t => t === 'KIA' ? M.score.kia : M.score.opp;
  [[away, 0], [home, 1]].forEach(([t, i]) => { const yy = y + 4 + i * 14; const T = K.TEAMS[t]; rect(c, x + 4, yy, 3, 11, T.c); text(c, T.name, x + 10, yy, { f: 'b', col: t === 'KIA' ? P.w4 : P.w2 }); const bat = (i === 0) === sit.top; if (bat && M.halfOpen) G_.icon(c, 'ball', x + 40, yy + 1); text(c, sc(t), x + 60, yy, { f: 'b', col: st && st.flashT > 0 && ((t === 'KIA') === (st.flashSide === 'kia')) ? P.y3 : P.w4, a: 'r' }); });
  rect(c, x + 64, y + 3, 1, 30, P.n3);
  text(c, sit.inn + '회', x + 82, y + 3, { f: 's', col: P.w3, a: 'c' }); text(c, sit.top ? '초' : '말', x + 82, y + 12, { f: 's', col: P.w1, a: 'c' });
  G_.bases(c, x + 82, y + 28, sit.bases, 5);
  for (let i = 0; i < 2; i++) G_.disc(c, x + 70 + i * 0, y + 22 + i * 6, 0, P.n1);
  for (let i = 0; i < 2; i++) { G_.disc(c, x + 93, y + 22 + i * 6, 2, i < sit.outs ? P.up : P.n3); }
}
window.scoreBox = scoreBox;
function clutchIntro(c, cl, start) {
  const e = cl.e, t = cl.t; const k = Math.min(1, t * 4);
  c.save(); c.globalAlpha = 0.7 * k; rect(c, 0, 0, LW, LH, P.n0); c.restore();
  const sx = Math.round((1 - k) * -LW);
  rect(c, sx, 22, LW, 34, P.r1); rect(c, sx, 22, LW, 1, P.r3); rect(c, sx, 55, LW, 1, P.r0);
  for (let i = 0; i < 12; i++) rect(c, sx + ((i * 31 + App.t * 120) % (LW + 20)) - 10, 23, 6, 32, 'rgba(255,255,255,0.06)');
  text(c, '승부처!', 160 + sx, 25, { f: 'b', col: P.y3, a: 'c', sc: 2, out: P.r0, sh: P.r0 });
  G_.panel(c, 30, 62, 260, 48, { bg: P.n1, br: P.y2 });
  text(c, KIND_KO[e.kind], 40, 66, { f: 'b', col: P.y3 }); if (e.ace) text(c, '에이스 상대', 282, 67, { f: 's', col: P.r4, a: 'r' }); else if (e.cheer) text(c, '홈 응원 버프', 282, 67, { f: 's', col: P.up, a: 'r' });
  text(c, sitText(e.sit), 40, 80, { f: 's', col: P.w3 });
  G_.textBox(c, HOWTO[e.kind].split('\n')[Meta.tutorial[e.kind] ? 1 : 0] || HOWTO[e.kind], 40, 93, 240, { f: 's', col: P.c2 });
  if ((App.t * 2 | 0) % 2) text(c, '탭해서 시작', 160, 116, { f: 'b', col: P.w4, a: 'c' });
  hit('cstart', 0, 0, LW, LH, () => { if (t > 0.35) start(); });
}
