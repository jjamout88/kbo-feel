'use strict';
// ============================================================================
// scenes.js — 경기 밖 화면 전부 + 시즌 흐름
// ============================================================================
const Scenes = {};
window.Scenes = Scenes;
const G_ = GFX;
const look = S => ({ skin: S.me.skin, num: S.me.num });
// 코치 튜토리얼 대사 (처음 한 번씩만. 타이틀 '튜토리얼 다시 보기'로 초기화)
const TUT = {
  start: ['구단주님, 첫 경기 전에 몇 가지만 알려드리겠습니다. 나성범, 김도영도 다 지켜보고 있습니다.', '경기는 대부분 전광판 빨리감기로 흘러갑니다. 구단주님이 직접 뛰는 건 "승부처"뿐입니다.', '승부처는 한 경기에 최소 3번. 타격, 수비, 홈 쇄도, 도루 중 하나가 나옵니다.'],
  brief: ['경기 전엔 작전 카드를 한 장 고릅니다. 효과는 이번 경기에만 있습니다.', '오른쪽 위 게이지가 팬 신뢰입니다. 이기면 오르고, 실력 없이 높은 타순에 서면 떨어집니다.', '신뢰가 0이 되면 감독 권한은 제가 맡습니다. 15, 30, 45가 되면 하나씩 돌려드리죠.', '처음이시니 "타격 연습"으로 감부터 잡아보시죠. 그다음 카드를 고르고 경기 시작입니다.'],
  c_bat: ['타석입니다. 공이 던져지면 큰 원이 존 쪽으로 줄어듭니다. 그 원이 가운데 원에 닿는 순간, 화면 아무 데나 탭하면 스윙합니다.', '원이 초록색이면 맞힐 수 있고, 노란색이면 "저스트!", 무조건 안타입니다. 위치는 신경 쓰지 마십시오.', '테두리가 파란 공은 볼입니다. 참으면 볼넷도 노릴 수 있죠. 선구가 높을수록 일찍 보입니다.', '오른쪽 위 번트 버튼을 누르고 기다리면 번트를 댑니다. 발이 빠르면 내야 안타도 됩니다.'],
  c_fld_IF: ['수비 위기입니다. 땅볼이 구단주님 쪽으로 옵니다.', '노란 원이 공을 막을 자리입니다. 화면 아무 데나 탭하면 그곳으로 달려갑니다. 공이 오기 전에만 탭하세요.', '잡으면 1루 송구 게이지가 나옵니다. 바늘이 초록일 때 탭. 가운데 노란 칸이면 무조건 아웃입니다.'],
  c_fld_OF: ['수비 위기입니다. 뜬공이 구단주님 쪽으로 날아옵니다.', '노란 원이 공이 떨어질 자리입니다. 화면 아무 데나 탭하면 그곳으로 달려갑니다. 공이 떨어지기 전에만 탭하세요.', '잡으면 홈 송구 게이지가 나옵니다. 바늘이 초록일 때 탭. 가운데 노란 칸이면 무조건 아웃입니다.'],
  c_run: ['2루 주자입니다. 안타가 나오면 3루를 돌게 됩니다.', '3루 베이스에 링이 줄어듭니다. 링이 노래지는 순간, 3루를 밟는 순간 GO를 누르면 무조건 세이프.', '타구가 얕거나 외야 어깨가 강하면 STOP으로 3루에 멈추는 것도 방법입니다. 위쪽 힌트를 보세요.'],
  c_steal: ['1루에서 도루를 노립니다. 투수를 잘 보십시오.', '투수가 다리를 드는 순간 "!"가 뜹니다. 그때 탭하면 스타트. 빠를수록 확실합니다.', '고개만 돌리거나 견제할 때 뛰면 견제사입니다. 참으세요.'],
  result: ['경기 결과입니다. 오른쪽에서 팬 신뢰가 왜 오르고 내렸는지 보입니다.', '"보상 카드"를 누르면 세 장 중 한 장을 골라 바로 능력치를 올릴 수 있습니다.'],
  manage: ['경기가 끝나면 팀 관리입니다. 타순, 기용, 훈련 세 가지입니다.', '타순: 칸을 눌러 구단주님 자리를 정합니다. 노란 테두리가 제 추천이고, 타순이 높을수록 승부처가 많아집니다.', '다만 실적보다 2칸 넘게 높이 서면 "낙하산"이라 팬 신뢰가 깎입니다. 4번은 원래 김도영 자리라는 걸 팬들이 다 압니다.', '기용: 땀 흘리는 선수는 지친 겁니다. 김도영이라도 지치면 쉬게 해야 합니다. 한 명 쉬게 하면 팀도 강해지고 팬들도 좋아합니다.', '훈련: 포인트로 능력치를 올립니다. 팀 훈련은 팀 전력을 조금씩 올립니다.'],
  lock: ['팬 신뢰가 바닥났습니다. 당분간 라인업은 제가 짜겠습니다. 구단주님은 9번으로 계속 뛰시고요.', '이기면 신뢰가 돌아옵니다. 15, 30, 45가 되면 타순, 기용, 훈련 순서로 돌려드리죠.'],
  event: ['구단주님 본업 쪽 소식이군요. 고르는 대로 결과가 달라집니다.'],
  allstar: ['올스타 브레이크입니다. 홈런 더비에서 넘긴 만큼 파워가 오릅니다. 쉬는 동안 선수들 컨디션도 회복됩니다.'],
  post: ['가을야구입니다. 단기전에선 상대 에이스가 자주 나옵니다.', '한국시리즈를 우승하고 승부처 성공률이 60%를 넘으면 MVP입니다.'],
};
window.TUT = TUT;

// ---------- 공통 배경/헤더 ----------
function menuBg(c, trust = 60, dim = 0.62, theme = 'home') {
  G_.stadium(c, G_.THEMES[theme], trust, App.t, 0.1);
  c.save(); c.globalAlpha = dim; rect(c, 0, 0, LW, LH, P.n0); c.restore();
}
function header(c, title, sub) {
  rect(c, 0, 0, LW, 17, P.n1); rect(c, 0, 17, LW, 1, P.n3); rect(c, 0, 18, LW, 1, P.n0);
  rect(c, 0, 0, 4, 17, P.r2);
  text(c, title, 10, 3, { f: 'b', col: P.w4 });
  if (sub) text(c, sub, LW - 8, 4, { f: 's', col: P.n6, a: 'r' });
}
function trustGauge(c, x, y, w, S, label = true) {
  const t = S.trust; if (label) { G_.icon(c, 'star', x, y - 1); text(c, '팬 신뢰', x + 11, y - 1, { f: 's', col: P.w2 }); text(c, Math.round(t), x + w, y - 1, { f: 'b', col: t >= 70 ? P.up : t < 30 ? P.dn : P.w4, a: 'r' }); }
  const by = y + 11; G_.bar(c, x, by, w, 5, t, 100, t >= 70 ? P.up : t < 30 ? P.dn : P.y3);
  K.BAL.trust.unlock.forEach(u => rect(c, x + Math.round(w * u / 100), by - 1, 1, 7, S.lock ? P.w4 : P.n4));
}
function statRow(c, x, y, k, v, w = 70, delta = 0) {
  text(c, K.STAT_KO[k], x, y, { f: 's', col: P.w2 });
  G_.bar(c, x + 26, y + 3, w - 26 - 16, 4, v, 99, v >= 70 ? P.r3 : v >= 50 ? P.y3 : P.n5);
  text(c, v, x + w, y, { f: 's', col: delta ? P.up : P.w4, a: 'r' });
}
function card(c, x, y, w, h, title, desc, o = {}) {
  const sel = o.sel; const dy = sel ? -3 : 0;
  rect(c, x + 2, y + 3, w, h, 'rgba(10,14,36,0.55)');
  rect(c, x, y + dy, w, h, sel ? P.y3 : P.c1); rect(c, x + 1, y + 1 + dy, w - 2, h - 2, P.c3); rect(c, x + 1, y + 1 + dy, w - 2, 1, P.c4);
  rect(c, x + 1, y + 1 + dy, w - 2, 15, o.band || P.r2); rect(c, x + 1, y + 15 + dy, w - 2, 1, P.r0);
  if (o.icon) G_.icon(c, o.icon, x + 4, y + 4 + dy);
  text(c, title, x + w / 2 + (o.icon ? 5 : 0), y + 3 + dy, { f: 's', col: P.w4, a: 'c', out: P.r0 });
  G_.textBox(c, desc, x + 4, y + 20 + dy, w - 8, { f: 's', col: P.n1, a: 'c', lh: 11 });
  if (o.rare) { G_.icon(c, 'star', x + w - 12, y + h - 12 + dy); }
}
function moneyChip(c, x, y, S) { G_.icon(c, 'coin', x, y); text(c, S.tp, x + 11, y, { f: 'b', col: P.y3 }); }

