# 인수인계 설명서 — 『나는 타자겸 감독이 되었습니다』 v1.4

> **이 문서를 받은 AI에게**: 이 저장소 하나에 게임·시뮬·테스트 도구·문서가 다 있다. 이 문서만 읽으면 구조를 이해하고 고칠 수 있게 썼다.
> 게임 기획(무엇을·왜)은 `docs/DESIGN.md`, 그림·소리 목록은 `docs/ASSETS.md`. **코드를 고치기 전에 §12 "자주 하는 작업"과 §13 "함정"을 먼저 읽을 것.**
> 소유자: 재민 (반말·짧게·결론부터 선호, 영어 약어 대신 우리말). 배포: https://jjamout88.github.io/kbo-feel/app/

---

## 0. 30초 요약
- 아이폰 가로(844×390) **도트 야구 웹게임**. 순수 HTML/JS, 빌드 도구·프레임워크·외부 라이브러리 없음. 이미지 파일도 없음(그림은 전부 코드로 그림)
- 플레이어 = KIA 구단주 = 9번 타자 = 감독. 경기는 자동 진행(전광판 빨리감기), **승부처**에서만 미니게임 4종(타격·수비·홈 쇄도·도루)
- **게임 규칙은 전부 `app/js/core.js` 한 파일**이고, 브라우저 게임과 Node 시뮬(`sim/sim.js`)이 **같은 파일을 그대로** 쓴다 → 규칙을 바꾸면 시뮬로 바로 밸런스 확인 가능
- 화면은 320×148 저해상도 캔버스에 그리고 4배 확대 출력. 모든 UI는 캔버스 즉시 모드(매 프레임 그리며 버튼 등록)
- 테스트: 봇이 시즌 전체를 실제로 플레이하는 Playwright 스크립트(`tools/e2e.py`), 전 화면 캡처(`tools/gallery.py`), 미니게임 성공률 측정(`tools/calib.py`)
- 배포: `main` 브랜치에 푸시하면 GitHub Pages가 `app/`을 서비스. **`app/sw.js`의 `CACHE` 버전을 꼭 올릴 것**(안 올리면 설치된 앱이 옛 버전에 머묾)

## 1. 저장소 구조
```
kbo-feel/
├─ HANDOFF.md            ← 이 문서
├─ app/                  ← 게임 본체 (GitHub Pages가 이 폴더를 서비스)
│  ├─ index.html         진입점. 스크립트 로드 순서가 중요(§3)
│  ├─ manifest.webmanifest, sw.js, icons/   웹앱(홈 화면 설치·오프라인)
│  ├─ fonts/             갈무리 11 Bold/11/9 woff2 (한글 2,350자로 잘라낸 것, 합계 130KB)
│  └─ js/
│     ├─ roster.js       선수 명단 데이터 (자동 생성: tools/make_roster.py)
│     ├─ core.js         게임 규칙 전부 (경기 엔진·승부처·신뢰·관리·카드·이벤트·가을야구·칭호·헤드라인)
│     ├─ gfx.js          320×148 도트 렌더러: 팔레트, 글자, 캐릭터·구장·UI 그리기
│     ├─ scenes.js       경기 밖 화면 전부 + 시즌 흐름(Flow) + 코치 대사(TUT)
│     ├─ match.js        경기 화면(전광판 빨리감기) + 승부처 진입/복귀
│     ├─ mg_bat.js       타격 미니게임 (+ 홈런 더비, 타격 연습)
│     ├─ mg_field.js     수비 위기 / 홈 쇄도 / 도루 미니게임
│     └─ main.js         루프·화면 맞춤·입력·소리·저장·장면 전환·코치 말풍선
├─ sim/
│  ├─ sim.js             시즌 시뮬 (node sim/sim.js 1000)
│  ├─ players_2027.json  2026 스탯티즈 기반 능력치 원본 (구단 전력 + 타자·투수)
│  └─ results_v2.md      최근 시뮬 결과
├─ tools/                테스트·제작 도구 (§10)
├─ docs/                 DESIGN.md(기획서), ASSETS.md(에셋 목록), screens/(화면 캡처)
└─ index.html, game.js, img/, shots/, test.py, Galmuri*.ttf
                         ← 옛 "타격감 튜너"(v0.3 시절 프로토타입). 게임과 무관. 원본 ttf는 폰트 다시 자를 때 씀
```

