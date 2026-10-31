'use strict';
// ============================================================================
// core.js — 게임 규칙 전부. 브라우저(게임)와 Node(시뮬)가 같은 파일을 씀.
// 화면/입력 코드 없음. 랜덤은 전부 저장되는 시드 RNG(S.rs)로.
// ============================================================================
(function (root) {
const K = {};

// ---------- RNG ----------
K.rng = st => () => { st.s = (st.s + 0x6D2B79F5) | 0; let t = st.s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = (R, a) => a[(R() * a.length) | 0];
const wpick = (R, items, w) => { let s = w.reduce((a, b) => a + b, 0), r = R() * s; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) return items[i]; } return items[items.length - 1]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
K.pick = pick; K.wpick = wpick; K.clamp = clamp;

// ---------- 밸런스 상수 (시뮬로 튜닝) ----------
const B = K.BAL = {
  kiaBase: 0.44,           // 기아 기본 전력 (화면엔 안 보임)
  mgMax: 0.05,            // 관리 보너스 상한
  teamTrainStep: 0.005, teamTrainCap: 0.03,
  meWeight: 0.03,         // 내 종합능력이 팀 전력에 주는 영향
  parachute4: 0.015,      // 종합 65 미만인데 4번이면 전력 손해
  tiredPen: 0.01,         // 지친 주전 1명 출장당 전력 손해
  tiredChance: 0.12, tiredRecover: 0.25,  // 4연속 출전 후 지칠 확률 / 지친 선수 자연 회복 확률
  benchPen: 0.005,        // 백업 출장 손해
  pOn: 0.31, pOnK: 0.45,  // 자동 타석 출루 확률 = pOn + (공격-수비)*pOnK
  clutchByTier: { 9: [2, 3, 3], 8: [2, 3, 3], 7: [3, 3, 4], 6: [3, 3, 4], 5: [3, 4, 4], 3: [4, 4, 5], 4: [4, 5, 5], 2: [3, 4, 4], 1: [3, 4, 4] },
  clutchMin: 3, clutchMax: 5,
  aceRate: 0.33, postAce: 0.6, postOpp: 0.02,
  tpBase: 2, tpWin: 1, tpHiTrust: 1, tpLoTrust: -1,
  statPerTp: 2,
  cheerBuff: 0.04,
  trust: { start: 50, win: 5, star: 4, care: 2, bad: -8, streak: -4, parachute: -6, unlock: [15, 30, 45] },
  postMatch: { wc: 0.0, semi: 0.0 },
};

// ---------- 팀 ----------
// 상대 구단 전력은 2026 스탯티즈 기반 players_2027.json strength 그대로. 선수 실명은 화면에 안 씀.
K.TEAMS = {
  KIA: { name: 'KIA', str: 0.44, c: '#d8283a', d: '#7a1222' },
  LG: { name: 'LG', str: 0.512, c: '#b0204a', d: '#3a1020' },
  '삼성': { name: '삼성', str: 0.534, c: '#2a6cd0', d: '#123a7a' },
  '두산': { name: '두산', str: 0.517, c: '#3a3f9a', d: '#1a1c50' },
  KT: { name: 'KT', str: 0.55, c: '#4a4a58', d: '#22222c' },
  SSG: { name: 'SSG', str: 0.494, c: '#e8a020', d: '#8a5208' },
  '롯데': { name: '롯데', str: 0.495, c: '#2a58b0', d: '#0f2a60' },
  '한화': { name: '한화', str: 0.496, c: '#f07020', d: '#8a3a08' },
  NC: { name: 'NC', str: 0.493, c: '#3a7ab8', d: '#1a3a5c' },
  '키움': { name: '키움', str: 0.45, c: '#9a2a4a', d: '#4a1020' },
};
K.TEAM_IDS = Object.keys(K.TEAMS);
K.STADIUM = { KIA: '광주', LG: '잠실', '두산': '잠실', '삼성': '대구', KT: '수원', SSG: '인천', '롯데': '사직', '한화': '대전', NC: '창원', '키움': '고척' };

// 기아 동료 (가상 이름. 능력치 분포만 2026 기아 기록을 따름)
K.MATES = [
  { name: '류한결', pos: 'CF', ovr: 72, role: 'spd' },
  { name: '오세진', pos: '2B', ovr: 78, role: 'con' },
  { name: '강태윤', pos: '3B', ovr: 92, role: 'pow' },
  { name: '브래넌', pos: '1B', ovr: 86, role: 'pow' },
  { name: '표재석', pos: 'RF', ovr: 80, role: 'pow' },
  { name: '문지후', pos: 'C', ovr: 70, role: 'eye' },
  { name: '백승호', pos: 'LF', ovr: 66, role: 'con' },
  { name: '서도윤', pos: 'DH', ovr: 62, role: 'pow' },
];
K.BENCH = ['남궁현', '진우람', '하석주', '탁민규'];

K.STATS = ['con', 'pow', 'eye', 'spd', 'def'];
K.STAT_KO = { con: '컨택', pow: '파워', eye: '선구', spd: '주력', def: '수비' };
K.ovr = me => Math.round(K.STATS.reduce((a, k) => a + me.st[k], 0) / 5);
K.batOvr = me => me.st.con * 0.5 + me.st.pow * 0.2 + me.st.eye * 0.3;

// ---------- 새 시즌 ----------
K.newSeason = function (opt) {
  const seed = opt.seed != null ? opt.seed : (Date.now() ^ (Math.random() * 1e9)) | 0;
  const S = {
    v: 1, rs: { s: seed }, seed, easy: !!opt.easy,
    me: { name: opt.name || '구단주', skin: opt.skin || 0, hand: opt.hand || 'R', pos: opt.pos || 'IF', num: opt.num || 1,
      st: { con: 35, pow: 35, eye: 35, spd: 45, def: 40 }, consec: 0, tired: false },
    mates: K.MATES.map(m => ({ ...m, consec: 0, tired: false })),
    trust: B.trust.start, lock: 0, lockGames: 0, tp: 0, teamTrain: 0,
    slot: 9, rest: null, tactic: null, buffs: {},
    gi: 0, phase: 'reg', W: {}, L: {}, log: [], streakL: 0, streakW: 0,
    stats: { g: 0, pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, cl: 0, clOk: 0, walkoff: 0, gw: 0, dive: 0 },
    flags: { parachuteGames: 0, lockedGames: 0, restMe: 0, mulCount: 0, levWin: 0, everLocked: 0, derbyHR: 0 },
    post: null, ending: null, titles: [], headlines: [],
  };
  if (S.me.pos === 'OF') S.mates.find(m => m.pos === 'CF').pos = 'SS';
  K.TEAM_IDS.forEach(t => { S.W[t] = 0; S.L[t] = 0; });
  S.sched = K.makeSchedule(K.rng(S.rs));
  return S;
};

// 10팀 2라운드 로빈(원형법) → 18라운드, 라운드마다 5경기. 6경기=롯데 홈 라이벌, 12경기=LG 원정 라이벌, 1경기=홈 데뷔.
K.makeSchedule = function (R) {
  const ids = K.TEAM_IDS.slice(); const n = ids.length; const rounds = [];
  let arr = ids.slice();
  for (let r = 0; r < n - 1; r++) {
    const g = [];
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; g.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(g);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  const all = rounds.concat(rounds.map(g => g.map(([h, a]) => [a, h])));
  const kiaOf = g => { const p = g.find(x => x.includes('KIA')); return { opp: p[0] === 'KIA' ? p[1] : p[0], home: p[0] === 'KIA' }; };
  const take = f => { const i = all.findIndex(g => f(kiaOf(g))); return all.splice(i, 1)[0]; };
  const r6 = take(k => k.opp === '롯데' && k.home), r12 = take(k => k.opp === 'LG' && !k.home);
  for (let i = all.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
  let fi = all.findIndex(g => kiaOf(g).home && !['롯데', 'LG'].includes(kiaOf(g).opp)); const first = all.splice(fi, 1)[0];
  const seq = [first, ...all]; seq.splice(5, 0, r6); seq.splice(11, 0, r12);
  return seq.map((g, i) => { const k = kiaOf(g); return { ...k, games: g, rival: i === 5 || i === 11 }; });
};

// ---------- 전력 ----------
K.slotPenalty = S => (S.slot === 4 && K.ovr(S.me) < 65 ? B.parachute4 : 0);
K.isParachute = S => S.slot <= 5 && S.slot < K.recommendSlot(S) - (S.slot === 5 ? 0 : 0) && K.recommendSlot(S) - S.slot >= 2;
K.recommendSlot = S => { const o = K.ovr(S.me), t = S.trust; return (t >= 80 && o >= 65) ? 4 : (t >= 70 && o >= 58) ? 3 : (t >= 60 && o >= 52) ? 5 : t >= 50 ? 7 : 9; };
K.mgmt = function (S) { // 관리 보너스 0~0.05
  if (S.auto) return 0;
  let b = 0;
  if (!K.isParachute(S) && S.slot >= K.recommendSlot(S) - 2) b += 0.01;     // 타순 적정
  const tiredPlaying = S.mates.filter((m, i) => m.tired && S.rest !== i).length + (S.me.tired && S.rest !== 'me' ? 1 : 0);
  if (tiredPlaying === 0) b += 0.01;                                        // 지친 주전 없이 출장
  b += S.teamTrain;
  return Math.min(B.mgMax, b);
};
K.kiaStrength = function (S) {
  let s = B.kiaBase + K.mgmt(S) + (K.ovr(S.me) - 50) / 99 * B.meWeight - K.slotPenalty(S);
  s -= S.mates.filter((m, i) => m.tired && S.rest !== i).length * B.tiredPen;
  if (S.rest != null && S.rest !== 'me') s -= B.benchPen;
  if (S.buffs.team) s += S.buffs.team;
  return s;
};
K.oppStrength = (S, opp) => K.TEAMS[opp].str + (S.phase === 'post' ? B.postOpp : 0);
K.aceRate = S => S.phase === 'post' ? B.postAce : B.aceRate;
K.winP = (a, b) => clamp(0.5 + (a - b) * 1.5, 0.1, 0.9);

// 미니게임 난이도용 내 능력치 (작전카드·피로 반영)
K.effStats = function (S) {
  const st = { ...S.me.st };
  if (S.me.tired) K.STATS.forEach(k => st[k] = Math.max(1, st[k] - 6));
  if (S.buffs.stat) K.STATS.forEach(k => st[k] = Math.min(99, st[k] + S.buffs.stat));
  return st;
};

// ============================================================================
// 경기 엔진. next()로 이벤트를 하나씩 뽑음. 승부처에서 {type:'clutch'}를 내고 resolve(결과)로 진행.
// ============================================================================
const POSNAME = { P: '투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수' };
K.POSNAME = POSNAME;
class Match {
  constructor(S, R, o = {}) {
    this.S = S; this.R = R;
    const g = o.fixture || S.sched[S.gi];
    this.opp = g.opp; this.home = g.home; this.rival = !!g.rival; this.post = o.post || null;
    this.ace = o.ace != null ? o.ace : R() < K.aceRate(S);
    this.kiaStr = K.kiaStrength(S); this.oppStr = K.oppStrength(S, this.opp) + (this.ace ? 0.01 : 0);
    this.meRest = S.rest === 'me';
    this.cheer = (this.home && S.trust >= 70) ? B.cheerBuff : 0;
    this.inn = 1; this.top = true; this.outs = 0; this.bases = [null, null, null];
    this.score = { kia: 0, opp: 0 }; this.line = { kia: [], opp: [] }; this.hits = { kia: 0, opp: 0 }; this.halfRuns = 0;
    this.bi = { kia: (S.slot) % 9, opp: 0 };   // 경기 시작 타자: 1번. (bi는 0-index 타순)
    this.bi.kia = 0;
    this.order = K.lineup(S);
    this.queue = []; this.over = false; this.halfOpen = false; this.pending = null; this.awaiting = null;
    this.my = { pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, r: 0, cl: [], gw: false };
    this.moments = []; this.lead = null; this.events = 0;
    this.plan = this.makePlan();
    this.extraDone = false; this.ks = !!(o.post && o.post.round === 'ks');
  }
  makePlan() {
    const R = this.R, S = this.S, plan = {};
    if (this.meRest) return plan;
    let nb = pick(R, B.clutchByTier[S.slot] || [3, 3, 4]);
    if (S.tactic === 'owner') nb++;
    const kinds = [];
    for (let i = 0; i < nb; i++) kinds.push(wpick(R, ['bat', 'fld', 'run'], [0.6, 0.2, 0.2]));
    while (kinds.length < B.clutchMin) kinds.push(R() < 0.5 ? 'fld' : 'run');
    if (S.tactic === 'speed' && kinds.length < B.clutchMax) kinds.push('run');
    const tot = Math.min(B.clutchMax - (S.me.pos === '1B' ? 1 : 0), kinds.length);
    const inns = [1, 2, 3, 4, 5, 6, 7, 8]; for (let i = inns.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [inns[i], inns[j]] = [inns[j], inns[i]]; }
    for (let i = 0; i < tot; i++) { let k = kinds[i]; if (k === 'run') k = R() < 0.5 ? 'run' : 'steal'; plan[inns[i]] = k; }
    return plan;
  }
  kiaBat() { return this.home ? !this.top : this.top; }
  side() { return this.kiaBat() ? 'kia' : 'opp'; }
  get nClutch() { return this.my.cl.length; }
  push(e) { this.queue.push(e); }
  batterName(side) {
    if (side === 'opp') return `${this.bi.opp + 1}번 타자`;
    const p = this.order[this.bi.kia]; return p.me ? this.S.me.name : p.name;
  }
  // 자동 타석 출루 확률
  pOn(side, isMe) {
    const off = side === 'kia' ? this.kiaStr : this.oppStr, def = side === 'kia' ? this.oppStr : this.kiaStr;
    let p = B.pOn + (off - def) * B.pOnK;
    if (isMe) p = 0.22 + 0.16 * K.batOvr(this.S.me) / 99 + (this.ace ? -0.03 : 0);
    return p;
  }
  // ---- 타석 결과 적용(공통) ----
  apply(res, side, name, opt = {}) {
    const R = this.R, b = this.bases; let runs = 0; const runner = opt.runner || (side === 'kia' ? (opt.me ? 'me' : 'k') : 'o');
    const score = n => { runs += n; };
    const scored = [];
    const sc = r => { if (r) { scored.push(r); score(1); } };
    let txt = '', hit = false, onbase = false, out = 0;
    switch (res) {
      case 'BB': onbase = true; txt = `${name}, 볼넷 출루`;
        if (b[0]) { if (b[1]) { if (b[2]) sc(b[2]); b[2] = b[1]; } b[1] = b[0]; } b[0] = runner; break;
      case '1B': hit = onbase = true; txt = pick(R, [`${name}, 중전 안타`, `${name}, 좌전 안타`, `${name}, 우전 안타`, `${name}, 내야 안타`]);
        sc(b[2]); b[2] = null;
        if (b[1]) { if (R() < 0.6 || opt.drive) sc(b[1]); else b[2] = b[1]; b[1] = null; }
        if (b[0]) { if (!b[2] && R() < 0.25) b[2] = b[0]; else b[1] = b[0]; }
        b[0] = runner; break;
      case '2B': hit = onbase = true; txt = pick(R, [`${name}, 좌중간 2루타`, `${name}, 우익선상 2루타`]);
        sc(b[2]); sc(b[1]); b[2] = b[1] = null; if (b[0]) { if (R() < 0.4) sc(b[0]); else b[2] = b[0]; b[0] = null; } b[1] = runner; break;
      case '3B': hit = onbase = true; txt = `${name}, 우중간 3루타!`; b.forEach(sc); b[0] = b[1] = null; b[2] = runner; break;
      case 'HR': hit = onbase = true; { const n = b.filter(Boolean).length; txt = n === 3 ? `${name}, 만루 홈런!!` : n ? `${name}, ${n + 1}점 홈런!` : `${name}, 솔로 홈런!`; }
        b.forEach(sc); b[0] = b[1] = b[2] = null; sc(runner); break;
      case 'K': out = 1; txt = pick(R, [`${name}, 헛스윙 삼진`, `${name}, 루킹 삼진`]); break;
      case 'GO':
        if (b[0] && this.outs < 2 && R() < 0.35) { out = 2; txt = `${name}, 병살타`; b[0] = null; if (b[2] && this.outs === 0) { /* 3루주자 잔류 */ } break; }
        out = 1; txt = pick(R, [`${name}, 유격수 땅볼`, `${name}, 2루수 땅볼`, `${name}, 3루수 땅볼`]);
        if (this.outs < 2) { if (b[2] && R() < 0.4) { sc(b[2]); b[2] = null; } if (b[1] && !b[2]) { b[2] = b[1]; b[1] = null; } if (b[0] && !b[1]) { b[1] = b[0]; b[0] = null; } }
        break;
      case 'FO': out = 1;
        if (b[2] && this.outs < 2 && R() < 0.5) { txt = `${name}, 희생 플라이`; sc(b[2]); b[2] = null; }
        else txt = pick(R, [`${name}, 중견수 뜬공`, `${name}, 좌익수 뜬공`, `${name}, 우익수 뜬공`, `${name}, 내야 뜬공`]);
        break;
      case 'SAC': out = 1; txt = `${name}, 희생 번트 성공`;
        if (b[2]) { sc(b[2]); b[2] = null; } if (b[1]) { b[2] = b[1]; b[1] = null; } if (b[0]) { b[1] = b[0]; b[0] = null; } break;
      case 'BH': hit = onbase = true; txt = `${name}, 기습 번트 안타!`;
        if (b[2]) { sc(b[2]); b[2] = null; } if (b[1]) { b[2] = b[1]; b[1] = null; } if (b[0]) { b[1] = b[0]; } b[0] = runner; break;
    }
    if (out) this.outs += out;
    if (this.outs >= 3 && !['HR'].includes(res)) { /* 3아웃이면 득점 무효(희생플라이/땅볼 제외 처리 단순화) */ if (res === 'GO' || res === 'FO') { if (this.outs >= 3 && runs) { runs = 0; scored.length = 0; } } }
    if (runs) txt += ` (${runs}점)`;
    this.addRuns(side, runs);
    if (hit) this.hits[side]++;
    if (scored.includes('me')) this.my.r++;
    return { txt, runs, hit, onbase, out, res };
  }
  addRuns(side, n) { if (!n) return; this.score[side] += n; this.halfRuns += n; const lead = this.score.kia > this.score.opp ? 'kia' : this.score.kia < this.score.opp ? 'opp' : null; this.lastLeadChange = lead !== this.lead; this.lead = lead; }
  autoPA(side, force) {
    const R = this.R; const isMe = side === 'kia' && this.order[this.bi.kia].me;
    const name = this.batterName(side);
    let p = this.pOn(side, isMe);
    let on = force ? true : R() < p, res;
    if (on) res = isMe ? wpick(R, ['BB', '1B', '2B', '3B', 'HR'], [0.12 + 0.1 * this.S.me.st.eye / 99, 0.6, 0.14, 0.02, 0.03 + 0.12 * this.S.me.st.pow / 99]) : wpick(R, ['BB', '1B', '2B', '3B', 'HR'], [0.2, 0.55, 0.15, 0.02, 0.08]);
    else res = wpick(R, ['K', 'GO', 'FO'], [0.3, 0.4, 0.3]);
    if (force && res === 'BB') res = '1B';
    const r = this.apply(res, side, name, { me: isMe });
    if (isMe) this.tallyMe(res, r.runs, false);
    this.bi[side] = (this.bi[side] + 1) % 9;
    return { type: 'pa', side, txt: r.txt, runs: r.runs, me: isMe, res };
  }
  tallyMe(res, runs, clutch) {
    const m = this.my; m.pa++; if (res !== 'BB' && res !== 'SAC') m.ab++; if (['1B', '2B', '3B', 'HR', 'BH'].includes(res)) m.h++;
    if (res === 'HR') m.hr++; if (res === 'BB') m.bb++; if (res === 'K') m.k++; m.rbi += runs;
  }
  sit() { return { inn: this.inn, top: this.top, outs: this.outs, bases: this.bases.map(Boolean), kia: this.score.kia, opp: this.score.opp, kiaBat: this.kiaBat(), ace: this.ace, home: this.home }; }
  // 9회 추가 승부처
  extraClutch() {
    if (this.extraDone || this.meRest || this.nClutch + Object.keys(this.plan).filter(k => +k >= this.inn).length >= B.clutchMax && !this.ks) return null;
    if (this.inn !== 9) return null;
    const d = this.score.kia - this.score.opp;
    if (this.kiaBat()) { if ((d <= 0 && d >= -2) || (this.ks && d >= -3 && d <= 3)) return 'bat'; }
    else if (d >= 1 && d <= 2) return 'fld';
    return null;
  }
  next() {
    if (this.queue.length) return this.queue.shift();
    if (this.over) return { type: 'end' };
    if (this.awaiting) return { type: 'wait' };
    const R = this.R;
    if (!this.halfOpen) {
      // 9회 이후 말 공격 생략 / 연장 종료
      if (!this.top && this.inn >= 9 && this.score[this.home ? 'kia' : 'opp'] > this.score[this.home ? 'opp' : 'kia']) return this.finish();
      this.halfOpen = true; this.outs = 0; this.bases = [null, null, null]; this.halfRuns = 0;
      this.pending = this.plan[this.inn] && this.inn <= 8 ? this.plan[this.inn] : null;
      if (this.pending && (['bat', 'run', 'steal'].includes(this.pending) !== this.kiaBat())) this.pending = null;
      if (!this.pending) { const x = this.extraClutch(); if (x) { this.pending = x; this.extraDone = true; } }
      if (this.pending) delete this.plan[this.inn];
      this.prePA = this.pending ? (R() * 2) | 0 : 0;
      return { type: 'half', inn: this.inn, top: this.top, kiaBat: this.kiaBat() };
    }
    const side = this.side();
    // ---- 승부처 셋업 ----
    if (this.pending) {
      const k = this.pending, b = this.bases, hasR = b.some(Boolean), risp = b[1] || b[2];
      if (k === 'bat' && (hasR && this.prePA <= 0 || this.outs === 2 && hasR)) return this.openClutch('bat');
      if (k === 'fld' && (risp && this.prePA <= 0 || this.outs === 2 && risp)) return this.openClutch('fld');
      if ((k === 'run' || k === 'steal') && this.outs < 2) {
        // 내가 출루 → (주루면 후속 안타)
        const me = this.S.me.name;
        if (!this.meOn) {
          this.meOn = true; const res = k === 'run' ? '2B' : '1B';
          const r = this.apply(res, 'kia', me, { me: true }); this.tallyMe(res, r.runs, false);
          this.bi.kia = (this.order.findIndex(p => p.me) + 1) % 9;
          return { type: 'pa', side, txt: r.txt, runs: r.runs, me: true, res };
        }
        this.meOn = false;
        if (k === 'steal') { if (this.bases[0] === 'me' && !this.bases[1]) return this.openClutch('steal'); }
        else if (this.bases[1] === 'me' && !this.bases[2]) return this.openClutch('run');
        this.pending = null; // 상황이 안 맞으면 취소(드묾)
      }
      this.prePA--;
      const force = (k === 'bat' && this.outs === 2 && !hasR) || (k === 'fld' && this.outs === 2 && !risp);
      if (force && k === 'fld') { const name = this.batterName('opp'); const r = this.apply('2B', 'opp', name); this.bi.opp = (this.bi.opp + 1) % 9; return { type: 'pa', side, txt: r.txt, runs: r.runs, res: '2B' }; }
      return this.afterPA(this.autoPA(side, force));
    }
    return this.afterPA(this.autoPA(side, false));
  }
  afterPA(ev) {
    if (this.walkoff()) { ev.walkoff = true; this.queue.push(this.finish()); return ev; }
    if (this.outs >= 3) this.queue.push(this.closeHalf());
    return ev;
  }
  walkoff() { return !this.top && this.inn >= 9 && this.score[this.home ? 'kia' : 'opp'] > this.score[this.home ? 'opp' : 'kia']; }
  closeHalf() {
    const side = this.side(); this.line[side].push(this.halfRuns); this.halfOpen = false; this.pending = null; this.meOn = false;
    const ev = { type: 'halfEnd', inn: this.inn, top: this.top, runs: this.halfRuns, side };
    if (this.top) this.top = false; else { this.top = true; this.inn++; }
    if (this.top && this.inn > 9 && this.score.kia !== this.score.opp) { this.queue.push(this.finish()); }
    else if (this.top && this.inn > 15) { this.queue.push(this.finish()); }
    return ev;
  }
  openClutch(kind) {
    this.pending = null; const s = this.S; const R = this.R;
    const c = { type: 'clutch', kind, sit: this.sit(), inn: this.inn, late: this.inn >= 7, ace: this.ace, opp: this.opp, cheer: this.cheer };
    if (kind === 'fld') { c.ball = s.me.pos === 'OF' ? 'fly' : 'grounder'; c.batter = this.batterName('opp'); }
    if (kind === 'bat') { const mi = this.order.findIndex(p => p.me); this.bi.kia = mi; }
    if (kind === 'run') { c.depth = R(); c.arm = R(); }      // 타구 깊이/외야 어깨: 판단 단서
    if (kind === 'steal') { c.feints = (R() * 3) | 0; }
    this.awaiting = c; return c;
  }
  // 승부처 결과 적용. out = {res, perfect, q}
  resolve(out) {
    const c = this.awaiting; this.awaiting = null; const R = this.R; const me = this.S.me.name; let ok = false, txt = '', runs = 0;
    if (c.kind === 'bat') {
      const r = this.apply(out.res, 'kia', me, { me: true, drive: out.perfect }); runs = r.runs; this.tallyMe(out.res, r.runs, true);
      ok = r.onbase || r.runs > 0; txt = r.txt; this.bi.kia = (this.bi.kia + 1) % 9;
    } else if (c.kind === 'fld') {
      const b = this.bases;
      if (out.res === 'out') { ok = true; this.outs++; txt = c.ball === 'fly' ? `${me}, ${out.dive ? '다이빙 캐치!' : '호수비로 아웃'}` : `${me}, ${out.dive ? '몸 날려 잡고 송구, 아웃!' : '깔끔한 송구로 아웃'}`; if (out.dive) this.S.stats.dive++; }
      else { const n = (b[1] ? 1 : 0) + (b[2] ? 1 : 0) + (c.late && b[0] ? 1 : 0); txt = out.res === 'drop' ? `${c.batter} 타구, ${me} 포구 실패…` : `${c.batter} 타구, ${me}의 송구가 늦었다`;
        b.forEach((x, i) => { if (x && (i > 0 || c.late)) { b[i] = null; } }); this.addRuns('opp', n); runs = n; b[1] = 'o'; this.hits.opp++; if (n) txt += ` (${n}점)`; }
      this.bi.opp = (this.bi.opp + 1) % 9;
    } else if (c.kind === 'run') {
      if (out.res === 'safe') { ok = true; this.bases[1] = null; this.addRuns('kia', 1); runs = 1; this.my.r++; txt = `${me}, 홈 쇄도… 세이프!`; this.bases[0] = 'k'; }
      else if (out.res === 'out') { this.bases[1] = null; this.outs++; txt = `${me}, 홈에서 아웃…`; this.bases[0] = 'k'; }
      else { this.bases[1] = null; this.bases[2] = 'me'; this.bases[0] = 'k'; txt = `${me}, 3루에서 멈춤`; ok = false; c.hold = true; }
      this.hits.kia++;
      this.bi.kia = (this.bi.kia + 1) % 9;
    } else if (c.kind === 'steal') {
      if (out.res === 'safe') { ok = true; this.bases[0] = null; this.bases[1] = 'me'; this.my.sb++; txt = `${me}, 2루 도루 성공!`; }
      else if (out.res === 'hold') { txt = `${me}, 스타트를 못 끊었다`; }
      else { this.bases[0] = null; this.outs++; txt = out.res === 'pick' ? `${me}, 견제에 걸려 아웃` : `${me}, 2루에서 태그 아웃`; }
    }
    const rec = { kind: c.kind, ok, inn: c.inn, late: c.late, runs: c.kind === 'fld' ? -runs : runs, perfect: !!out.perfect, res: out.res, txt, hold: !!c.hold };
    this.my.cl.push(rec);
    // 명장면 후보
    const lc = this.lastLeadChange && this.lead === 'kia';
    if (ok && (out.res === 'HR' || c.late || lc || out.dive)) this.moments.push({ inn: c.inn, top: c.top, txt, w: (out.res === 'HR' ? 3 : 1) + (c.late ? 2 : 0) + (lc ? 2 : 0) });
    const ev = { type: 'clutchEnd', ok, txt, runs: rec.runs, kind: c.kind, perfect: !!out.perfect, res: out.res };
    if (this.walkoff()) { ev.walkoff = true; this.my.gw = true; this.queue.push(this.finish()); }
    else if (this.outs >= 3) this.queue.push(this.closeHalf());
    return ev;
  }
  finish() {
    if (this.halfOpen) { this.line[this.side()].push(this.halfRuns); this.halfOpen = false; }
    this.over = true; const win = this.score.kia > this.score.opp; this.win = win;
    // 내 결승타 판정(간단): 이긴 경기에서 내가 성공한 승부처가 역전/리드 점수를 만들었으면
    if (win && this.my.cl.some(c => c.ok && c.runs > 0 && (c.late || c.res === 'HR'))) this.my.gw = true;
    return { type: 'end', win };
  }
}
K.Match = Match;

K.lineup = function (S) { // 코치가 짜는 타순 + 내 자리
  const ms = S.mates.map((m, i) => ({ ...m, i, name: S.rest === i ? K.BENCH[i % K.BENCH.length] : m.name, ovr: S.rest === i ? 55 : m.ovr }));
  const order = new Array(9).fill(null);
  const pref = [3, 4, 2, 5, 1, 6, 7, 8, 9]; // 좋은 타자 순서대로 넣을 자리
  ms.sort((a, b) => b.ovr - a.ovr);
  order[S.slot - 1] = { me: true, name: S.me.name, pos: S.me.pos === 'OF' ? 'CF' : 'SS' };
  let k = 0; for (const s of pref) { if (order[s - 1]) continue; order[s - 1] = ms[k++]; }
  return order;
};

// ============================================================================
// 경기 후 정산
// ============================================================================
K.clutchRate = M => M.my.cl.length ? M.my.cl.filter(c => c.ok).length / M.my.cl.length : null;
K.finishGame = function (S, M, R) {
  const out = { win: M.win, deltas: [], trust0: S.trust, tp0: S.tp, unlocked: null, locked: false, headline: null, moment: null };
  const T = B.trust; const add = (v, why) => { if (!v) return; out.deltas.push([why, v]); S.trust = clamp(S.trust + v, 0, 100); };
  const post = S.phase === 'post';
  if (!post) { S.W.KIA += M.win; S.L.KIA += !M.win; S.W[M.opp] += !M.win; S.L[M.opp] += M.win; }
  S.streakL = M.win ? 0 : S.streakL + 1; S.streakW = M.win ? S.streakW + 1 : 0;
  const cr = K.clutchRate(M);
  if (!S.auto) {
    if (M.win) add(T.win, '승리');
    if (cr != null && cr >= 0.6) add(T.star, M.my.gw ? '내 결승타' : '승부처 활약');
    if (S.restCare) add(T.care, S.restCare === 2 ? '지친 선수 휴식' : '신인 기용');
    if (cr != null && cr < 0.4) add(T.bad, '승부처 부진');
    if (S.streakL >= 3) add(T.streak, `${S.streakL}연패`);
    if (K.isParachute(S)) { add(T.parachute, '낙하산 타순'); S.flags.parachuteGames++; }
    if (M.rival && M.win) add(8, '라이벌전 승리');
    if (S.tactic === 'owner') add(-2, '구단주 특별 지시');
    if (S.trust <= 0 && !S.lock) { S.trust = 0; S.lock = 3; S.flags.everLocked = 1; out.locked = true; }
    else if (S.lock && S.trust >= T.unlock[3 - S.lock]) { S.lock--; out.unlocked = ['타순', '기용', '훈련'][2 - S.lock]; while (S.lock && S.trust >= T.unlock[3 - S.lock]) { S.lock--; out.unlocked = ['타순', '기용', '훈련'][2 - S.lock]; } }
    if (S.lock) { S.flags.lockedGames++; S.lockGames++; } else S.lockGames = 0;
  }
  // 내 기록
  const st = S.stats, m = M.my; st.g++; st.pa += m.pa; st.ab += m.ab; st.h += m.h; st.hr += m.hr; st.rbi += m.rbi; st.bb += m.bb; st.k += m.k; st.sb += m.sb;
  st.cl += m.cl.length; st.clOk += m.cl.filter(c => c.ok).length; if (m.gw) st.gw++; if (M.my.gw && M.walkoffFlag) st.walkoff++;
  if (S.slot === 9 && m.gw) S.flags.nine = 1;
  if (S.buffs.lev && m.hr) S.flags.levWin = 1;
  if (S.buffs.takeprofit && m.hr) S.flags.tp = 1;
  if (S.rest === 'me') S.flags.restMe++;
  // 훈련 포인트 (정규시즌만)
  if (!post) {
    let tp = B.tpBase + (M.win ? B.tpWin : 0) + (S.trust >= 70 ? B.tpHiTrust : 0) + (S.trust < 30 ? B.tpLoTrust : 0) + (S.tactic === 'normal' ? 1 : 0) + (S.buffs.tpNext || 0);
    if (S.buffs.lev) tp = S.buffs.lev > 0 ? tp * 2 : 0;
    out.tpGain = tp; S.tp += tp;
  }
  // 피로
  const mates = S.mates;
  mates.forEach((x, i) => { if (S.rest === i) { x.consec = 0; x.tired = false; } else { x.consec++; if (x.tired) { if (R() < B.tiredRecover) x.tired = false; } else if (x.consec >= 4 && R() < B.tiredChance) x.tired = true; } });
  if (S.rest === 'me') { S.me.consec = 0; S.me.tired = false; } else { S.me.consec++; if (S.me.consec >= 4 && R() < 0.3) S.me.tired = true; }
  // 물타기
  if (S.buffs.mul && !M.win) { S.buffs.nextStat = 3; S.flags.mulCount++; }
  // 헤드라인 / 명장면
  out.moment = M.moments.sort((a, b) => b.w - a.w)[0] || null;
  out.headline = K.headline(S, M, out, R);
  S.headlines.push({ g: S.gi + 1, txt: out.headline, win: M.win });
  // 다른 구장 결과 (정규시즌)
  if (!post) {
    const g = S.sched[S.gi]; out.others = [];
    g.games.forEach(([h, a]) => { if (h === 'KIA' || a === 'KIA') return; const hw = R() < K.winP(K.TEAMS[h].str + 0.02, K.TEAMS[a].str); S.W[hw ? h : a]++; S.L[hw ? a : h]++; out.others.push([h, a, hw]); });
    S.log.push({ g: S.gi + 1, opp: M.opp, home: M.home, kia: M.score.kia, oppS: M.score.opp, win: M.win, cl: m.cl.length, clOk: m.cl.filter(c => c.ok).length, slot: S.slot });
    S.gi++;
  }
  // 이번 경기 한정 효과 초기화
  S.rest = null; S.restCare = 0; S.tactic = null; const keep = {}; if (S.buffs.nextStat) keep.stat = S.buffs.nextStat; S.buffs = keep;
  out.titles = K.checkTitles(S);
  return out;
};

// ---------- 관리 ----------
K.canEdit = (S, what) => !S.lock || (what === 'slot' && S.lock <= 2) || (what === 'rest' && S.lock <= 1) || (what === 'train' && S.lock === 0);
K.coachManage = function (S, R) { // 권한 잠김 또는 자동 진행 때 코치가 정함
  if (!K.canEdit(S, 'slot')) S.slot = 9;
  if (!K.canEdit(S, 'rest')) { const t = S.mates.map((m, i) => [m, i]).filter(([m]) => m.tired); S.rest = t.length && R() < 0.5 ? t[0][1] : null; S.restCare = S.rest != null ? 2 : 0; }
  if (!K.canEdit(S, 'train') && S.tp > 0) { const n = Math.floor(S.tp / 2); for (let i = 0; i < n; i++) S.me.st[K.STATS[i % 5]] = Math.min(99, S.me.st[K.STATS[i % 5]] + B.statPerTp); S.tp = 0; }
};
K.setRest = function (S, who) { // who: null | 'me' | mate index
  S.rest = who; S.restCare = 0;
  if (who == null) return;
  if (who === 'me') return;
  S.restCare = S.mates[who].tired ? 2 : 1;
};
K.train = function (S, what) { // what: stat key | 'team'
  if (S.tp <= 0) return false;
  if (what === 'team') { if (S.teamTrain >= B.teamTrainCap - 1e-9) return false; S.teamTrain = Math.min(B.teamTrainCap, S.teamTrain + B.teamTrainStep); }
  else { if (S.me.st[what] >= 99) return false; S.me.st[what] = Math.min(99, S.me.st[what] + B.statPerTp); }
  S.tp--; return true;
};

// ---------- 카드 ----------
K.TACTICS = [
  { id: 'fullswing', name: '풀스윙 데이', desc: '홈런 확률 1.5배\n미트 커서 85%', icon: 'bat' },
  { id: 'speed', name: '발야구', desc: '주루 판정 창 1.5배\n주루 승부처 +1', icon: 'shoe' },
  { id: 'shift', name: '수비 시프트', desc: '수비 범위 1.3배', icon: 'glove' },
  { id: 'eye', name: '눈야구', desc: '볼 구분 2배 빨리\n볼넷도 성공', icon: 'eye' },
  { id: 'bunt', name: '번트 작전', desc: '번트 판정 폭 2배', icon: 'bunt' },
  { id: 'owner', name: '구단주 특별 지시', desc: '승부처 +1\n팬 신뢰 -2', icon: 'crown' },
  { id: 'normal', name: '평상시대로', desc: '효과 없음\n훈련 포인트 +1', icon: 'cap' },
];
K.REWARDS = [
  { id: 'con', name: '특타 1시간', desc: '컨택 +3', w: 1 }, { id: 'pow', name: '웨이트 루틴', desc: '파워 +3', w: 1 },
  { id: 'eye', name: '영상 분석', desc: '선구 +3', w: 1 }, { id: 'spd', name: '스프린트', desc: '주력 +3', w: 1 },
  { id: 'def', name: '펑고 100개', desc: '수비 +3', w: 1 }, { id: 'fan', name: '팬 미팅', desc: '팬 신뢰 +10', w: 1 },
  { id: 'coach', name: '코치의 믿음', desc: '훈련 포인트 +2', w: 0.8 }, { id: 'all', name: '올라운드', desc: '모든 능력치 +2', w: 0.5, rare: 1 },
];
K.drawCards = function (S, R, kind, win) {
  if (kind === 'tactic') { const pool = K.TACTICS.filter(c => c.id !== 'normal'); const a = []; while (a.length < 2) { const c = pick(R, pool); if (!a.includes(c)) a.push(c); } a.push(K.TACTICS.find(c => c.id === 'normal')); return a; }
  const pool = K.REWARDS.filter(c => !c.rare || S.trust >= 70); const w = pool.map(c => c.w * (c.id === 'fan' && !win ? 2 : 1));
  const a = []; let guard = 0; while (a.length < 3 && guard++ < 50) { const c = wpick(R, pool, w); if (!a.includes(c)) a.push(c); }
  if (win && S.trust >= 70 && !a.some(c => c.rare)) a[2] = K.REWARDS.find(c => c.rare);
  return a;
};
K.applyReward = function (S, c) {
  if (K.STATS.includes(c.id)) S.me.st[c.id] = Math.min(99, S.me.st[c.id] + 3);
  else if (c.id === 'fan') S.trust = Math.min(100, S.trust + 10);
  else if (c.id === 'coach') S.tp += 2;
  else if (c.id === 'all') K.STATS.forEach(k => S.me.st[k] = Math.min(99, S.me.st[k] + 2));
};

// ---------- 이벤트 (3·6·12·15경기 후 랜덤, 9경기 후 올스타) ----------
K.EVENTS = [
  { id: 'pump', title: '바나나스닥 급등', art: 'chartUp', text: '보유 포지션이 쭉 올랐다.\n구단 예산에 여유가 생겼다.', opts: [
    { t: '훈련 장비 구입', d: '훈련 포인트 +3', f: S => { S.tp += 3; } },
    { t: '팬 사인회 개최', d: '팬 신뢰 +6', f: S => { S.trust = Math.min(100, S.trust + 6); } }] },
  { id: 'dump', title: '바나나스닥 급락', art: 'chartDown', text: '밤사이 차트가 무너졌다.\n구단 예산이 깎였다.', opts: [
    { t: '허리띠 졸라매기', d: '훈련 포인트 -2', f: S => { S.tp = Math.max(0, S.tp - 2); } },
    { t: '개인 돈으로 메우기', d: '팬 신뢰 -3, 포인트 유지', f: S => { S.trust = Math.max(1, S.trust - 3); } }] },
  { id: 'lev', title: '레버리지 몰빵', art: 'chartUp', text: '"이번엔 확실하다."\n다음 경기 훈련 포인트를 건다.', opts: [
    { t: '몰빵한다', d: '다음 경기 포인트 2배 아니면 0', f: (S, R) => { S.buffs.lev = R() < 0.5 ? 1 : -1; } },
    { t: '참는다', d: '아무 일도 없음', f: () => {} }] },
  { id: 'mul', title: '물타기', art: 'chartDown', text: '떨어질 때 더 사면\n평단이 내려간다…', opts: [
    { t: '물탄다', d: '다음 경기 지면 그 다음 경기\n전 능력치 +3', f: S => { S.buffs.mul = 1; } },
    { t: '손절한다', d: '훈련 포인트 +1', f: S => { S.tp += 1; } }] },
  { id: 'profit', title: '익절 타이밍', art: 'chartUp', text: '수익이 났다.\n지금 실현할까?', opts: [
    { t: '익절한다', d: '포인트 전부 능력치로\n(1포인트 = +3, 고르게)', f: S => { let i = 0; while (S.tp > 0) { const k = K.STATS[i++ % 5]; S.me.st[k] = Math.min(99, S.me.st[k] + 3); S.tp--; } S.buffs.takeprofit = 1; } },
    { t: '들고 간다', d: '훈련 포인트 +1', f: S => { S.tp += 1; } }] },
  { id: 'press', title: '기자 회견', art: 'mic', text: '"구단주가 직접 뛰는 거,\n솔직히 어떻게 생각하세요?"', opts: [
    { t: '겸손하게', d: '팬 신뢰 +4', f: S => { S.trust = Math.min(100, S.trust + 4); } },
    { t: '도발한다', d: '팬 신뢰 -3\n다음 경기 전 능력치 +3', f: S => { S.trust = Math.max(1, S.trust - 3); S.buffs.nextStat = 3; } }] },
  { id: 'coach', title: '코치 면담', art: 'coach', text: '"구단주님, 하나만 확실히\n잡고 가시죠."', opts: [
    { t: '코치 말을 듣는다', d: '가장 낮은 능력치 +4', f: S => { const k = K.STATS.slice().sort((a, b) => S.me.st[a] - S.me.st[b])[0]; S.me.st[k] = Math.min(99, S.me.st[k] + 4); } },
    { t: '내 강점을 민다', d: '가장 높은 능력치 +3', f: S => { const k = K.STATS.slice().sort((a, b) => S.me.st[b] - S.me.st[a])[0]; S.me.st[k] = Math.min(99, S.me.st[k] + 3); } }] },
  { id: 'rookie', title: '신인 콜업', art: 'coach', text: '2군에서 올라온 신인이\n기회를 기다린다.', opts: [
    { t: '기회를 준다', d: '팬 신뢰 +3, 팀 훈련 +1단계', f: S => { S.trust = Math.min(100, S.trust + 3); S.teamTrain = Math.min(B.teamTrainCap, S.teamTrain + B.teamTrainStep); } },
    { t: '아직 이르다', d: '훈련 포인트 +1', f: S => { S.tp += 1; } }] },
];
K.pickEvents = function (S, R) { const a = []; while (a.length < 2) { const e = pick(R, K.EVENTS); if (!a.includes(e)) a.push(e); } return a; };
K.eventAfter = gi => [3, 6, 12, 15].includes(gi) ? 'event' : gi === 9 ? 'allstar' : null;

// ---------- 순위 / 가을야구 ----------
K.standings = S => K.TEAM_IDS.slice().sort((a, b) => (S.W[b] - S.W[a]) || (S.L[a] - S.L[b]) || (K.TEAMS[b].str - K.TEAMS[a].str)).map((t, i) => ({ t, w: S.W[t], l: S.L[t], rank: i + 1 }));
K.ROUND = { wc: { name: '와일드카드', need: 1 }, semi: { name: '준플레이오프', need: 2 }, po: { name: '플레이오프', need: 2 }, ks: { name: '한국시리즈', need: 4 } };
K.startPost = function (S) {
  const st = K.standings(S); const rank = st.findIndex(x => x.t === 'KIA') + 1;
  S.finalRank = rank; S.phase = 'post';
  if (rank > 5) { S.post = { out: true, rank, seeds: st.map(x => x.t) }; return S.post; }
  S.post = { rank, seeds: st.map(x => x.t), round: rank === 5 || rank === 4 ? 'wc' : rank === 3 ? 'semi' : rank === 2 ? 'po' : 'ks', w: 0, l: 0, games: [], ks: { cl: 0, ok: 0 } };
  K.setupRound(S); return S.post;
};
K.setupRound = function (S) {
  const P = S.post, sd = P.seeds;
  // KIA가 없는 앞 라운드는 시뮬로 처리해서 상대를 정함
  const sim = (a, b, need, adv) => { let wa = adv || 0, wb = 0; const R = K.rng(S.rs); while (wa < need && wb < need) { R() < K.winP(K.TEAMS[a].str, K.TEAMS[b].str) ? wa++ : wb++; } return wa >= need ? a : b; };
  const r = P.round;
  if (r === 'wc') { P.opp = P.rank === 4 ? sd[4] : sd[3]; P.need = P.rank === 4 ? 1 : 2; P.oppNeed = P.rank === 4 ? 2 : 1; }
  else if (r === 'semi') { P.opp = P.rank === 3 ? sim(sd[3], sd[4], 2, 1) : sd[2]; P.need = 2; P.oppNeed = 2; }
  else if (r === 'po') { P.opp = P.rank === 2 ? sim(sd[2], sim(sd[3], sd[4], 2, 1), 2) : sd[1]; P.need = 2; P.oppNeed = 2; }
  else if (r === 'ks') { P.opp = P.rank === 1 ? sim(sd[1], sim(sd[2], sim(sd[3], sd[4], 2, 1), 2), 2) : sd[0]; P.need = 4; P.oppNeed = 4; }
  P.w = 0; P.l = 0; P.g = 0;
};
K.postFixture = S => { const P = S.post; const hiSeed = P.seeds.indexOf('KIA') < P.seeds.indexOf(P.opp); const home = P.g % 2 === 0 ? hiSeed : !hiSeed; return { opp: P.opp, home, rival: false }; };
K.postResult = function (S, win) { // → 'next' | 'advance' | 'champion' | 'eliminated'
  const P = S.post; P.g++; win ? P.w++ : P.l++;
  if (P.w >= P.need) { if (P.round === 'ks') { P.champion = true; return 'champion'; } P.round = { wc: 'semi', semi: 'po', po: 'ks' }[P.round]; K.setupRound(S); return 'advance'; }
  if (P.l >= P.oppNeed) { P.out = true; return 'eliminated'; }
  return 'next';
};
K.ksMVP = S => !!(S.post && S.post.champion && S.post.ks && S.post.ks.cl > 0 && S.post.ks.ok / S.post.ks.cl >= 0.6);
K.ending = function (S) {
  if (S.post && S.post.champion) return K.ksMVP(S) ? 'true' : 'champ';
  if (S.lock) return 'locked';
  return S.finalRank <= 5 ? 'postout' : 'miss';
};

// ---------- 칭호 ----------
K.TITLES = [
  { id: 'parachute', name: '낙하산 4번 타자', d: '종합 55 미만으로 4번 출장', f: S => S.flags.parachuteGames > 0 && S.log.some(l => l.slot === 4) },
  { id: 'nine', name: '구단주가 대타', d: '9번 타순에서 결승타', f: S => !!S.flags.nine },
  { id: 'lev', name: '레버리지 타법', d: '레버리지 몰빵한 경기에서 홈런', f: S => !!S.flags.levWin },
  { id: 'mul', name: '물타기 장인', d: '물타기 3번 발동', f: S => S.flags.mulCount >= 3 },
  { id: 'tp', name: '익절은 홈런으로', d: '익절한 경기에서 홈런', f: S => !!S.flags.tp },
  { id: 'bench', name: '벤치 지킴이', d: '나를 3번 이상 쉬게 함', f: S => S.flags.restMe >= 3 },
  { id: 'nobody', name: '감독이 나를 안 씀', d: '권한 잠긴 채 5경기', f: S => S.flags.lockedGames >= 5 },
  { id: 'diver', name: '몸을 던지는 구단주', d: '다이빙 캐치 3번', f: S => S.stats.dive >= 3 },
  { id: 'derby', name: '올스타 홈런왕', d: '홈런 더비 5개 이상', f: S => S.flags.derbyHR >= 5 },
  { id: 'still9', name: '구단주인데 9번', d: '권한 잠긴 채 시즌 종료', f: S => S.ending === 'locked' },
  { id: 'champ', name: '우승 구단주', d: '한국시리즈 우승', f: S => !!(S.post && S.post.champion) },
  { id: 'true', name: '이제 선물은 접는다', d: '한국시리즈 MVP', f: S => S.ending === 'true' },
];
K.checkTitles = function (S) { const got = []; K.TITLES.forEach(t => { if (!S.titles.includes(t.id) && t.f(S)) { S.titles.push(t.id); got.push(t); } }); return got; };

// ---------- 헤드라인 ----------
K.headline = function (S, M, out, R) {
  const me = S.me.name, opp = M.opp;
  if (out.locked) return pick(R, ['팬들, 구단주 퇴진 요구', '관중석에 "감독 바꿔라" 걸개', '구단주 권한, 코치진에 넘어가']);
  if (out.unlocked) return `구단주, ${out.unlocked} 권한 되찾았다`;
  if (M.rival && M.win) return pick(R, [`라이벌전 승리, 관중석 만원`, `${opp} 잡았다, 광주가 들썩`]);
  if (M.win && M.my.gw) return pick(R, [`구단주의 결승타, 팬들 "인정"`, `${me}, 돈으로 산 자리 아니었다`, `"구단주 맞아?" ${me} 결승타`]);
  if (M.win && M.my.hr) return pick(R, [`익절은 홈런으로, ${me} 아치`, `${me} 홈런, 바나나스닥보다 높이`]);
  if (K.isParachute(S) && !M.win) return pick(R, ['구단주 낙하산 4번 타자', `팬들 "${me} 타순 내려라"`]);
  if (S.streakL >= 3) return pick(R, [`팬들 "감독은 누구냐"…감독은 구단주`, `타이거즈 ${S.streakL}연패, 침묵의 광주`]);
  if (!M.win && S.slot === 9) return pick(R, ['구단주, 오늘도 9번', `${me}, 9번에서 고개 숙여`]);
  if (M.win) return pick(R, ['타이거즈, 또 이겼다', `${opp} 상대로 승리`, '광주의 밤, 함성으로 가득']);
  return pick(R, [`${opp}에 덜미`, '타이거즈, 아쉬운 패배', '내일은 다를까']);
};

// 플레이 바이 플레이 없이 경기 결과만 굴리기 (시뮬/자동용)
K.playAuto = function (M, bot) { let e, n = 0; while ((e = M.next()).type !== 'end' && n++ < 2000) { if (e.type === 'clutch') M.resolve(bot(e)); } return M; };

if (typeof module !== 'undefined' && module.exports) module.exports = K; else root.K = K;
})(this);