// ---------- 컷 그림 ----------
function chartMonitor(c, x, y, w, h, t, dir = 1, crash = 0) {
  rect(c, x - 3, y - 3, w + 6, h + 10, P.n2); rect(c, x - 2, y - 2, w + 4, h + 4, P.n0); rect(c, x, y, w, h, '#050818');
  rect(c, x + w / 2 - 6, y + h + 2, 12, 4, P.n2); rect(c, x + w / 2 - 14, y + h + 6, 28, 2, P.n3);
  for (let gx = x + 8; gx < x + w; gx += 12) for (let gy = y + 4; gy < y + h; gy += 2) px(c, gx, gy, '#121a3a');
  text(c, 'BNSDQ', x + 3, y + 2, { f: 's', col: P.n5 });
  const n = Math.min(Math.floor((w - 10) / 5), Math.floor(t * 14)); let v = h * 0.65, r = G_.seeded(4);
  for (let i = 0; i < n; i++) {
    const up = dir > 0 ? r() < 0.72 : r() < 0.25; const d = (2 + r() * 6) * (crash && i > n - 6 ? 2.5 : 1);
    const o = v, cl = Math.max(6, Math.min(h - 3, v + (up ? -d : d))); const cx = x + 6 + i * 5; const col = up ? P.up : P.dn;
    rect(c, cx + 1, Math.min(o, cl) - 2 + y, 1, Math.abs(cl - o) + 4, col); rect(c, cx, Math.min(o, cl) + y, 3, Math.max(1, Math.abs(cl - o)), col); v = cl;
  }
  const pct = dir > 0 ? '+' + Math.min(4870, Math.floor(t * 900)) + '%' : '-' + Math.min(62, Math.floor(t * 30)) + '%';
  text(c, pct, x + w - 3, y + 2, { f: 'b', col: dir > 0 ? P.up : P.dn, a: 'r' });
}
function contract(c, x, y, t) {
  G_.paper(c, x, y, 120, 84); text(c, '구단 인수 계약서', x + 60, y + 6, { f: 'b', col: P.n1, a: 'c' }); rect(c, x + 10, y + 21, 100, 1, P.c1);
  for (let i = 0; i < 4; i++) rect(c, x + 10, y + 27 + i * 7, 60 + (i * 13) % 40, 2, P.c2);
  text(c, '인수 구단: KIA', x + 10, y + 54, { f: 's', col: P.r1 });
  rect(c, x + 60, y + 74, 52, 1, P.c1); const n = Math.min(24, Math.floor(t * 30));
  for (let i = 0; i < n; i++) px(c, x + 64 + i * 2, y + 70 - Math.round(Math.sin(i * 0.9) * 3 + (i % 5 === 0 ? -2 : 0)), P.n2);
  if (t > 1) { G_.disc(c, x + 100, y + 64, 7, P.r2); G_.disc(c, x + 100, y + 64, 5, P.r1); text(c, '인', x + 100, y + 58, { f: 's', col: P.r4, a: 'c' }); }
}
function newspaper(c, x, y, w, h, head, sub, date) {
  G_.paper(c, x, y, w, h); rect(c, x + 4, y + 3, w - 8, 12, P.n1); text(c, '타이거즈 일보', x + 8, y + 3, { f: 'b', col: P.c4 }); if (date) text(c, date, x + w - 8, y + 4, { f: 's', col: P.n6, a: 'r' });
  const lines = G_.wrap(head, w - 12, 'b'); lines.slice(0, 2).forEach((l, i) => text(c, l, x + 6, y + 19 + i * 14, { f: 'b', col: P.n0 }));
  if (sub) G_.textBox(c, sub, x + 6, y + 21 + Math.min(2, lines.length) * 14, w - 12, { f: 's', col: P.c0 });
}
function bust(c, who, mood, x, y, S) { c.drawImage(G_.bustSprite(who, mood, who === 'me' && S ? S.me.skin : 0), x, y); }
function speech(c, x, y, w, str, who) {
  const lines = G_.wrap(str, w - 12, 'r'); const h = lines.length * 14 + 10; G_.panel(c, x, y, w, h, { bg: P.c3, br: P.c1, dk: P.c0 });
  if (who) { G_.panel(c, x + 6, y - 9, G_.tw(who, 's') + 10, 13, { bg: P.r2, br: P.r3, dk: P.r0 }); text(c, who, x + 11, y - 7, { f: 's' }); }
  lines.forEach((l, i) => text(c, l, x + 7, y + 6 + i * 14, { col: P.n1 })); return h;
}
function confetti(c, t, n = 40) { const r = G_.seeded(21); for (let i = 0; i < n; i++) { const x = (r() * LW + Math.sin(t * 2 + i) * 6) % LW, y = ((r() * LH + t * (30 + r() * 30)) % (LH + 10)) - 5; rect(c, x, y, 2, 1 + (i & 1), [P.up, P.y3, P.w4, P.dn, P.ok][i % 5]); } }

