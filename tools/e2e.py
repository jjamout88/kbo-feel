# 한 시즌을 봇으로 끝까지 플레이. 씬별 스크린샷 저장. python3 tools/e2e.py outdir [skill] [seed]
import sys,os,json,time
from playwright.sync_api import sync_playwright
import os as _os
TOOLS=_os.path.dirname(_os.path.abspath(__file__)); APP='file://'+_os.path.join(_os.path.dirname(TOOLS),'app','index.html')
out=sys.argv[1]; skill=sys.argv[2] if len(sys.argv)>2 else 'avg'; os.makedirs(out,exist_ok=True)
BOT={'strong':"{jx:3.5,jy:3,jt:0.045,eye:0.75,field:{react:0.35,err:3,jt:0.07},run:{at:2,stop:false},steal:{delay:0.12}}",
     'avg':"{jx:5.5,jy:4.5,jt:0.075,eye:0.55,field:{react:0.5,err:6,jt:0.13},run:{at:6,stop:false},steal:{delay:0.25}}",
     'weak':"{jx:9,jy:7,jt:0.11,eye:0.3,field:{react:0.7,err:10,jt:0.22},run:{at:11,stop:false},steal:{delay:0.42}}"}[skill]
PRI=['coach','cstart','new','ok','skip','adv','cd1','start','nx','nx2','take','rw0','op0','go','end']
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files']);pg=b.new_page(viewport={'width':844,'height':390})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(APP+'?manual&test');pg.wait_for_function('window.ready',timeout=20000)
    pg.evaluate('localStorage.clear()'); pg.evaluate(f'window.BOT={BOT}')
    shots=set(); steps=0; t0=time.time(); last=None; stuck=0
    while steps<20000:
        steps+=1
        pg.evaluate('advance(12)')
        ids=pg.evaluate('hits()')
        key=pg.evaluate("(App.scene&&App.scene.M?'match':'')+'|'+hits().slice(0,4).join(',')")
        name=None
        for i in PRI:
            if i in ids:
                if i=='cd1' and 'start' in ids and pg.evaluate("hits().includes('start')"):
                    pg.evaluate("tapId('cd1')"); pg.evaluate('advance(2)')
                    ids=pg.evaluate('hits()')
                    if 'start' in ids: name='start'; break
                    continue
                name=i; break
        tag=(name or 'none')+'_'+str(pg.evaluate("App.S?App.S.gi:0"))
        sc=name or 'none'
        scn=pg.evaluate("App.scene&&App.scene.M?'match':(App.scene&&App.scene.mg)||''");sc=sc+('_'+scn if scn else '')
        if sc not in shots and not sc.startswith('adv') and not sc.startswith('cd1'):
            shots.add(sc); pg.screenshot(path=f'{out}/{len(shots):02d}_{sc}.png')
        if name in ('end',):
            pg.screenshot(path=f'{out}/zz_end.png'); break
        if name=='go' and 'tabslot' in ids:
            pg.evaluate("(()=>{const S=App.S;if(K.canEdit(S,'slot'))S.slot=K.recommendSlot(S);if(K.canEdit(S,'rest')){const t=S.mates.findIndex(m=>m.tired);K.setRest(S,t>=0?t:null)}if(K.canEdit(S,'train')){let g=0;while(S.tp>0&&g++<50){if(S.teamTrain<0.03-1e-9&&Math.random()<0.3){K.train(S,'team');continue}const k=K.STATS.slice().sort((a,b)=>S.me.st[a]-S.me.st[b])[0];K.train(S,k)}}})()")
        if name: pg.evaluate(f"tapId('{name}')")
        if key==last: stuck+=1
        else: stuck=0
        last=key
        if stuck>400: print('STUCK',ids); pg.screenshot(path=f'{out}/stuck.png'); break
    S=pg.evaluate('App.S')
    print('steps',steps,'time',round(time.time()-t0),'s')
    print('W-L',S['W']['KIA'],S['L']['KIA'],'rank',S.get('finalRank'),'ending',S.get('ending'),'post',json.dumps(S.get('post'),ensure_ascii=False)[:200])
    print('stats',S['stats'],'ovr',S['me']['st'],'trust',S['trust'],'titles',S['titles'])
    print('errors',errs[:10])
