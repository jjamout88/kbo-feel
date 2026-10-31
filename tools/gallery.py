# 모든 화면을 상태 세팅해서 캡처. python3 tools/gallery.py outdir
import sys,os
from playwright.sync_api import sync_playwright
import os as _os
TOOLS=_os.path.dirname(_os.path.abspath(__file__)); APP='file://'+_os.path.join(_os.path.dirname(TOOLS),'app','index.html')
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
SETUP='''App.S=K.newSeason({seed:7,name:'박재민',num:7,pos:'IF'});App.R=K.rng(App.S.rs);const S=App.S;
S.me.st={con:52,pow:61,eye:44,spd:58,def:49};S.trust=64;S.tp=4;S.gi=7;S.W.KIA=4;S.L.KIA=3;['LG','KT','삼성'].forEach(t=>{S.W[t]=5;S.L[t]=2});S.mates[2].tired=true;S.mates[5].tired=true;'''
def sc(code): return f"go({code},false)"
SHOTS=[
 ('01_title', "go(Scenes.title(),false)", 40),
 ('02_create', "go(Scenes.create(),false)", 20),
 ('03_open1', "go(Scenes.opening(),false)", 90),
 ('04_open3', "const o=Scenes.opening();go(o,false);advance(5);tapId('adv');advance(1);tapId('adv');advance(5);tapId('adv');advance(1);tapId('adv')", 90),
 ('05_brief', "go(Scenes.brief(),false)", 10),
 ('06_match', "const m=Scenes.match(App.S.sched[App.S.gi],false);go(m,false);advance(160,1/60,1)", 1),
 ('07_clutch', "const m=Scenes.match(App.S.sched[App.S.gi],false);go(m,false);App.test=true;let g=0;while(!(m.M&&m.M.awaiting)&&g++<4000)advance(5,1/60,1);App.test=false", 40),
 ('08_bat_pitch', "go(Scenes.bat({stats:App.S.me.st,sit:{inn:7,top:false,outs:2,bases:[true,false,true],kia:3,opp:4},opp:'LG',theme:'home',onEnd:()=>{}}),false)", 112),
 ('09_bat_hit', "window.BOT={jx:0,jy:0,jt:0,eye:1};go(Scenes.bat({stats:App.S.me.st,sit:{inn:7,top:false,outs:2,bases:[true,false,true],kia:3,opp:4},opp:'LG',theme:'home',onEnd:()=>{}}),false)", 140),
 ('10_field_if', "window.BOT=null;go(Scenes.field({c:{kind:'fld'},stats:App.S.me.st,sit:{inn:8,top:true,outs:1,bases:[false,true,false],kia:3,opp:2},opp:'삼성',onEnd:()=>{}}),false)", 75),
 ('11_field_of', "App.S.me.pos='OF';go(Scenes.field({c:{kind:'fld'},stats:App.S.me.st,sit:{inn:8,top:true,outs:1,bases:[false,true,false],kia:3,opp:2},opp:'삼성',onEnd:()=>{}}),false)", 90),
 ('12_gauge', "App.S.me.pos='IF';window.BOT={field:{react:0.2,err:0,jt:5}};go(Scenes.field({c:{kind:'fld'},stats:{...App.S.me.st,def:90},sit:{inn:8,top:true,outs:1,bases:[false,true,false],kia:3,opp:2},opp:'삼성',onEnd:()=>{}}),false)", 150),
 ('13_run', "window.BOT=null;go(Scenes.run({c:{kind:'run',depth:0.7,arm:0.3},stats:App.S.me.st,sit:{inn:6,top:false,outs:1,bases:[false,true,false],kia:2,opp:2},opp:'두산',onEnd:()=>{}}),false)", 140),
 ('14_steal', "go(Scenes.steal({c:{kind:'steal',feints:1},stats:App.S.me.st,sit:{inn:3,top:false,outs:0,bases:[true,false,false],kia:0,opp:0},opp:'한화',theme:'away',onEnd:()=>{}}),false)", 80),
 ('15_result', "const m=Scenes.match(App.S.sched[App.S.gi],false);go(m,false);App.test=true;window.BOT={jx:2,jy:2,jt:0.03,eye:0.8,field:{react:0.3,err:2,jt:0.05},run:{at:2},steal:{delay:0.1}};let g=0;while(!(App.scene.out!==undefined)&&g++<6000){advance(5,1/60,1);if(App.scene.M&&App.scene.M.awaiting)tapId('cstart');if(hits().includes('cstart'))tapId('cstart')}App.test=false;", 30),
 ('16_manage_slot', "window.BOT=null;go(Scenes.manage(),false)", 10),
 ('17_manage_rest', "go(Scenes.manage(),false);advance(2);tapId('tabrest')", 10),
 ('18_manage_train', "go(Scenes.manage(),false);advance(2);tapId('tabtrain');advance(1);tapId('trpow')", 10),
 ('19_event', "go(Scenes.event(),false)", 60),
 ('20_standings', "go(Scenes.standings(()=>{}),false)", 10),
 ('21_allstar', "go(Scenes.allstar(),false)", 30),
 ('22_postfinal', "App.S.gi=18;App.S.W.KIA=12;K.startPost(App.S);go(Scenes.postIntro('final'),false)", 10),
 ('23_postround', "App.S.gi=18;App.S.W.KIA=12;K.startPost(App.S);go(Scenes.postIntro('round'),false)", 10),
 ('24_end_true', "App.S.ending='true';App.S.finalRank=2;go(Scenes.ending(),false)", 60),
 ('25_end_sum', "App.S.ending='true';App.S.finalRank=2;App.S.titles=['nine','diver','true'];const e=Scenes.ending();go(e,false);for(let i=0;i<7;i++){advance(200,1/60,1);tapId('adv')}", 10),
 ('26_titles', "Meta.titles=['nine','diver'];go(Scenes.titles(),false)", 10),
 ('27_lock', "App.S.lock=3;App.S.trust=4;go(Scenes.manage(),false)", 10),
]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files']);pg=b.new_page(viewport={'width':844,'height':390})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    only=sys.argv[2].split(',') if len(sys.argv)>2 else None
    for name,code,n in SHOTS:
        if only and not any(name.startswith(o) for o in only): continue
        pg.goto(APP+'?manual');pg.wait_for_function('window.ready')
        pg.evaluate('localStorage.clear()');pg.evaluate(SETUP)
        try:
            pg.evaluate(code);pg.evaluate(f'advance({n})');pg.screenshot(path=f'{out}/{name}.png')
        except Exception as e: errs.append(name+': '+str(e)[:200])
    print('errors',errs)