// ============================================================================
// 타이틀
// ============================================================================
Scenes.title = () => {
  const has = !!loadGame();
  return {
    t: 0,
    update(dt) { this.t += dt; },
    draw(c) {
      G_.stadium(c, G_.THEMES.home, 85, App.t, 0.3, (c2, x, y, w, h) => { const s = 'KIA 구단주 야구   ★   TIGERS   ★   '; const off = (App.t * 20) % (G_.tw(s, 'b')); text(c2, s + s, x - off + 4, y + 3, { f: 'b', col: P.y3 }); c2.save(); c2.globalCompositeOperation = 'destination-over'; c2.restore(); rect(c2, x - 4, y, 4, h, P.n1); rect(c2, x + w, y, 4, h, P.n1); });
      c.save(); c.globalAlpha = 0.45; rect(c, 0, 0, LW, LH, P.n0); c.restore();
      const sp = G_.batterSprite(Math.floor(this.t * 1.5) % 2 ? 'idle0' : 'idle1', { skin: 0, num: 1 }); c.drawImage(sp, 238 - G_.BAX, 146 - G_.BAY);
      const bob = Math.round(Math.sin(this.t * 2) * 1);
      c.save(); for (let x = 0; x < 200; x++) { c.globalAlpha = Math.max(0, 0.75 - x / 260); rect(c, x, 0, 1, LH, P.n0); } c.restore();
      rect(c, 18, 20 + bob, 4, 12, P.r2);
      text(c, '나는 타자겸', 26, 21 + bob, { f: 'b', col: P.c3, out: P.n0 });
      text(c, '감독이', 19, 39 + bob, { f: 'b', col: P.n0, sc: 2 }); text(c, '감독이', 18, 37 + bob, { f: 'b', col: P.w4, out: P.n1, sc: 2 });
      text(c, '되었습니다', 19, 63 + bob, { f: 'b', col: P.r0, sc: 2 }); text(c, '되었습니다', 18, 61 + bob, { f: 'b', col: P.r3, out: P.r0, sc: 2 });
      text(c, '나스닥 선물로 산 구단, 직접 뛰어서 우승까지', 20, 88, { f: 's', col: P.c2 });
      btn(c, 'new', 20, 102, 74, 20, '새 시즌', () => go(Scenes.create()));
      btn(c, 'cont', 98, 102, 74, 20, '이어하기', () => Flow.resume(), { kind: 'navy', disabled: !has });
      btn(c, 'ttl', 20, 125, 74, 16, `칭호 ${Meta.titles.length}/${K.TITLES.length}`, () => go(Scenes.titles()), { kind: 'ghost', f: 's' });
      btn(c, 'snd', 98, 125, 74, 16, Meta.sound ? '소리 켜짐' : '소리 꺼짐', () => { Meta.sound = Meta.sound ? 0 : 1; saveMeta(); }, { kind: 'ghost', f: 's' });
      btn(c, 'tut', 176, 125, 74, 16, '튜토리얼 다시', () => { Meta.tut = {}; saveMeta(); toast('다음 시즌부터 코치가 다시 알려줍니다'); }, { kind: 'ghost', f: 's' });
    },
  };
};

// ============================================================================
// 타자 메이킹
// ============================================================================
Scenes.create = () => {
  const o = { name: '', skin: 0, hand: 'R', pos: 'IF', num: 1, easy: false };
  const inp = document.getElementById('nameIn');
  return {
    enter() { inp.value = ''; inp.oninput = () => { o.name = inp.value.replace(/\s/g, '').slice(0, 5); }; },
    draw(c) {
      menuBg(c, 50, 0.78); header(c, '타자 만들기', '시작: 컨택35 파워35 선구35 주력45 수비40');
      // 미리보기
      G_.panel(c, 8, 24, 104, 102, { bg: P.n1 });
      c.save(); c.beginPath(); c.rect(10, 26, 100, 98); c.clip();
      const sp = G_.batterSprite(Math.floor(App.t * 1.5) % 2 ? 'idle0' : 'idle1', { skin: o.skin, num: o.num });
      if (o.hand === 'L') { c.save(); c.translate(60 * 2, 0); c.scale(-1, 1); c.drawImage(sp, 60 - G_.BAX + 6, 122 - G_.BAY); c.restore(); } else c.drawImage(sp, 60 - G_.BAX - 6, 122 - G_.BAY);
      c.restore();
      text(c, o.name || '등록명', 60, 28, { f: 'b', col: o.name ? P.w4 : P.w0, a: 'c' });
      // 항목
      const X0 = 122; let y = 23;
      const row = (lab, val, fnL, fnR, id) => { text(c, lab, X0, y + 3, { f: 's', col: P.n6 }); btn(c, id + 'L', X0 + 44, y, 18, 15, '◀', fnL, { kind: 'navy', f: 's' }); G_.panel(c, X0 + 64, y, 84, 15, { bg: P.n0 }); text(c, val, X0 + 106, y + 2, { f: 'b', a: 'c' }); btn(c, id + 'R', X0 + 150, y, 18, 15, '▶', fnR, { kind: 'navy', f: 's' }); y += 17; };
      text(c, '등록명', X0, y + 3, { f: 's', col: P.n6 });
      const focused = document.activeElement === inp;
      if (hit('name', X0 + 44, y, 124, 15, () => { inp.focus(); })) { }
      G_.panel(c, X0 + 44, y, 124, 15, { bg: focused ? P.n2 : P.n0, br: focused ? P.y3 : P.n4 });
      text(c, (o.name || (focused ? '' : '눌러서 입력')) + (focused && (App.t * 2 | 0) % 2 ? '|' : ''), X0 + 50, y + 2, { f: 'b', col: o.name ? P.w4 : P.n5 }); y += 17;
      const skins = ['밝은 피부', '보통 피부', '진한 피부'];
      row('외모', skins[o.skin], () => o.skin = (o.skin + 2) % 3, () => o.skin = (o.skin + 1) % 3, 'skin');
      row('투타', o.hand === 'R' ? '우투우타' : '우투좌타', () => o.hand = o.hand === 'R' ? 'L' : 'R', () => o.hand = o.hand === 'R' ? 'L' : 'R', 'hand');
      row('수비', o.pos === 'IF' ? '내야 (유격수)' : '외야 (중견수)', () => o.pos = o.pos === 'IF' ? 'OF' : 'IF', () => o.pos = o.pos === 'IF' ? 'OF' : 'IF', 'pos');
      row('등번호', o.num, () => o.num = (o.num + 98) % 99 + 1 - 0, () => o.num = o.num % 99 + 1, 'num');
      row('난이도', o.easy ? '쉬움' : '보통', () => o.easy = !o.easy, () => o.easy = !o.easy, 'easy');
      text(c, o.easy ? '쉬움: 판정 넉넉 (처음이면 추천)' : o.pos === 'IF' ? '내야: 땅볼 잡고 1루 송구' : '외야: 뜬공 잡고 홈 송구', 10, 131, { f: 's', col: P.c2 });
      btn(c, 'ok', 236, 128, 76, 17, '결정', () => { inp.blur(); Flow.newSeason({ ...o, name: o.name || '구단주' }); }, { kind: 'red' });
      btn(c, 'back', 168, 128, 64, 17, '뒤로', () => { inp.blur(); go(Scenes.title()); }, { kind: 'ghost', f: 's' });
    },
  };
};

// ============================================================================
// 오프닝 (3컷)
// ============================================================================
Scenes.opening = () => {
  const S = App.S; let i = 0, t = 0, done = false;
  const finish = () => { if (done) return; done = true; Flow.toBrief(); };
  const cuts = [
    { draw: c => { rect(c, 0, 0, LW, LH, P.n0); chartMonitor(c, 80, 14, 160, 82, t, 1); }, txt: '바나나스닥 선물 50배 레버리지.\n...진짜로 올랐다.' },
    { draw: c => { rect(c, 0, 0, LW, LH, P.n1); contract(c, 100, 10, t); }, txt: '통장 잔고를 보고, 그날 바로 구단을 샀다.' },
    { draw: c => { menuBg(c, 50, 0.5); bust(c, 'coach', 2, 30, 30); bust(c, 'me', 1, 240, 30, S); }, txt: '"...구단주님이 직접 뛰신다고요?"\n"9번으로 뛰면 됩니다. 일단은."\n(멀리서 김도영이 웃음을 참고 있다.)' },
  ];
  return {
    update(dt) { t += dt; },
    down() { },
    draw(c) {
      const ci = Math.min(i, cuts.length - 1); cuts[ci].draw(c);   // 마지막 컷 이후 페이드 동안에도 마지막 컷 유지
      rect(c, 0, 104, LW, 44, 'rgba(10,14,36,0.85)'); rect(c, 0, 104, LW, 1, P.n4);
      const n = Math.floor(t * 30); const full = cuts[ci].txt; G_.textBox(c, full.slice(0, n), 16, 112, LW - 32, { col: P.w4 });
      if (n >= full.length && (App.t * 2 | 0) % 2) text(c, '▼', LW - 16, 134, { f: 's', col: P.y3 });
      if (done) return;
      hit('adv', 0, 0, LW, LH, () => { if (n < full.length) { t = 99; return; } if (i + 1 >= cuts.length) finish(); else { i++; t = 0; } });
      btn(c, 'skip', LW - 46, 4, 40, 14, '건너뛰기', finish, { kind: 'ghost', f: 's' });
    },
  };
};

