# 미니게임 실측 성공률: 봇 실력 x 능력치. python3 tools/calib.py [n]
import sys,json
from playwright.sync_api import sync_playwright
import os as _os
TOOLS=_os.path.dirname(_os.path.abspath(__file__)); APP='file://'+_os.path.join(_os.path.dirname(TOOLS),'app','index.html')
n=int(sys.argv[1]) if len(sys.argv)>1 else 120
BOTS={'strong':"{jx:3.5,jy:3,jt:0.045,eye:0.75,field:{react:0.35,err:3,jt:0.07},run:{at:2,stop:false},steal:{delay:0.12}}",
      'avg':"{jx:5.5,jy:4.5,jt:0.075,eye:0.55,field:{react:0.5,err:6,jt:0.13},run:{at:6,stop:false},steal:{delay:0.25}}",
      'weak':"{jx:9,jy:7,jt:0.11,eye:0.3,field:{react:0.7,err:10,jt:0.22},run:{at:11,stop:false},steal:{delay:0.42}}"}
JS='''(a)=>{const [kind,stat,ace,n]=a;const out={ok:0,n:0,res:{}};
 for(let i=0;i<n;i++){let r=null;const st={con:stat,pow:stat,eye:stat,spd:stat,def:stat};
  const sit={inn:5,top:false,outs:1,bases:[true,false,false],kia:2,opp:2};
  const o={c:{kind,depth:Math.random(),arm:Math.random(),feints:(Math.random()*3)|0},stats:st,ace,tactic:'normal',sit,opp:'LG',theme:'home',onEnd:x=>{r=x}};
  const sc=kind==='bat'?Scenes.bat(o):kind==='fld'?Scenes.field(o):kind==='run'?Scenes.run(o):Scenes.steal(o);App.scene=sc;
  let g=0;while(!r&&g++<300){advance(20,1/60,1)}
  const ok=kind==='bat'?['1B','2B','3B','HR','BB','BH'].includes(r.res):kind==='fld'?r.res==='out':r.res==='safe';
  out.ok+=ok;out.n++;out.res[r.res]=(out.res[r.res]||0)+1}
 return out}'''
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files']);pg=b.new_page(viewport={'width':844,'height':390})
    pg.goto(APP+'?manual&test');pg.wait_for_function('window.ready')
    pg.evaluate(f"App.S=K.newSeason({{seed:1,pos:'{sys.argv[3] if len(sys.argv)>3 else 'IF'}'}});App.R=K.rng(App.S.rs)")
    for kind in sys.argv[2].split(',') if len(sys.argv)>2 else ['bat','fld','run','steal']:
        for sk in ['strong','avg','weak']:
            pg.evaluate(f'window.BOT={BOTS[sk]}')
            row=[]
            for stat in [35,60,85]:
                r=pg.evaluate(JS,[kind,stat,False,n]); row.append(f"{stat}:{r['ok']/r['n']:.0%}")
            ra=pg.evaluate(JS,[kind,60,True,n])
            print(kind,sk,' '.join(row),'| ace60:',f"{ra['ok']/ra['n']:.0%}", json.dumps(r['res'],ensure_ascii=False))
