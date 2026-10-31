# sim/players_2027.json → js/roster.js (구단별 타자 상위 12명: 이름·포지션·종합)
import json,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J=json.load(open(ROOT+'/sim/players_2027.json',encoding='utf-8'))
R={}
for b in J['batters']:
    R.setdefault(b['team'],[]).append({'name':b['name'],'pos':b['pos'],'ovr':b['overall']})
for t in R: R[t]=sorted(R[t],key=lambda x:-x['ovr'])[:16]
js="'use strict';\n// 자동 생성: tools/make_roster.py (2026 스탯티즈 기반 2027 능력치)\n(function (root) {\nconst ROSTER = "+json.dumps(R,ensure_ascii=False)+";\nif (typeof module !== 'undefined' && module.exports) module.exports = ROSTER; else root.ROSTER = ROSTER;\n})(this);\n"
open(ROOT+'/app/js/roster.js','w',encoding='utf-8').write(js); print({t:len(v) for t,v in R.items()})