// ============================================================================
// 경기 전 브리핑 (작전 카드 1/3)
// ============================================================================
Scenes.brief = () => {
  const S = App.S, R = App.R; let cards, sel = -1, fx, ace, init = false;
  const first = S.phase === 'reg' && S.gi === 0;
  const self = {
    enter() {
      if (!init) { init = true; fx = S.phase === 'post' ? K.postFixture(S) : S.sched[S.gi]; cards = K.drawCards(S, R, 'tactic'); ace = App.preAce = R() < K.aceRate(S); }
      if (first) Coach.once('start', TUT.start.concat(TUT.brief));
    },
    draw(c) {
      menuBg(c, S.trust, 0.6, fx.home ? 'home' : 'away');
      const st = K.standings(S), rk = st.findIndex(x => x.t === 'KIA') + 1;
      const title = S.phase === 'post' ? `${K.ROUND[S.post.round].name}  ${S.post.w}승 ${S.post.l}패` : `정규시즌 ${S.gi + 1}/18경기`;
      header(c, title, S.phase === 'post' ? `${S.post.need}승 먼저` : `${rk}위 · ${S.W.KIA}승 ${S.L.KIA}패`);
      // 매치업
      G_.panel(c, 6, 22, 150, 70, { bg: P.n1 });
      G_.badge(c, 'KIA', 14, 28, 40, 15); text(c, 'VS', 81, 30, { f: 'b', col: P.y3, a: 'c' }); G_.badge(c, fx.opp, 108, 28, 40, 15);
      text(c, (fx.home ? '홈 · ' : '원정 · ') + K.STADIUM[fx.home ? 'KIA' : fx.opp], 81, 47, { f: 's', col: P.w2, a: 'c' });
      if (fx.rival) { G_.icon(c, 'fire', 52, 58); text(c, '라이벌전 · 이기면 신뢰 +8', 63, 58, { f: 's', col: P.r4 }); }
      else if (ace) { G_.icon(c, 'fire', 40, 58); text(c, '상대 에이스 등판! 공이 빠르다', 51, 58, { f: 's', col: P.r4 }); }
      else text(c, '상대 선발: 평범한 투수', 81, 58, { f: 's', col: P.w1, a: 'c' });
      text(c, S.rest === 'me' ? '나: 오늘 휴식 (승부처 없음)' : `나: ${S.slot}번 타자 · 승부처 ${clutchRange(S.slot)}`, 14, 72, { f: 's', col: P.y3 });
      if (S.me.tired && S.rest !== 'me') { G_.icon(c, 'sweat', 136, 71); }
      trustGauge(c, 166, 25, 146, S);
      G_.panel(c, 162, 52, 154, 40, { bg: P.n1 });
      bust(c, 'coach', 0, 160, 46 - 6); c.save(); c.beginPath(); c.rect(0, 0, 0, 0); c.restore();
      const tip = S.lock ? '권한이 잠겼습니다. 이기면 신뢰가 돌아옵니다.' : S.phase === 'post' ? '단기전입니다. 승부처 하나가 시리즈를 바꿉니다.' : K.isParachute(S) ? '타순이 실적보다 높습니다. 팬들이 지켜봅니다.' : `지금 실적이면 ${K.recommendSlot(S)}번이 무난합니다.`;
      rect(c, 160, 54, 46, 36, P.n1); bustMini(c, 168, 56);
      G_.textBox(c, tip, 206, 57, 106, { f: 's', col: P.w3 });
      // 작전 카드
      text(c, '작전 카드 1장 선택', 8, 95, { f: 's', col: P.n6 });
      cards.forEach((cd, i) => { const x = 6 + i * 72, y = 106; card(c, x, y, 69, 41, cd.name, cd.desc, { sel: sel === i, icon: cd.icon, band: cd.id === 'normal' ? P.n3 : P.r2 }); hit('cd' + i, x, y, 69, 41, () => { sel = i; Sound.play('card'); }); });
      btn(c, 'start', 230, 120, 84, 22, '경기 시작', () => { S.tactic = cards[Math.max(0, sel)].id; saveGame(); go(Scenes.match(fx, ace)); }, { disabled: sel < 0 });
      if (first) btn(c, 'practice', 230, 98, 84, 16, '타격 연습', () => go(Scenes.bat({ practice: true, sit: { inn: 1, top: false, outs: 0, bases: [false, false, false], kia: 0, opp: 0 }, opp: fx.opp, theme: fx.home ? 'home' : 'away', onEnd: () => go(self) })), { kind: 'gold', f: 's' });
      else { btn(c, 'stand', 230, 98, 40, 16, '순위', () => go(Scenes.standings(() => go(self))), { kind: 'navy', f: 's' });
        btn(c, 'quit', 274, 98, 40, 16, '저장', () => { saveGame(); go(Scenes.title()); }, { kind: 'ghost', f: 's' }); }
    },
  };
  return self;
};
const clutchRange = slot => { const nb = K.BAL.clutchByTier[slot]; const lo = Math.max(3, Math.min(...nb)), hi = Math.max(3, Math.max(...nb)); return lo === hi ? `${lo}번` : `${lo}~${hi}번`; };
function bustMini(c, x, y) { const b = G_.bustSprite('coach', 0, 0); c.drawImage(b, 4, 0, 40, 34, x - 6, y, 40, 34); }

