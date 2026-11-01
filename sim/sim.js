// 시뮬 v2 — 게임과 같은 core.js로 시즌 N번 돌림. node sim/sim.js [N]
const K = require('../app/js/core.js');
const N = +process.argv[2] || 1000;
const SKILL = { strong: 0.75, avg: 0.5, weak: 0.25 };

// 미니게임 봇: 기존 sim_batter.p_succ 모델 (퍼펙트=무조건 성공)
function pSucc(kind, st, skill, ace, cheer) {
  const stat = { bat: K.batOvr({ st }), fld: st.def, run: st.spd, steal: st.spd }[kind] / 99;
  const perfect = 0.06 + 0.22 * skill;
  const base = 0.14 + 0.32 * skill + 0.22 * stat - (ace ? 0.10 : 0);
  return perfect + (1 - perfect) * Math.max(0.03, Math.min(0.9, base)) + (cheer || 0);
}
// 실측 미니게임 성공률 (tools/calib.py, 봇 실력 x 능력치 35/60/85). 그 사이는 선형 보간
const MEAS = {
  bat: { weak: [0.33, 0.33, 0.45], avg: [0.45, 0.6, 0.64], strong: [0.69, 0.72, 0.8], ace: 0.15 },   // v1.1 타이밍만
  fld: { weak: [0.61, 0.74, 0.75], avg: [0.95, 0.98, 0.99], strong: [0.99, 1.0, 1.0], ace: 0.08 },   // v1.3 탭 이동·카메라 고정 (사람은 이보다 낮을 것으로 보고 약간 깎음)
  run: { weak: [0.15, 0.35, 0.42], avg: [0.38, 0.42, 0.50], strong: [0.95, 0.95, 0.95], ace: 0.0 },
  steal: { weak: [0.30, 0.38, 0.57], avg: [0.50, 0.57, 0.70], strong: [0.72, 0.80, 0.92], ace: 0.2 },
};
function pMeas(kind, st, skillName, ace, cheer) {
  const stat = { bat: K.batOvr({ st }), fld: st.def, run: st.spd, steal: st.spd }[kind]; const t = MEAS[kind][skillName];
  const v = stat <= 60 ? t[0] + (t[1] - t[0]) * Math.max(0, (stat - 35) / 25) : t[1] + (t[2] - t[1]) * Math.min(1, (stat - 60) / 25);
  return Math.min(0.99, v - (ace ? MEAS[kind].ace : 0) + (cheer || 0));
}
const MODEL = process.env.MODEL || 'meas';
function makeBot(S, R, skill, auto, skillName) {
  return c => {
    const st = K.effStats(S);
    const ok = R() < (auto ? 0.12 : MODEL === 'meas' ? pMeas(c.kind, st, skillName, c.ace, c.cheer) : pSucc(c.kind, st, skill, c.ace, c.cheer));
    if (c.kind === 'bat') {
      if (ok) { const hr = 0.05 + 0.25 * st.pow / 99 * (S.tactic === 'fullswing' ? 1.5 : 1); return { res: K.wpick(R, ['HR', '2B', 'BB', '1B'], [hr, 0.2, 0.15, 0.6 - hr]) }; }
      return { res: K.wpick(R, ['K', 'GO', 'FO'], [0.35, 0.35, 0.3]) };
    }
    if (c.kind === 'fld') return { res: ok ? 'out' : 'hit', dive: ok && R() < 0.2 };
    if (c.kind === 'run') return { res: ok ? 'safe' : (R() < (0.3 + skill * 0.5) ? 'hold' : 'out') };
    return { res: ok ? 'safe' : 'out' };
  };
}
const SLOT_BY_TRUST = S => K.recommendSlot(S);
function manage(S, R, strat) {
  if (strat === 'auto') { S.slot = 9; const n = Math.floor(S.tp / 2); for (let i = 0; i < n; i++) K.train(S, K.STATS[i % 5]); S.tp = 0; return; }
  K.coachManage(S, R);
  if (K.canEdit(S, 'slot')) S.slot = strat === 'greedy' ? 4 : SLOT_BY_TRUST(S);
  if (K.canEdit(S, 'rest')) { const t = S.mates.findIndex(m => m.tired); if (t >= 0) K.setRest(S, t); else if (S.me.tired && R() < 0.5) K.setRest(S, 'me'); else K.setRest(S, null); }
  if (K.canEdit(S, 'train')) {
    while (S.tp > 0) {
      if (S.teamTrain < K.BAL.teamTrainCap - 1e-9 && R() < 0.3) { K.train(S, 'team'); continue; }
      const k = K.STATS.slice().sort((a, b) => S.me.st[a] - S.me.st[b])[(R() * 3) | 0]; if (!K.train(S, k)) break;
    }
  }
}
function season(skill, strat, seed) {
  const S = K.newSeason({ seed, name: '나' }); const R = K.rng(S.rs); S.auto = strat === 'auto';
  const sk = SKILL[skill] ?? 0.5; const bot = makeBot(S, R, sk, S.auto, skill === 'auto' ? 'avg' : skill);
  const T = []; let clN = 0, lockG = 0;
  const playOne = (fx, post) => {
    if (!S.auto) S.tactic = K.drawCards(S, R, 'tactic')[(R() * 3) | 0].id;
    const M = new K.Match(S, R, { fixture: fx, post });
    K.playAuto(M, bot); clN += M.my.cl.length;
    // 시간: 반이닝 약 1.1초(빨리감기) + 승부처(타격30/수비20/주루18 + 배너3) + 브리핑10 + 결과12 + 관리25
    const halves = M.line.kia.length + M.line.opp.length;
    const t = 10 + halves * 1.1 + M.my.cl.reduce((a, c) => a + 3 + ({ bat: 25, fld: 20, run: 18, steal: 15 }[c.kind]), 0) + 12 + (S.auto ? 0 : 25);
    T.push(t);
    if (post && post.round === 'ks') { S.post.ks.cl += M.my.cl.length; S.post.ks.ok += M.my.cl.filter(c => c.ok).length; }
    const out = K.finishGame(S, M, R);
    if (!S.auto) { const cs = K.drawCards(S, R, 'reward', M.win); K.applyReward(S, S.trust < 35 ? (cs.find(c => c.id === 'fan') || cs[0]) : cs[(R() * 3) | 0]); }
    return M.win;
  };
  for (let g = 0; g < 18; g++) {
    manage(S, R, strat); if (S.lock) lockG++;
    playOne(S.sched[S.gi]);
    const ev = K.eventAfter(S.gi);
    if (ev === 'event' && !S.auto) { const e = K.pickEvents(S, R)[0]; e.opts[(R() * e.opts.length) | 0].f(S, R); }
    if (ev === 'allstar' && !S.auto) { const hr = Math.round(10 * (0.1 + 0.4 * sk) * (0.6 + 0.8 * S.me.st.pow / 99)); S.flags.derbyHR = hr; S.me.st.pow = Math.min(99, S.me.st.pow + Math.ceil(hr / 2)); S.mates.forEach(m => { m.tired = false; m.consec = 0; }); S.me.tired = false; }
  }
  const P = K.startPost(S); const rank = S.finalRank;
  while (S.post && !S.post.out && !S.post.champion) {
    manage(S, R, strat); S.tp = Math.max(0, S.tp);
    const P = S.post; const w = playOne(K.postFixture(S), { round: P.round });
    K.postResult(S, w);
  }
  S.ending = K.ending(S);
  return { S, T, rank, champ: !!(S.post && S.post.champion), mvp: K.ksMVP(S), lockG, everLock: S.flags.everLocked, clN, ovr: K.ovr(S.me), win: S.W.KIA, post: rank <= 5 };
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function table(strats, skills) {
  const rows = [];
  for (const strat of strats) for (const sk of skills) {
    const rs = []; for (let i = 0; i < N; i++) rs.push(season(sk, strat, 1000 + i));
    const T = rs.flatMap(r => r.T);
    const games = rs.reduce((a, r) => a + r.T.length, 0);
    rows.push({ strat, sk, win: mean(rs.map(r => r.win)) / 18, post: mean(rs.map(r => r.post)), ks: mean(rs.map(r => r.champ)), mvp: mean(rs.map(r => r.mvp)), lock: mean(rs.map(r => r.everLock)), time: mean(T) / 60, in35: T.filter(t => t >= 180 && t <= 300).length / T.length, cl: rs.reduce((a, r) => a + r.clN, 0) / games, ovr: mean(rs.map(r => r.ovr)), games: games / N });
  }
  return rows;
}
const pct = x => (x * 100).toFixed(0) + '%', pct1 = x => (x * 100).toFixed(1) + '%';
const rows = table(['patient', 'greedy', 'auto'], ['strong', 'avg', 'weak']).filter(r => r.strat !== 'auto' || r.sk === 'avg');
let md = `| 전략 | 실력 | 정규 승률 | 가을야구 | KS우승 | KS MVP | 권한잠김 겪음 | 경기시간 | 3~5분 비율 | 경기당 승부처 | 시즌말 종합 | 시즌 경기수 |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.strat} | ${r.strat === 'auto' ? '-' : r.sk} | ${pct(r.win)} | ${pct(r.post)} | ${pct1(r.ks)} | ${pct1(r.mvp)} | ${pct(r.lock)} | ${r.time.toFixed(1)}분 | ${pct(r.in35)} | ${r.cl.toFixed(1)} | ${r.ovr.toFixed(0)} | ${r.games.toFixed(1)} |\n`;
console.log(md);
if (process.argv[3]) require('fs').writeFileSync(process.argv[3], md);