## 2. 실행 · 개발 환경
| 할 일 | 방법 |
|---|---|
| 로컬 실행 | 저장소 루트에서 `python3 -m http.server 8000` → 브라우저 `http://localhost:8000/app/` (file://로 열면 폰트가 막힐 수 있음) |
| 모바일 확인 | 크롬 개발자도구 기기 모드 844×390, 또는 배포 후 아이폰 사파리 |
| 시뮬 | `node sim/sim.js 1000` (Node 18+) → 표 출력. 두 번째 인자로 파일 저장 `node sim/sim.js 1000 sim/results_v2.md` |
| 테스트 도구 | Python 3 + `pip install playwright pillow` + `playwright install chromium` |
| 폰트 다시 자르기 | `pip install fonttools brotli` 후 `pyftsubset Galmuri11.ttf --text-file=tools/chars.txt --output-file=app/fonts/Galmuri11.woff2 --flavor=woff2 --no-hinting` (3개 각각) |
| URL 옵션 | `?test` = 빠른 진행(경기 8배속·승부처 자동 시작·무음) / `?manual` = 자동 루프 끔(스크립트가 `advance(n)`으로 프레임 진행) |

## 3. 아키텍처
### 3-1. 로드 순서와 전역 객체
`index.html`이 일반 `<script>`로 순서대로 로드한다(모듈 아님). **순서를 바꾸면 깨진다.**

| 순서 | 파일 | 만드는 전역 | 비고 |
|---|---|---|---|
| 1 | roster.js | `ROSTER` | Node에선 `module.exports` |
| 2 | core.js | `K` | `K.ROSTER = ROSTER`. 화면·입력 코드 없음. Node 겸용 |
| 3 | gfx.js | `GFX` + 최상위 const `LW, LH, P, PAL, rect, px, text, ell, ...` | 다른 파일에서 `LW`, `P`, `rect`, `text`를 전역처럼 씀. **다른 파일에서 같은 이름을 const로 다시 선언하면 페이지 전체가 죽는다** |
| 4 | scenes.js | `Scenes`, `Flow`, `TUT`, `G_`(=GFX 별칭), 헬퍼 함수들 | |
| 5 | match.js | `Scenes.match`, `sitText`, `scoreBox` | |
| 6 | mg_bat.js | `Scenes.bat`, `drawBall`, `drawMsg` | |
| 7 | mg_field.js | `Scenes.field`, `Scenes.run`, `Scenes.steal` | |
| 8 | main.js | `App`, `Sound`, `Coach`, `Meta`, `Store`, `Input`, `go`, `btn`, `hit`, `toast`, `shake`, 테스트용 `advance/hits/tapId` | 폰트 로드 후 `window.ready=1`, 타이틀 시작 |
| 9 | (인라인) | 서비스 워커 등록 | https 또는 localhost에서만 |

### 3-2. 런타임 상태
- `App.S` = 현재 시즌 상태(저장 대상, §4-1). `App.R` = `K.rng(App.S.rs)` 시드 난수(규칙 쪽 난수는 전부 이것). 연출용 난수는 `Math.random`
- `App.scene` = 현재 장면 객체. `App.t` = 누적 시간(초)
- `Meta` = 기기 영구 정보(칭호·튜토리얼 진행·소리). `localStorage` 키 §8

### 3-3. 장면(Scene) 인터페이스
장면은 `Scenes.xxx(...)`가 돌려주는 평범한 객체. 메서드는 전부 선택.
```js
{ enter(),        // go()로 들어올 때마다 호출 → 재진입 가능하면 init 플래그로 1회 초기화 막을 것
  update(dt),     // 1/60초 고정 스텝. 코치 말풍선이 떠 있으면 호출 안 됨
  draw(c),        // c = 320×148 저해상도 2D 컨텍스트. 매 프레임 전체를 다시 그림
  down(p), move(p), up(p),   // p = {x, y(논리 좌표), id(포인터 id)}. 버튼 위 터치는 여기로 안 옴
  key(code) }     // 키보드(PC 테스트용)
```
- 전환: `go(scene)` = 페이드(약 0.2초 어두워짐 → 새 장면 enter → 밝아짐). **페이드가 끝날 때까지 이전 장면의 draw가 계속 불린다**(§13 함정 1)
- `go(scene, false)` = 즉시 전환

### 3-4. 입력 · 버튼 (즉시 모드)
- 매 프레임 `render()`가 `Input.hits`를 비우고 장면 `draw`를 부른다. `draw` 안에서 `btn(c, id, x, y, w, h, label, fn, opts)`가 버튼을 그리면서 히트 영역을 등록한다. 그리기만 하는 영역은 `hit(id, x, y, w, h, fn)`
- 판정: 손가락을 뗄 때(pointerup) 누른 버튼과 같은 id면 실행. `opts.instant`면 누르는 순간 실행(번트·STOP처럼 반응이 중요한 것)
- **나중에 등록한 영역이 우선**. 코치 말풍선은 마지막에 화면 전체를 등록해서 아래를 막는다
- **버튼 id는 테스트 봇이 이름으로 누른다**(`tapId('start')`). id를 바꾸면 `tools/e2e.py`의 `PRI` 목록도 고칠 것
- `btn` 옵션: `kind`: `red|navy|gold|ghost`, `f`: 글꼴(`'b'|'r'|'s'`), `icon`, `disabled`, `down`, `instant`

### 3-5. 화면 맞춤
`#wrap`(index.html)이 `max(여유, env(safe-area-inset-*))` 패딩을 갖고, `main.js` `fit()`이 **패딩을 뺀 안쪽 크기**에 320×148 비율로 맞춘다(여유: 위 6·좌우 10·아래 8px, 아이폰 둥근 모서리용). `getBoundingClientRect()`는 패딩을 포함하므로 그대로 쓰면 홈 화면 앱에서 노치·홈 막대 쪽이 잘린다(v1.3까지의 버그).

### 3-6. 렌더 파이프라인
저해상도 캔버스(320×148)에 장면 → 코치 말풍선 → 토스트 → 번쩍임 → 페이드 순으로 그림 → 실제 캔버스(1280×592)에 화면 흔들림 오프셋을 주고 4배 확대 복사 → CSS로 안전 영역(노치) 안에 비율 맞춰 축소(`image-rendering: pixelated`).

## 4. 게임 규칙 (`app/js/core.js`)
### 4-1. 시즌 상태 `S` (= `App.S`, localStorage에 통째로 저장)
| 필드 | 내용 |
|---|---|
| `v` | 저장 형식 버전 (현재 1). 구조를 크게 바꾸면 올리고 `loadGame()`에서 처리 |
| `rs`, `seed` | 시드 난수 상태 `{s}`. `K.rng(S.rs)`가 이걸 갱신 → 저장/불러오기 후에도 이어짐 |
| `easy` | 쉬움 난이도 |
| `me` | `{name, skin(0~2), hand('R'|'L'), pos('IF'|'OF'), num, st:{con,pow,eye,spd,def}, consec(연속 출전), tired}` |
| `mates[8]` | `{name, pos, ovr, consec, tired}` KIA 주전 |
| `trust` | 팬 신뢰 0~100 |
| `lock` | 권한 잠금 0~3 (3=전부 잠김, 2=타순만 풀림, 1=타순·기용 풀림) |
| `tp`, `teamTrain` | 훈련 포인트, 팀 훈련 누적(0~0.03) |
| `slot` | 내 타순 1~9 |
| `rest` | 이번 경기 휴식: `null` / `'me'` / 동료 인덱스 0~7. `restCare` = 신뢰 보너스 종류 |
| `tactic` | 이번 경기 작전 카드 id |
| `buffs` | 이벤트 효과 `{lev, mul, stat, nextStat, takeprofit, tpNext, team}` (다음 경기용) |
| `gi` | 정규시즌 다음 경기 인덱스 0~18 |
| `phase` | `'reg'|'post'` |
| `sched[18]` | `{opp, home, rival, games(그 라운드 5경기 [홈,원정] 쌍)}` |
| `W`, `L` | 구단별 승·패 (전 구단 순위표용) |
| `log[]` | 경기별 기록 `{g, opp, home, kia, oppS, win, cl, clOk, slot}` |
| `streakL/W` | 연패·연승 |
| `stats` | 시즌 누적 내 기록 `{g, pa, ab, h, hr, rbi, bb, k, sb, cl, clOk, walkoff, gw, dive}` |
| `flags` | 칭호 판정용 카운터 |
| `post` | 가을야구 `{rank, seeds[10], round('wc'|'semi'|'po'|'ks'), opp, w, l, need, oppNeed, g, ks:{cl, ok}, champion?, out?}` |
| `finalRank`, `ending`, `titles[]`, `headlines[]` | |

### 4-2. 주요 함수
| 함수 | 하는 일 |
|---|---|
| `K.newSeason({name, skin, hand, pos, num, easy, seed?})` | 새 시즌. 일정 생성(1경기 홈, 6경기 롯데 홈, 12경기 LG 원정 고정) |
| `K.kiaStrength(S)`, `K.oppStrength(S, opp)` | 경기 전력 계산 (기획서 §6 공식) |
| `K.mgmt(S)` | 관리 보너스 0~0.05 |
| `K.recommendSlot(S)`, `K.isParachute(S)` | 코치 추천 타순, 낙하산 여부 |
| `K.effStats(S)` | 미니게임에 쓰는 내 능력치(피로 −6, 버프 반영) |
| `K.lineup(S)`, `K.oppLineup(team)` | 9명 타순 (내 자리 + 코치 배치), 상대 타순 |
| `new K.Match(S, R, {fixture, ace, post})` | 경기 엔진 (§4-3) |
| `K.finishGame(S, M, R)` | 경기 정산: 승패·신뢰 변동·권한 잠금/복구·기록·훈련 포인트·피로·헤드라인·다른 구장 결과·칭호. 반환 `{win, deltas[[이유, 값]], trust0, tpGain, locked, unlocked, headline, moment, titles}` |
| `K.coachManage(S, R)` | 잠긴 권한을 코치가 처리 (관리 화면 들어올 때 호출) |
| `K.canEdit(S, 'slot'|'rest'|'train')`, `K.setRest(S, who)`, `K.train(S, stat|'team')` | 관리 조작 |
| `K.drawCards(S, R, 'tactic'|'reward', win)`, `K.applyReward(S, card)` | 카드 |
| `K.pickEvents(S, R)`, `K.eventAfter(gi)` | 이벤트 (`'event'|'allstar'|null`) |
| `K.standings(S)` | 순위표 |
| `K.startPost(S)`, `K.setupRound(S)`, `K.postFixture(S)`, `K.postResult(S, win)` | 가을야구. `postResult` → `'next'|'advance'|'champion'|'eliminated'` |
| `K.ksMVP(S)`, `K.ending(S)` | MVP, 엔딩 종류 `'true'|'champ'|'postout'|'miss'|'locked'` |
| `K.checkTitles(S)`, `K.headline(S, M, out, R)` | 칭호 판정, 헤드라인 |
| `K.playAuto(M, bot)` | 화면 없이 한 경기 끝까지 (시뮬용) |

### 4-3. 경기 엔진 `K.Match` — 이벤트 프로토콜
화면(`match.js`)과 시뮬(`sim.js`)은 같은 방식으로 엔진을 돌린다.
```js
const M = new K.Match(S, R, { fixture: {opp, home, rival}, ace, post: {round} | null });
let e;
while ((e = M.next()).type !== 'end') {
  if (e.type === 'clutch') { /* 미니게임 실행 */ const ev = M.resolve(result); }
}
```
| `next()`가 주는 이벤트 | 필드 |
|---|---|
| `half` | `inn, top, kiaBat` 반이닝 시작 |
| `pa` | `side('kia'|'opp'), txt(중계 문장), runs, me(내 자동 타석), res, walkoff?` 타석 결과 |
| `halfEnd` | `inn, top, runs, side` |
| `clutch` | `kind('bat'|'fld'|'run'|'steal'), sit{inn, top, outs, bases[3], kia, opp, kiaBat, ace, home}, late(7회 이후), ace, opp, cheer`, 수비면 `ball('grounder'|'fly'), batter`, 홈 쇄도면 `depth, arm`(0~1), 도루면 `feints` |
| `end` | `win` |
| `wait` | 승부처 결과를 기다리는 중 (`resolve` 전에 `next` 부른 경우) |

- `M.resolve(result)` → `{type:'clutchEnd', ok, txt, runs, kind, perfect, res, walkoff?}`. 그 뒤 `next()` 계속
- 승부처 배치는 생성 시 `M.plan = {회: kind}`로 정함(`makePlan`). 소진되면 키 삭제 → `Object.keys(M.plan).length` = 남은 수
- 경기 중 내 기록 `M.my = {pa, ab, h, hr, rbi, bb, k, sb, r, cl[], gw}`, 승부처 기록 `M.my.cl[] = {kind, ok, inn, late, runs, perfect, res, txt}`
- 헤드라인용: `M.mateHR[]`, `M.oppHR[]`(`{name, runs, inn}`), `M.mateRBI{이름: 타점}`
- 기타: `M.score{kia, opp}`, `M.line{kia[], opp[]}`(이닝별 득점), `M.hits`, `M.order`(KIA 타순), `M.oppOrder`, `M.halfRuns`, `M.meRest`

### 4-4. 미니게임 결과 계약 (`onEnd(result)`에 넘기는 값)
| 미니게임 | `result.res` 값 | 추가 필드 |
|---|---|---|
| 타격 `Scenes.bat` | `'1B' '2B' '3B' 'HR' 'BB' 'BH'(번트 안타)` = 성공 후보 / `'K' 'GO' 'FO' 'SAC'` | `perfect, q` |
| 수비 `Scenes.field` | `'out'` 성공 / `'hit' 'drop'` 실패 | `dive, perfect` |
| 홈 쇄도 `Scenes.run` | `'safe'` / `'out'` / `'hold'`(STOP, 실패지만 아웃 아님) | `perfect` |
| 도루 `Scenes.steal` | `'safe'` / `'out'` / `'pick'`(견제사) / `'hold'`(못 뜀) | `perfect` |
| 홈런 더비·타격 연습 | `onEnd(홈런 개수)` | |

미니게임 생성 옵션(공통): `{ c(승부처 이벤트), S, ace, stats(K.effStats), tactic, sit, opp, home, trust, theme('home'|'away'|'dome'), onEnd }`. 타격은 추가로 `derby` / `practice`.

### 4-5. 밸런스 상수 `K.BAL`
| 키 | 값 | 의미 |
|---|---|---|
| `kiaBase` | 0.435 | KIA 기본 전력 |
| `mgMax` | 0.05 | 관리 보너스 상한 |
| `teamTrainStep / Cap` | 0.005 / 0.03 | 팀 훈련 1단계 / 최대 |
| `meWeight` | 0.03 | 내 종합이 팀 전력에 주는 영향 |
| `parachute4` | 0.015 | 종합 65 미만 4번 패널티 |
| `tiredPen`, `tiredChance`, `tiredRecover` | 0.01, 0.12, 0.25 | 피로 |
| `benchPen` | 0.005 | 백업 출전 |
| `pOn`, `pOnK` | 0.31, 0.45 | 자동 타석 출루 공식 |
| `clutchByTier` | 타순별 후보 | 승부처 수 |
| `clutchMin / Max` | 3 / 5 | |
| `aceRate / postAce / postOpp` | 0.33 / 0.6 / 0.02 | 에이스 확률, 가을야구 보정 |
| `tpBase, tpWin, tpHiTrust, tpLoTrust` | 2, 1, 1, −1 | 훈련 포인트 |
| `statPerTp` | 2 | 포인트당 능력치 |
| `cheerBuff` | 0.04 | 홈 응원 버프 |
| `trust` | `{start:50, win:5, star:4, care:2, bad:-8, streak:-4, parachute:-6, unlock:[15,30,45]}` | 팬 신뢰 |

미니게임 판정 상수는 각 미니게임 파일 안에 있다. 타격 타이밍 링은 `mg_bat.js`의 `RING`(중심·목표 반지름·시작 반지름)과 `drawTimingRing`(색 기준은 판정 폭과 같은 `PERF`/`GOOD`). 타격은 `mg_bat.js`의 `TB`(`perf 0.02, good 0.11, good_hit 0.62, qExp 1.8, mid 0.2, midFoul 0.34, bloop 0.05, weakFoul 0.47, outZone 0.5`)와 `WIN`(컨택 배율), 수비는 `mg_field.js`의 `FB`(`window.BAL_FLD`로 덮어쓰기 가능: 이동 속도·포구/다이빙 반경·타구 속도·체공·게이지 폭과 주기), 주루·도루는 각 장면 맨 위 상수.

## 5. 화면 · 흐름 (`scenes.js`, `match.js`)
| 장면 | 생성 | 주요 버튼 id |
|---|---|---|
| 타이틀 | `Scenes.title()` | `new, cont, ttl, snd, tut` |
| 타자 만들기 | `Scenes.create()` | `name, skinL/R, handL/R, posL/R, numL/R, easyL/R, ok, back`. 이름 입력은 숨겨진 `<input id="nameIn">`에 포커스 |
| 오프닝 | `Scenes.opening()` | `adv`(화면 전체), `skip` |
| 브리핑 | `Scenes.brief()` | `cd0~2`(작전 카드), `start`, `practice`(첫 경기만), `stand`, `quit` |
| 경기 | `Scenes.match(fixture, ace)` | `cstart`(승부처 시작) |
| 미니게임 | `Scenes.bat/field/run/steal(opts)` | `bunt`, `stop` |
| 결과 | `Scenes.result(M)` | `nx`/`nx2` → 보상 단계 `rw0~2`, `take` |
| 칭호 획득 | `Scenes.titlePop(list, then)` | `ok` |
| 팀 관리 | `Scenes.manage()` | `tabslot/tabrest/tabtrain`, `sl0~8`, `rs0~8`, `tr{stat}`, `trT`, `undo`, `go` |
| 이벤트 | `Scenes.event()` | `op0, op1` |
| 순위 | `Scenes.standings(back)` | `back` |
| 올스타 | `Scenes.allstar()` | `go`, `ok` |
| 가을야구 안내 | `Scenes.postIntro('final'|'round')` | `go` |
| 엔딩 | `Scenes.ending()` | `adv`, 기록 화면 `end` |
| 칭호 목록 | `Scenes.titles()` | `tt0~11`, `back` |
| 코치 말풍선 | `Coach` (main.js) | `coach` |

**시즌 흐름 `Flow`** (scenes.js 끝):
- `newSeason(opts)` → 오프닝 / `resume()` → 저장된 지점 / `toBrief()`
- `fromManage()`: 정규 18경기 끝났으면 `K.startPost` → 정규시즌 결과, 아니면 브리핑
- `afterGame(postRes)`: 정규면 이벤트/올스타/관리, 가을야구면 `postRes`에 따라 관리·다음 라운드 안내·엔딩
- `afterEvent()`, `end()`(엔딩 판정 후 엔딩 장면)

경기 화면(`match.js`): `TEMPO = {half 0.15, pa 0.12, me 0.4, kiaRun 0.55, oppRun 0.4, halfEnd 0.18}`초. `update`에서 타이머만큼 `M.next()`를 소비하다가 `clutch`면 멈추고 `clutchIntro`(배너) → `startClutch()`가 미니게임 장면으로 `go` → 미니게임의 `onEnd`가 `M.resolve` 후 `go(self)`로 경기 장면 복귀(`init` 플래그로 재초기화 안 함).

## 6. 그래픽 (`gfx.js`, 상세 목록은 `docs/ASSETS.md`)
- **해상도 320×148**, 모든 좌표 정수. 배경·스프라이트는 처음 그릴 때 오프스크린 캔버스에 캐시(`cached(key, w, h, fn)`)
- **팔레트 `P`**: 남색 `n0~n6`, 노을 `s1~s6`, 빨강 `r0~r5`, 흰색 `w0~w4`, 크림 `c0~c4`, 잔디 `g0~g5`, 흙 `d0~d4`, 앰버 `y0~y4`, `up`(빨강 상승) `dn`(파랑 하락) `ok`(초록). 새 색은 여기 추가하고 직접 hex 쓰지 말 것
- **부위 팔레트 `PAL`** = 5단 `[외곽, 어둠, 기본, 밝음, 하이라이트]`. `teamPal(c, d)`가 구단색에서 5단 생성
- **`ell(c, cx, cy, rx, ry, pal, opts)`**: 왼쪽 위 광원 음영 타원 + 같은 계열 외곽선. 캐릭터는 전부 이걸로 부위(머리·몸통·손·발)를 쌓아 그림. 옵션 `clip, flat, noOutline, hi:false`
- 캐릭터: `batterSprite(frame, look)`(88×82, 1.35배, 프레임 `idle0 idle1 load sw1~sw4 bunt joy sad`, 발 기준점 `BAX, BAY`) / `pitcherSprite(frame, team)`(24×26, `set lift stride rel fol idle`) / `drawTop(c, x, y, 방향, frame, 팀팔레트, skin, {dive, throw, k})`(탑뷰, 매 프레임 그림) / `bustSprite('me'|'coach'|'fan'|'press', 표정0~2, skin)`
- 배경: `stadium(c, THEMES.home|away|dome, 신뢰, t, 들썩임, 전광판콜백)`, `fieldWorld()`(480×400 탑뷰 월드, `FW`에 베이스 좌표), `crowd(...)`
- UI: `panel, paper, button, bar, icon(이름, x, y)`(19종), `badge(c, 팀, x, y)`, `bases, bso, drawNum`(3×5 숫자)
- **글자 `text(c, str, x, y, {f, col, a, out, sh, sc})`**: `f` = `'b'`(12px 굵게) `'r'`(12px) `'s'`(10px). 정렬 `a: 'l'|'c'|'r'`, 외곽선 `out`, 배율 `sc`. 줄바꿈 `textBox(c, str, x, y, w, {f, lh})`(단어 단위)
- **갈무리 크기 규칙: 11계열은 12px, 9계열은 10px만**. 다른 크기는 획이 깨진다. 작은 글씨 두 줄은 최소 11px 간격

## 7. 소리 (`main.js` `Sound`)
Web Audio로 합성(파일 없음). `Sound.play(종류, 세기0~1)`.
종류: `ttak`(보통 타구) `kkang`(퍼펙트·홈런) `tuk`(빗맞음) `swing` `mitt` `crowd` `roar` `boo` `click` `card` `coin` `up` `down` `fanfare` `alarm` `whoosh` `slide` `tick` `clap`.
iOS는 첫 터치 때 `Sound.unlock()`으로 오디오를 깨움(포인터·터치·클릭 모두 연결됨). `?test`에선 무음.

## 8. 저장
| localStorage 키 | 내용 |
|---|---|
| `kbo_owner_save_v1` | 시즌 상태 `S` 전체. 결과 화면·관리·이벤트·브리핑 시작 때 저장. 엔딩 기록 화면에서 "타이틀로" 누르면 삭제 |
| `kbo_owner_meta_v1` | `Meta = {titles[], runs, tut{튜토리얼 키: 1}, sound, tutorial(옛 필드, 미사용)}` |
모든 읽기·쓰기는 `Store.get/set/del`(try/catch 감쌈). 사생활 모드에서 저장이 안 돼도 게임은 돈다.

## 9. 코치 튜토리얼 (`Coach` in main.js, 대사는 `TUT` in scenes.js)
- `Coach.once(key, pages[], then?)`: `Meta.tut[key]`가 없을 때만 말풍선을 띄우고 기록. 이미 봤으면 `then` 즉시 실행
- 말풍선이 떠 있는 동안 장면 `update`가 멈추고(미니게임 공이 안 날아옴) 입력이 막힌다
- 키: `start`(+`brief` 묶음) / `c_bat` / `c_fld_IF` / `c_fld_OF` / `c_run` / `c_steal` / `result` / `manage` / `lock` / `event` / `allstar` / `post`. 미니게임 키는 각 미니게임 장면의 `enter()`에서 호출
- 대사 톤: 코치는 존댓말, 구단주를 "구단주님"이라 부름. '~노' 어미·심한 욕 금지. 실명 사용 가능

## 10. 테스트 · 제작 도구 (`tools/`, 전부 저장소 어디서 실행해도 됨)
| 도구 | 명령 | 하는 일 |
|---|---|---|
| 시즌 자동 완주 | `python3 tools/e2e.py 출력폴더 [strong|avg|weak]` | 봇이 타이틀부터 엔딩까지 실제 버튼을 눌러 한 시즌을 끝냄. 화면 종류별 첫 장면 캡처, 마지막에 성적·엔딩·**에러 목록** 출력. **어떤 수정이든 끝나면 이걸 돌려서 `errors []`인지 확인** |
| 전 화면 캡처 | `python3 tools/gallery.py 출력폴더 [이름앞부분,...]` | 상태를 직접 세팅해서 27개 화면 캡처(`SHOTS` 목록). 예: `... 05,16` = 브리핑·관리만 |
| 캡처 묶기 | `python3 tools/sheets.py 폴더` | 4장씩 한 장으로 |
| 미니게임 측정 | `python3 tools/calib.py 반복수 [bat,fld,run,steal] [IF|OF]` | 봇 실력 3단계 × 능력치 35/60/85 × 에이스로 실제 성공률 측정 |
| 에셋 시트 | 브라우저로 `tools/sheet.html` 열기, 또는 `python3 tools/shot.py file://$PWD/tools/sheet.html out.png 1280 1040` | 캐릭터·배경·UI 전부 한 장에 |
| 앱 아이콘 | `python3 tools/make_icons.py` | `tools/icon.html`(게임 타자 스프라이트)을 렌더해서 `app/icons/`에 4종 생성 |
| 명단 재생성 | `python3 tools/make_roster.py` | `sim/players_2027.json` → `app/js/roster.js` (구단별 상위 16명) |
| 단일 캡처 | `python3 tools/play.py out.png "JS 코드" 프레임수` | |
| 아티팩트 빌드 | `python3 tools/build.py` | `dist/game.html`(폰트 내장) — claude.ai 아티팩트용. GitHub Pages엔 필요 없음 |

**테스트 봇 형식** (`window.BOT`, 페이지에 넣으면 미니게임이 스스로 플레이):
```js
{ jt: 0.075,                 // 타격 타이밍 오차 ±초
  eye: 0.55,                 // 존 밖 공을 참을 확률
  bunt: false,
  field: { react: 0.5, err: 6, jt: 0.13 },   // 수비 반응 지연(초), 이동 오차(px), 송구 게이지 오차
  run:   { at: 6, stop: false },             // 3루 기준 몇 px에서 GO/STOP
  steal: { delay: 0.25, early: false } }     // 다리 든 뒤 몇 초에 출발
```
e2e 봇 실력: 고수 `jt .045, field.react .35`, 보통 `.075 / .5`, 초보 `.11 / .7`.

## 11. 밸런스 작업 절차
1. 미니게임 판정을 바꿨으면 `python3 tools/calib.py 80 해당종류`로 실측
2. 측정값을 `sim/sim.js`의 `MEAS` 표에 넣음 (`[능력 35, 60, 85]` 성공률, `ace` = 에이스 시 감소폭)
3. `node sim/sim.js 1000` → 기획서 §16 목표 범위(보통 실력 정석 운영: 승률 50~55%, 가을야구 ~50%, 우승 15~20% / 자동 진행 가을야구 0% / 낙하산 운영이 확실히 불리)에 드는지 확인. 크게 벗어나면 `K.BAL.kiaBase`부터 조정
4. `docs/DESIGN.md`의 숫자·표 갱신, `sim/results_v2.md` 저장
5. `tools/e2e.py`로 실제 완주 확인
- 시뮬의 시간 모델(경기 시간 열)은 `sim.js` `playOne` 안 `t = ...` 식. 연출 템포를 바꾸면 같이 고칠 것

## 12. 자주 하는 작업
| 작업 | 고칠 곳 |
|---|---|
| 밸런스 숫자 | `core.js` `K.BAL` → §11 절차 |
| 작전/보상 카드 추가 | `core.js` `K.TACTICS` / `K.REWARDS` (+효과는 쓰는 곳: 작전은 `S.tactic === 'id'`로 각 미니게임·`makePlan`에서 확인, 보상은 `K.applyReward`) |
| 이벤트 추가 | `core.js` `K.EVENTS`에 `{id, title, art('chartUp'|'chartDown'|'mic'|'coach'), text, opts:[{t, d, f(S, R)}]}` |
| 칭호 추가 | `K.TITLES`에 `{id, name, d, f(S)}` (+필요하면 `S.flags`에 카운터, `finishGame`에서 증가). 칭호 화면은 2열 6줄 고정이라 13개부터는 레이아웃 수정 필요 |
| 헤드라인 문구 | `K.headline` (위에서부터 먼저 맞는 조건이 이김) |
| 중계 문장 | `Match.apply()` 안 `txt` |
| 코치 대사·튜토리얼 | `scenes.js` `TUT` |
| 오프닝·엔딩 대사 | `Scenes.opening`의 `cuts`, `Scenes.ending`의 `cuts` |
| 선수 명단 갱신 | `sim/players_2027.json` 교체 → `tools/make_roster.py` → 필요하면 `K.MATE_NAMES`, `K.BENCH`, 데일 교체 로직(`newSeason`) 수정 |
| 구단 전력 | `K.TEAMS[팀].str` |
| 새 미니게임 | §4-4 계약을 지키는 장면 만들기 → `Match.makePlan`의 종류·`openClutch`·`resolve`에 분기 추가 → `match.js` `startClutch`에서 장면 연결 → `TUT`·`KIND_KO`·`HOWTO` 추가 → 시뮬 `makeBot`·`MEAS` 추가 |
| 화면 문구·레이아웃 | 해당 장면 `draw`. 수정 후 `tools/gallery.py`로 캡처해서 겹침 확인 |
| 그림 | `gfx.js`. `tools/sheet.html`로 확인 |
| **배포** | `app/` 수정 → **`app/sw.js`의 `CACHE` 숫자 올리기**(새 파일이면 `FILES`에도 추가) → e2e 통과 → `main`에 커밋·푸시 → 1~2분 뒤 반영 |

## 13. 함정 (실제로 겪은 버그·주의)
1. **페이드 중 이전 장면이 계속 그려진다.** 마지막 컷에서 인덱스를 넘기고 `go()`하면, 페이드 동안 `cuts[i]`가 `undefined`라 매 프레임 오류 → 화면 멈춤(v1.2에서 고친 프롤로그 버그). 배열 인덱스는 `Math.min(i, len-1)`로 고정하고, 전환 함수는 `done` 플래그로 한 번만 부를 것
2. **`enter()`는 들어올 때마다 불린다.** 다른 장면 갔다 돌아오면(미니게임 → 경기, 연습 → 브리핑) 다시 불리므로 상태 초기화는 `init` 플래그로 1회만
3. **전역 이름 충돌**: gfx.js의 최상위 `const LW, P, rect, text...`와 같은 이름을 다른 파일 최상위에서 `const`로 선언하면 "already been declared"로 게임 전체가 안 뜬다
4. **로드 순서**: `roster.js`가 `core.js`보다 먼저. `tools/sheet.html`·`icon.html`도 마찬가지
5. **글꼴 크기**: 12/12/10px 이외는 깨짐. 작은 글씨 두 줄 간격 11px 미만이면 겹침
6. **서비스 워커 캐시**: `CACHE` 버전을 안 올리면 홈 화면 앱이 옛 파일을 계속 씀 (네트워크 우선이라 온라인이면 대체로 갱신되지만, 버전은 꼭 올릴 것)
7. **버튼 id = 테스트 계약**: id를 바꾸면 e2e가 "STUCK"으로 멈춘다
8. **규칙 난수는 `App.R`(시드)만**. `Math.random`을 규칙에 쓰면 저장/불러오기 재현성과 시뮬 일치가 깨짐 (미니게임 연출 내부 판정은 `Math.random` 사용 중 — 의도적)
9. 미니게임 성공률은 **봇 기준**이라 실제 사람은 다를 수 있음. 사람 피드백이 오면 §11 절차로 재보정
10. 수비는 "누르고 있는 동안 손가락 쪽으로 달림 + 카메라가 따라감"이었을 때 목표가 계속 밀려나 사람이 거의 못 했다(v1.2까지). 화면 좌표를 매 프레임 월드 좌표로 다시 환산하는 조작은 카메라가 움직이면 안 된다
11. 테스트 스크립트에서 페이지 전역 이름(`SC`, `LW`, `P` 등)과 같은 이름을 `window.xxx`로 만들면 상수에 가려져 엉뚱한 값이 나온다. 테스트용 이름은 겹치지 않게(예: `window.BS`)
12. e2e 봇은 작전 카드 두 번째, 보상 첫 번째, 이벤트 첫 선택지만 누르고, 타격 연습·순위·되돌리기는 안 누름 → 그 경로는 `gallery.py`나 수동으로 확인

## 14. 알려진 한계 · 다음 할 일
- 실제 아이폰 플레이테스트 부족 (판정 폭, 오디오 첫 재생, 노치 영역)
- 쉬움 난이도는 시뮬에 반영 안 됨
- 명장면은 문구만(리플레이 없음), 원정 구장 배경 3종뿐, 커리어 모드 없음
- 투수 데이터(`players_2027.json`의 pitchers)는 아직 안 씀 — 상대 에이스는 33% 확률 표시만
- `Meta.tutorial`(옛 필드)는 미사용, `S.v`는 1 그대로

## 15. 변경 이력
| 버전 | 커밋 내용 |
|---|---|
| v1.0 | 게임 전체 신규 제작 (비주얼·규칙·미니게임 4종·시즌·가을야구·엔딩·칭호), 시뮬·테스트 도구 |
| v1.1 | 타격 타이밍만, 전광판 빨리감기, 웹앱 |
| v1.2 | 프롤로그 멈춤 수정, 코치 튜토리얼·타격 연습, 실존 인물 이름 금지 폐지(전부 실명), 저장소에 sim·tools·docs 포함 |
| v1.3 | 수비 조작 변경(탭 = 목표 지점 이동, 손 떼도 계속), 타구 중 카메라 고정, '여기로' 목표 원, 판정 완화(`FB`), KIA 기본 전력 0.435 |
| v1.4 | 타격 타이밍 링(`drawTimingRing`), 화면 맞춤이 안전 여백 패딩을 빼고 계산, 타격 장면 디버그 훅 `scene._G` |