// ============================================================================
// 경기 결과 → 보상 카드
// ============================================================================
Scenes.result = (M) => {
  const S = App.S, R = App.R; let out, cards, sel = -1, phase = 'news', t = 0, postRes = null; const preStats = { ...S.me.st };
  return {
    enter() {
      if (S.phase === 'post' && S.post.round === 'ks') { S.post.ks.cl += M.my.cl.length; S.post.ks.ok += M.my.cl.filter(c => c.ok).length; }
      out = K.finishGame(S, M, R);
      if (S.phase === 'post') postRes = K.postResult(S, M.win);
      cards = K.drawCards(S, R, 'reward', M.win);
      out.titles.forEach(tt => { if (!Meta.titles.includes(tt.id)) { Meta.titles.push(tt.id); } }); saveMeta();
      Sound.play(M.win ? 'fanfare' : 'down'); if (out.locked) setTimeout(() => Sound.play('boo'), 600);
      saveGame(); Coach.once('result', TUT.result);
    },
    update(dt) { t += dt; },
    draw(c) {
      menuBg(c, S.trust, 0.7);
      if (phase === 'news') {
        const d = S.phase === 'post' ? '가을야구' : `${S.log.length}경기`;
        newspaper(c, 8, 6, 176, 66, out.headline, out.moment ? '명장면: ' + out.moment.txt : (M.win ? '팬들의 함성이 그치지 않았다.' : '광주의 밤이 조용했다.'), d);
        // 스코어
        G_.panel(c, 8, 76, 176, 66, { bg: P.n1 });
        G_.badge(c, 'KIA', 14, 82, 32, 13); text(c, M.score.kia, 64, 81, { f: 'b', col: M.win ? P.up : P.w2, a: 'c', sc: 1 }); text(c, ':', 80, 81, { f: 'b', col: P.w1, a: 'c' }); text(c, M.score.opp, 96, 81, { f: 'b', col: !M.win ? P.up : P.w2, a: 'c' }); G_.badge(c, M.opp, 114, 82, 32, 13);
        text(c, M.win ? '승리' : '패배', 176, 82, { f: 'b', col: M.win ? P.up : P.dn, a: 'r' });
        const m = M.my; const cl = m.cl.length, ok = m.cl.filter(x => x.ok).length;
        text(c, S.me.name, 14, 99, { f: 'b', col: P.y3 });
        text(c, M.meRest ? '휴식' : `${m.ab}타수 ${m.h}안타` + (m.hr ? ` ${m.hr}홈런` : '') + (m.rbi ? ` ${m.rbi}타점` : '') + (m.sb ? ` 도루${m.sb}` : ''), 14, 113, { f: 's', col: P.w3 });
        text(c, `승부처 ${ok}/${cl} 성공`, 14, 125, { f: 's', col: cl && ok / cl >= 0.6 ? P.up : cl && ok / cl < 0.4 ? P.dn : P.w3 });
        let cx = 100; m.cl.forEach(x => { G_.icon(c, x.kind === 'bat' ? 'bat' : x.kind === 'fld' ? 'glove' : 'shoe', cx, 124, x.ok ? null : [P.n3, P.n4, P.n2]); cx += 11; });
        // 신뢰 변동
        G_.panel(c, 190, 6, 124, 112, { bg: P.n1 });
        text(c, '팬 신뢰', 198, 11, { f: 'b' });
        const dv = Math.round(S.trust - out.trust0); text(c, (dv > 0 ? '+' : '') + dv, 306, 11, { f: 'b', col: dv > 0 ? P.up : dv < 0 ? P.dn : P.w2, a: 'r' });
        out.deltas.slice(0, 5).forEach(([why, v], i) => { G_.icon(c, v > 0 ? 'up' : 'dn', 198, 27 + i * 12); text(c, why, 209, 27 + i * 12, { f: 's', col: P.w3 }); text(c, (v > 0 ? '+' : '') + v, 306, 27 + i * 12, { f: 's', col: v > 0 ? P.up : P.dn, a: 'r' }); });
        trustGauge(c, 198, 80, 108, S, false);
        if (out.tpGain != null) { G_.icon(c, 'coin', 198, 103); text(c, `훈련 포인트 +${out.tpGain}`, 209, 103, { f: 's', col: P.y3 }); }
        if (out.locked) { rect(c, 190, 120, 124, 22, P.dn); G_.icon(c, 'lock', 196, 126); text(c, '권한 잠김! 코치가 정함', 208, 126, { f: 's' }); }
        else if (out.unlocked) { rect(c, 190, 120, 124, 22, P.up); text(c, `${out.unlocked} 권한 복구!`, 252, 126, { f: 's', a: 'c' }); }
        else btn(c, 'nx', 190, 122, 124, 20, '보상 카드', () => { phase = 'reward'; t = 0; Sound.play('card'); });
        if (out.locked || out.unlocked) hit('nx2', 190, 120, 124, 22, () => { phase = 'reward'; t = 0; });
      } else {
        header(c, M.win ? '승리 보상 · 1장 선택' : '보상 · 1장 선택', '능력치는 바로 오름');
        cards.forEach((cd, i) => { const w = 92, x = 14 + i * 100, y = 30; card(c, x, y, w, 56, cd.name, cd.desc, { sel: sel === i, rare: cd.rare, band: cd.rare ? P.y1 : cd.id === 'fan' ? P.n3 : P.r2 }); hit('rw' + i, x, y, w, 56, () => { sel = i; Sound.play('card'); }); });
        G_.panel(c, 14, 92, 192, 50, { bg: P.n1 });
        K.STATS.forEach((k, i) => statRow(c, 20 + (i % 2) * 94, 97 + Math.floor(i / 2) * 12, k, S.me.st[k] + (sel >= 0 && cards[sel].id === k ? 3 : sel >= 0 && cards[sel].id === 'all' ? 2 : 0), 86, sel >= 0 && (cards[sel].id === k || cards[sel].id === 'all')));
        text(c, `종합 ${K.ovr(S.me)}`, 114, 121, { f: 's', col: P.y3 });
        btn(c, 'take', 214, 120, 98, 22, '받기', () => { K.applyReward(S, cards[sel]); Sound.play('up'); if (out.titles.length) go(Scenes.titlePop(out.titles, () => Flow.afterGame(postRes))); else Flow.afterGame(postRes); }, { disabled: sel < 0 });
      }
    },
  };
};
Scenes.titlePop = (list, then) => ({
  enter() { Sound.play('fanfare'); }, draw(c) { menuBg(c, 90, 0.75); confetti(c, App.t); header(c, '칭호 획득!'); list.slice(0, 3).forEach((tt, i) => { G_.panel(c, 50, 30 + i * 32, 220, 28, { bg: P.n2, br: P.y2 }); G_.icon(c, 'crown', 58, 39 + i * 32); text(c, tt.name, 72, 34 + i * 32, { f: 'b', col: P.y3 }); text(c, tt.d, 72, 46 + i * 32, { f: 's', col: P.w2 }); }); btn(c, 'ok', 120, 126, 80, 18, '좋아', then); },
});

// ============================================================================
// 팀 관리: 타순 / 기용 / 훈련
// ============================================================================
Scenes.manage = () => {
  const S = App.S, R = App.R; let tab = 'slot', snap;
  const TABS = [['slot', '타순'], ['rest', '기용'], ['train', '훈련']];
  return {
    enter() { K.coachManage(S, R); snap = { st: { ...S.me.st }, tp: S.tp, tt: S.teamTrain }; if (!K.canEdit(S, 'slot')) tab = K.canEdit(S, 'rest') ? 'rest' : 'train'; if (S.lock) Coach.once('lock', TUT.lock); else Coach.once('manage', TUT.manage); },
    draw(c) {
      menuBg(c, S.trust, 0.75);
      header(c, '팀 관리', S.phase === 'post' ? K.ROUND[S.post.round].name : `다음: ${S.gi + 1}경기`);
      TABS.forEach(([id, lab], i) => { const lock = !K.canEdit(S, id); const x = 6 + i * 60; btn(c, 'tab' + id, x, 22, 56, 16, lab, () => { tab = id; }, { kind: tab === id ? 'red' : 'navy', f: 's', icon: lock ? 'lock' : null }); });
      trustGauge(c, 196, 21, 116, S);
      const locked = !K.canEdit(S, tab);
      G_.panel(c, 6, 42, 306, 80, { bg: P.n1 });
      if (tab === 'slot') this.slotTab(c, locked); else if (tab === 'rest') this.restTab(c, locked); else this.trainTab(c, locked);
      if (locked) { c.save(); c.globalAlpha = 0.86; rect(c, 8, 44, 302, 76, P.n0); c.restore(); G_.panel(c, 84, 62, 152, 40, { bg: P.n1, br: P.dn }); G_.icon(c, 'lock', 112, 69); text(c, '코치가 정함', 124, 68, { f: 'b' }); text(c, `팬 신뢰 ${K.BAL.trust.unlock[3 - S.lock]} 이상이면 복구`, 160, 86, { f: 's', col: P.n6, a: 'c' }); }
      moneyChip(c, 10, 130, S); text(c, `종합 ${K.ovr(S.me)}`, 40, 130, { f: 's', col: P.w2 });
      btn(c, 'go', 206, 126, 106, 18, S.phase === 'post' || S.gi < 18 ? '다음 경기 ▶' : '시즌 마무리', () => { saveGame(); Flow.fromManage(); });
    },
    slotTab(c, locked) {
      const order = K.lineup(S); const rec = K.recommendSlot(S);
      order.forEach((p, i) => {
        const x = 12 + (i % 3) * 66, y = 47 + Math.floor(i / 3) * 24; const me = p.me;
        const id = 'sl' + i; const pr = !locked && hit(id, x, y, 62, 21, () => { S.slot = i + 1; Sound.play('click'); });
        G_.panel(c, x, y + (pr ? 1 : 0), 62, 21, { bg: me ? P.r1 : P.n2, br: me ? P.r3 : i + 1 === rec ? P.y2 : P.n4, dk: P.n0 });
        text(c, i + 1, x + 5, y + 4, { f: 'b', col: me ? P.y3 : P.n6 });
        text(c, me ? S.me.name : p.name, x + 15, y + 3, { f: 's', col: P.w4 });
        const ov = me ? K.ovr(S.me) : p.ovr; G_.bar(c, x + 15, y + 15, 30, 2, ov, 99, me ? P.y3 : P.n5); G_.drawNum(c, x + 53, y + 13, ov, me ? P.y3 : P.w1, P.n0);
      });
      text(c, '내 타순', 214, 48, { f: 's', col: P.n6 }); text(c, S.slot + '번', 306, 46, { f: 'b', col: P.y3, a: 'r' });
      text(c, `승부처 ${clutchRange(S.slot)}`, 214, 62, { f: 's', col: P.w3 });
      text(c, `코치 추천 ${rec}번`, 214, 74, { f: 's', col: P.y2 });
      if (K.isParachute(S)) { G_.icon(c, 'dn', 213, 87); G_.textBox(c, '낙하산 타순: 경기마다 신뢰 -6', 224, 87, 84, { f: 's', col: P.dn }); }
      else if (S.slot === 4 && K.ovr(S.me) < 65) { G_.textBox(c, '실력 부족 4번: 팀 전력 손해', 214, 87, 94, { f: 's', col: P.dn }); }
      else G_.textBox(c, '칸을 눌러 내 자리를 옮김', 214, 87, 94, { f: 's', col: P.w0 });
    },
    restTab(c, locked) {
      const list = [{ me: true, name: S.me.name, pos: '나', tired: S.me.tired, key: 'me' }, ...S.mates.map((m, i) => ({ ...m, key: i }))];
      list.forEach((p, i) => {
        const x = 12 + (i % 3) * 66, y = 47 + Math.floor(i / 3) * 24; const on = S.rest === p.key;
        const pr = !locked && hit('rs' + i, x, y, 62, 21, () => { K.setRest(S, on ? null : p.key); Sound.play('click'); });
        G_.panel(c, x, y + (pr ? 1 : 0), 62, 21, { bg: on ? P.n3 : p.me ? P.r1 : P.n2, br: on ? P.w3 : p.tired ? P.dn : P.n4 });
        text(c, on ? (p.me ? '나 휴식' : K.BENCH[p.key % K.BENCH.length]) : p.name, x + 4, y + 6, { f: 's', col: on ? P.n6 : P.w4 });
        G_.icon(c, on ? 'bed' : p.tired ? 'sweat' : 'fire', x + 51, y + 6, on ? null : p.tired ? null : [P.r1, P.r3, P.y3]);
      });
      G_.textBox(c, '땀 표시 = 지침\n쉬게 하면 신뢰 +2\n(안 지쳐도 +1)\n한 명만 가능\n나를 쉬면\n자동 경기', 214, 46, 94, { f: 's', col: P.w2, lh: 11 });
    },
    trainTab(c, locked) {
      K.STATS.forEach((k, i) => { const y = 47 + i * 14; statRow(c, 14, y, k, S.me.st[k], 150, S.me.st[k] > snap.st[k]); btn(c, 'tr' + k, 170, y - 1, 26, 12, '+2', () => { if (K.train(S, k)) Sound.play('coin'); }, { kind: 'gold', f: 's', disabled: locked || S.tp <= 0 }); });
      text(c, '팀 훈련', 214, 47, { f: 's', col: P.w2 }); const steps = Math.round(S.teamTrain / K.BAL.teamTrainStep);
      for (let i = 0; i < 6; i++) rect(c, 214 + i * 13, 60, 11, 6, i < steps ? P.ok : P.n3);
      btn(c, 'trT', 214, 70, 90, 14, '팀에 1포인트', () => { if (K.train(S, 'team')) Sound.play('coin'); }, { kind: 'navy', f: 's', disabled: locked || S.tp <= 0 || steps >= 6 });
      G_.textBox(c, '팀 전력이 조금씩\n오름 (6단계까지)', 214, 89, 94, { f: 's', col: P.w0, lh: 11 });
      btn(c, 'undo', 120, 126, 60, 16, '되돌리기', () => { S.me.st = { ...snap.st }; S.tp = snap.tp; S.teamTrain = snap.tt; }, { kind: 'ghost', f: 's', disabled: locked });
    },
  };
};

// ============================================================================
// 이벤트 (선물시장 등)
// ============================================================================
Scenes.event = () => {
  const S = App.S, R = App.R; let evs, ev, picked = null, t = 0;
  return {
    enter() { evs = K.pickEvents(S, R); ev = evs[0]; Sound.play(ev.art === 'chartDown' ? 'alarm' : 'coin'); Coach.once('event', TUT.event); },
    update(dt) { t += dt; },
    draw(c) {
      rect(c, 0, 0, LW, LH, P.n0); header(c, '이벤트', `${S.gi}경기 종료 후`);
      if (ev.art === 'chartUp' || ev.art === 'chartDown') chartMonitor(c, 16, 30, 110, 64, t, ev.art === 'chartUp' ? 1 : -1, ev.art === 'chartDown');
      else if (ev.art === 'mic') { menuBg(c, 60, 0.6); rect(c, 0, 0, LW, 18, P.n1); header(c, '이벤트', `${S.gi}경기 종료 후`); bust(c, 'me', 2, 50, 36, S); bust(c, 'press', 0, 8, 50); G_.icon(c, 'mic', 46, 80); }
      else { bust(c, 'coach', 0, 46, 36); }
      text(c, ev.title, 140, 26, { f: 'b', col: P.y3 });
      G_.textBox(c, ev.text, 140, 42, 172, { col: P.w3 });
      ev.opts.forEach((o, i) => { const y = 78 + i * 34; btn(c, 'op' + i, 140, y, 174, 31, '', () => { if (picked) return; picked = o; o.f(S, R); Sound.play('up'); saveGame(); setTimeout(() => Flow.afterEvent(), 350); }, { kind: i ? 'navy' : 'red' }); text(c, o.t, 147, y + 3, { f: 'b' }); text(c, o.d.replace('\n', ' '), 147, y + 18, { f: 's', col: P.c3 }); });
      moneyChip(c, 16, 130, S); text(c, `신뢰 ${S.trust}`, 50, 130, { f: 's', col: P.w2 });
    },
  };
};

// ============================================================================
// 순위표
// ============================================================================
Scenes.standings = (back) => {
  const S = App.S;
  return {
    draw(c) {
      menuBg(c, S.trust, 0.8); header(c, '순위', `${S.gi}경기 진행`);
      const st = K.standings(S); const top = st[0];
      st.forEach((r, i) => {
        const x = i < 5 ? 10 : 164, y = 24 + (i % 5) * 20; const kia = r.t === 'KIA';
        G_.panel(c, x, y, 146, 18, { bg: kia ? P.r1 : P.n1, br: kia ? P.r3 : i < 5 ? P.n4 : P.n3 });
        text(c, r.rank, x + 8, y + 3, { f: 'b', col: i < 5 ? P.y3 : P.w1, a: 'c' }); G_.badge(c, r.t, x + 16, y + 3, 30, 12);
        text(c, `${r.w}승 ${r.l}패`, x + 54, y + 4, { f: 's' });
        const gb = ((top.w - r.w) + (r.l - top.l)) / 2; text(c, gb ? gb.toFixed(1) : '-', x + 140, y + 4, { f: 's', col: P.w1, a: 'r' });
      });
      text(c, '5위까지 가을야구 (와일드카드부터)', 10, 128, { f: 's', col: P.y2 });
      btn(c, 'back', 236, 126, 76, 18, '닫기', back);
    },
  };
};

// ============================================================================
// 올스타 브레이크: 홈런 더비 (타격 미니게임 재사용)
// ============================================================================
Scenes.allstar = () => {
  const S = App.S; let stage = 0, hr = 0;
  return {
    enter() { if (stage === 0) { Sound.play('fanfare'); Coach.once('allstar', TUT.allstar); } },
    draw(c) {
      menuBg(c, 95, 0.55); confetti(c, App.t, 20); header(c, '올스타 브레이크', '9경기 종료');
      if (stage === 0) {
        G_.panel(c, 40, 30, 240, 80, { bg: P.n1 }); text(c, '홈런 더비', 160, 36, { f: 'b', col: P.y3, a: 'c', sc: 2, out: P.y0 });
        G_.textBox(c, '공 10개. 넘긴 만큼 파워가 오릅니다.\n(2개당 +1, 5개 이상이면 칭호)\n쉬는 동안 팀 전원 컨디션 회복.', 50, 66, 220, { f: 's', col: P.w3, a: 'c' });
        btn(c, 'go', 110, 116, 100, 22, '도전', () => go(Scenes.bat({ derby: true, onEnd: n => { hr = n; stage = 1; S.flags.derbyHR = n; const inc = Math.ceil(n / 2); S.me.st.pow = Math.min(99, S.me.st.pow + inc); S.mates.forEach(m => { m.tired = false; m.consec = 0; }); S.me.tired = false; S.me.consec = 0; K.checkTitles(S).forEach(t => { if (!Meta.titles.includes(t.id)) Meta.titles.push(t.id); }); saveMeta(); saveGame(); go(this); } })));
      } else {
        G_.panel(c, 60, 34, 200, 70, { bg: P.n1 }); text(c, `홈런 ${hr}개`, 160, 42, { f: 'b', col: P.y3, a: 'c', sc: 2, out: P.y0 });
        text(c, `파워 +${Math.ceil(hr / 2)}  ·  팀 컨디션 회복`, 160, 74, { f: 's', col: P.up, a: 'c' });
        btn(c, 'ok', 110, 116, 100, 22, '후반기로', () => Flow.afterEvent());
      }
    },
  };
};

// ============================================================================
// 가을야구 안내 / 라운드 안내
// ============================================================================
Scenes.postIntro = (kind) => {
  const S = App.S; let t = 0;
  return {
    enter() { if (kind === 'round') Coach.once('post', TUT.post); },
    update(dt) { t += dt; },
    draw(c) {
      menuBg(c, S.trust, 0.7);
      if (kind === 'final') {
        header(c, '정규시즌 종료');
        const rk = S.finalRank; text(c, `최종 ${rk}위`, 160, 30, { f: 'b', col: rk <= 5 ? P.y3 : P.dn, a: 'c', sc: 2, out: P.n0 });
        text(c, `${S.W.KIA}승 ${S.L.KIA}패`, 160, 58, { f: 'b', a: 'c' });
        text(c, rk <= 5 ? '가을야구 진출!' : '가을야구 탈락…', 160, 76, { f: 'b', col: rk <= 5 ? P.up : P.dn, a: 'c' });
        if (rk <= 5) text(c, `${K.ROUND[S.post.round].name}부터 시작`, 160, 92, { f: 's', col: P.w2, a: 'c' });
        btn(c, 'go', 110, 116, 100, 22, rk <= 5 ? '가을야구로' : '시즌 정리', () => { if (rk <= 5) go(Scenes.postIntro('round')); else Flow.end(); });
      } else {
        const P_ = S.post; header(c, '가을야구', K.ROUND[P_.round].name);
        text(c, K.ROUND[P_.round].name, 160, 30, { f: 'b', col: P.y3, a: 'c', sc: 2, out: P.y0 });
        G_.badge(c, 'KIA', 100, 62, 40, 15); text(c, 'VS', 160, 64, { f: 'b', a: 'c' }); G_.badge(c, P_.opp, 180, 62, 40, 15);
        text(c, P_.round === 'wc' ? (P_.rank === 4 ? '4위 어드밴티지: 1승만 하면 통과' : '5위: 2연승 필요') : `${P_.need}승 먼저`, 160, 86, { f: 's', col: P.w2, a: 'c' });
        if (P_.round === 'ks') text(c, '승부처 성공률 60% 이상으로 우승하면 MVP', 160, 100, { f: 's', col: P.r4, a: 'c' });
        btn(c, 'go', 110, 116, 100, 22, '시작', () => go(Scenes.manage()));
      }
    },
  };
};

// ============================================================================
// 엔딩
// ============================================================================
Scenes.ending = () => {
  const S = App.S; let i = 0, t = 0; const type = S.ending;
  const cuts = {
    true: [
      { a: 'champ', txt: '한국시리즈 우승. 그리고 MVP는…' },
      { a: 'mvp', txt: `"MVP, KIA 타이거즈 ${S.me.name}!"` },
      { a: 'me1', txt: '"이제 선물은 접는다. 야구만 하겠습니다."' },
      { a: 'night', txt: '그날 밤.' },
      { a: 'chart', txt: '...딱 한 번만.' },
    ],
    champ: [{ a: 'champ', txt: '한국시리즈 우승!' }, { a: 'side', txt: 'MVP 인터뷰는… 옆에서 구경했다.' }, { a: 'chart', txt: '"내년엔 MVP다." 차트를 켰다.' }],
    postout: [{ a: 'rain', txt: '가을야구에서 멈췄다.' }, { a: 'chart', txt: '"내년을 기약합니다." 그리고 차트를 켰다.' }],
    miss: [{ a: 'rain', txt: '가을야구 탈락.' }, { a: 'paper', txt: '구단주, 시즌 종료 후 침묵.' }],
    locked: [{ a: 'paper', txt: '시즌 내내 코치가 라인업을 짰다.' }, { a: 'coach', txt: '"구단주님은… 좋은 9번이셨습니다."' }],
  }[type] || [];
  return {
    enter() { Sound.play(type === 'true' || type === 'champ' ? 'fanfare' : 'down'); },
    update(dt) { t += dt; },
    draw(c) {
      if (i >= cuts.length) return this.summary(c);
      const cut = cuts[i];
      if (cut.a === 'champ' || cut.a === 'mvp') { menuBg(c, 100, 0.35); confetti(c, App.t, 60); c.drawImage(G_.batterSprite('joy', look(S)), 160 - G_.BAX, 120 - G_.BAY); trophy(c, 250, 40); if (cut.a === 'mvp') { text(c, 'MVP', 160, 14, { f: 'b', col: P.y3, a: 'c', sc: 2, out: P.y0 }); } }
      else if (cut.a === 'me1') { menuBg(c, 100, 0.5); bust(c, 'me', 1, 136, 30, S); G_.icon(c, 'mic', 186, 70); }
      else if (cut.a === 'night') { rect(c, 0, 0, LW, LH, P.n0); for (let k = 0; k < 30; k++) px(c, (k * 53) % LW, (k * 31) % 90, P.n5); }
      else if (cut.a === 'chart') { rect(c, 0, 0, LW, LH, P.n0); chartMonitor(c, 90, 10, 140, 80, t, 1); }
      else if (cut.a === 'side') { menuBg(c, 90, 0.5); confetti(c, App.t, 20); bust(c, 'fan', 1, 200, 30); bust(c, 'me', 2, 70, 40, S); }
      else if (cut.a === 'rain') { menuBg(c, 20, 0.6, 'away'); for (let k = 0; k < 60; k++) { const x = (k * 37 + App.t * 40) % LW, y = (k * 23 + App.t * 160) % LH; rect(c, x, y, 1, 3, P.n5); } c.drawImage(G_.batterSprite('sad', look(S)), 160 - G_.BAX, 110 - G_.BAY); }
      else if (cut.a === 'paper') { rect(c, 0, 0, LW, LH, P.n1); newspaper(c, 70, 10, 180, 80, cut.txt, '', '시즌 종료'); }
      else if (cut.a === 'coach') { menuBg(c, 30, 0.6); bust(c, 'coach', 1, 136, 30); }
      rect(c, 0, 104, LW, 44, 'rgba(10,14,36,0.85)'); rect(c, 0, 104, LW, 1, P.n4);
      const n = Math.floor(t * 24); G_.textBox(c, cut.txt.slice(0, n), 16, 114, LW - 32);
      hit('adv', 0, 0, LW, LH, () => { if (n < cut.txt.length) { t = 99; return; } i++; t = 0; });
    },
    summary(c) {
      menuBg(c, S.trust, 0.8); header(c, '시즌 기록', { true: '트루 엔딩', champ: '우승 엔딩', postout: '가을야구 엔딩', miss: '탈락 엔딩', locked: '코치 엔딩' }[type]);
      const st = S.stats; const avg = st.ab ? (st.h / st.ab).toFixed(3).replace(/^0/, '') : '.000';
      G_.panel(c, 8, 22, 150, 100, { bg: P.n1 });
      [[`정규시즌`, `${S.W.KIA}승 ${S.L.KIA}패 · ${S.finalRank}위`], ['타율', `${avg} (${st.ab}타수 ${st.h}안타)`], ['홈런 / 타점', `${st.hr} / ${st.rbi}`], ['도루', st.sb], ['승부처', `${st.clOk}/${st.cl} 성공`], ['최종 종합', K.ovr(S.me)]].forEach(([a, b], k) => { text(c, a, 14, 27 + k * 15, { f: 's', col: P.n6 }); text(c, b, 152, 27 + k * 15, { f: 's', a: 'r' }); });
      G_.panel(c, 162, 22, 150, 100, { bg: P.n1 }); text(c, `칭호 ${S.titles.length}개`, 168, 26, { f: 'b', col: P.y3 });
      S.titles.slice(0, 6).forEach((id, k) => { const tt = K.TITLES.find(x => x.id === id); G_.icon(c, 'crown', 168, 44 + k * 12); text(c, tt.name, 180, 44 + k * 12, { f: 's' }); });
      btn(c, 'end', 120, 126, 80, 18, '타이틀로', () => { Store.del(SAVE_KEY); go(Scenes.title()); });
    },
  };
};
function trophy(c, x, y) { G_.ell(c, x, y + 10, 14, 12, G_.PAL.gold, { clip: (xx, yy) => yy > y + 4 }); rect(c, x - 14, y + 4, 29, 2, P.y2); rect(c, x - 2, y + 22, 5, 10, P.y1); rect(c, x - 9, y + 32, 19, 5, P.y2); rect(c, x - 9, y + 32, 19, 1, P.y4); G_.ell(c, x - 15, y + 12, 4, 5, G_.PAL.gold, { hi: false }); G_.ell(c, x + 15, y + 12, 4, 5, G_.PAL.gold, { hi: false }); }

// ============================================================================
// 칭호 목록
// ============================================================================
Scenes.titles = () => { let sel = -1; return {
  draw(c) {
    menuBg(c, 50, 0.8); header(c, '칭호', `${Meta.titles.length}/${K.TITLES.length} 획득`);
    K.TITLES.forEach((tt, i) => { const x = 8 + (i % 2) * 154, y = 21 + Math.floor(i / 2) * 15; const got = Meta.titles.includes(tt.id);
      const pr = hit('tt' + i, x, y, 150, 14, () => { sel = i; });
      G_.panel(c, x, y + (pr ? 1 : 0), 150, 14, { bg: sel === i ? P.n3 : got ? P.n2 : P.n1, br: got ? P.y2 : P.n3 }); G_.icon(c, got ? 'crown' : 'lock', x + 4, y + 3, got ? null : [P.n4, P.n3, P.n3]); text(c, got ? tt.name : '???', x + 16, y + 3, { f: 's', col: got ? P.y3 : P.w0 }); });
    G_.panel(c, 8, 113, 222, 32, { bg: P.n1 });
    if (sel >= 0) { const tt = K.TITLES[sel]; const got = Meta.titles.includes(tt.id); text(c, got ? tt.name : '잠긴 칭호', 14, 116, { f: 's', col: got ? P.y3 : P.w1 }); text(c, '조건: ' + tt.d, 14, 128, { f: 's', col: P.w3 }); }
    else text(c, '칭호를 누르면 조건이 보임 · 이 기기에 저장', 14, 122, { f: 's', col: P.w1 });
    btn(c, 'back', 236, 126, 76, 18, '닫기', () => go(Scenes.title()));
  },
}; };

// ============================================================================
// 시즌 흐름
// ============================================================================
const Flow = {
  newSeason(o) { const S = K.newSeason(o); App.S = S; App.R = K.rng(S.rs); Meta.runs++; saveMeta(); saveGame(); go(Scenes.opening()); },
  resume() { const S = loadGame(); if (!S) return; App.S = S; App.R = K.rng(S.rs); if (S.ending) go(Scenes.ending()); else if (S.phase === 'post' && S.post && S.post.out) Flow.end(); else go(Scenes.manage()); },
  toBrief() { go(Scenes.brief()); },
  fromManage() { const S = App.S; if (S.phase === 'reg' && S.gi >= 18) { K.startPost(S); saveGame(); go(Scenes.postIntro('final')); return; } go(Scenes.brief()); },
  afterGame(postRes) {
    const S = App.S;
    if (S.phase === 'reg') {
      const ev = K.eventAfter(S.gi);
      if (ev === 'event') return go(Scenes.event());
      if (ev === 'allstar') return go(Scenes.allstar());
      if (S.gi >= 18) { K.startPost(S); saveGame(); return go(Scenes.postIntro('final')); }
      return go(Scenes.manage());
    }
    if (postRes === 'champion' || postRes === 'eliminated') return Flow.end();
    if (postRes === 'advance') return go(Scenes.postIntro('round'));
    go(Scenes.manage());
  },
  afterEvent() { const S = App.S; if (S.gi >= 18) { K.startPost(S); saveGame(); return go(Scenes.postIntro('final')); } go(Scenes.manage()); },
  end() { const S = App.S; S.ending = K.ending(S); K.checkTitles(S).forEach(t => { if (!Meta.titles.includes(t.id)) Meta.titles.push(t.id); }); saveMeta(); saveGame(); go(Scenes.ending()); },
};
window.Flow = Flow;
