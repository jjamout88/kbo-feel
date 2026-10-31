'use strict';
// ===== KIA 끝내기 타석 v4 — landscape 422x195 logical, x2 crisp. Sprites authored in tools/*.py =====
const LW=422,LH=195,S=2;
const cv=document.getElementById('c'),X=cv.getContext('2d');X.imageSmoothingEnabled=false;
const low=document.createElement('canvas');low.width=LW;low.height=LH;const L=low.getContext('2d');
const Q=new URLSearchParams(location.search);const TEST=Q.has('test'),REC=Q.has('rec')||TEST,DEMO=Q.has('demo')||(REC&&!TEST);
const TDEF={speed:1.0,cursor:1.0,perfect:35,hitstop:120,shake:1.0,exitv:1.0,snd:'kkang',vol:0.8,contact:99,power:99,pitcher:50};
const T=Object.assign({},TDEF,JSON.parse(localStorage.getItem('kboFeel')||'{}'));window.T=T;window.TDEF=TDEF;
const ST={n:0,streak:0,best:0,perfect:0,hits:0,hr:0,last:''};window.ST=ST;
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const mk=(w,h,f)=>{const o=document.createElement('canvas');o.width=w;o.height=h;f(o.getContext('2d'));return o};
const IMG={};const LOADS=['bg','batter','chibi','hud','btnL','btnR','btnSW','btnL_p','btnR_p','btnSW_p','diamond','bag0','bag1'].map(n=>new Promise(r=>{const i=new Image();i.onload=r;i.src='img/'+n+'.png';IMG[n]=i}));
const BFR=["idle0","idle1","s1","s2","s3","s4","s5","s6","s7","bunt"],BW=128,BH=112;
const CFR=["idle0","idle1","run0","run1","p0","p1","p2","p3"],CW=11,CH=12;
// ---- layout (all screen-space positions) ----
const LAYOUT={hud:{x:3,y:3},diamond:{x:31,y:45},btn:{L:{x:31,y:150,r:22},R:{x:76,y:172,r:22},SW:{x:380,y:150,r:32}},batter:{x:182,y:80},msgY:62};
const ZONE={x0:195,x1:228,y0:138,y1:163};const REL={x:207,y:104};const CUR={rx:8,ry:6.5,x0:184,x1:240,y0:130,y1:171};
const FIELD=[[16,106],[124,104],[186,103],[300,104],[408,106]];
// ---- pixel text (Galmuri, hard alpha + same-hue outline) ----
const TC={};
function ptex(str,font,col,out){const key=str+font+col+out;if(TC[key])return TC[key];const m=document.createElement('canvas'),mc=m.getContext('2d');mc.font=font;
 const sz=parseInt(font.match(/(\d+)px/)[1]);const w=Math.ceil(mc.measureText(str).width)+4,h=sz+8;m.width=w;m.height=h;mc.font=font;mc.fillStyle='#fff';mc.fillText(str,2,h-4);
 const d=mc.getImageData(0,0,w,h);for(let i=3;i<d.data.length;i+=4)d.data[i]=d.data[i]>110?255:0;mc.putImageData(d,0,0);
 const tint=cl=>mk(w,h,oc=>{oc.drawImage(m,0,0);oc.globalCompositeOperation='source-in';oc.fillStyle=cl;oc.fillRect(0,0,w,h)});
 const f=tint(col),o=out?tint(out):null;return TC[key]=mk(w+2,h+3,rc=>{if(o)for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1],[0,2],[1,2],[-1,2]])rc.drawImage(o,1+dx,1+dy);rc.drawImage(f,1,1)})}
function ptxt(c,str,x,y,size,col,align='left',out=null,sc=1,font){font=font||(size>=11?size+'px GB':'9px G9');const t=ptex(str,font,col,out);const w=t.width*sc,h=t.height*sc;
 const x0=align=='center'?x-w/2:align=='right'?x-w:x;c.drawImage(t,Math.round(x0),Math.round(y-h/2),w,h)}
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x|0,y|0,w|0,h|0)};
function disc(c,cx,cy,r,col){c.fillStyle=col;for(let y=-r;y<=r;y++){const w=Math.floor(Math.sqrt(r*r-y*y+r*.5));c.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1)}}
// ---- state ----
const G={t:0,frame:0,phase:'ready',pt:0,balls:0,strikes:0,outs:2,away:4,home:3,bases:[1,1,0],msg:null,shake:0,freeze:0,white:0,zoom:0,chrom:0,zc:{x:211,y:150},slow:0,
 ball:null,hit:null,trail:[],swing:-1,swingT:0,swingCur:null,cur:{x:211,y:151},drag:null,burst:null,q:0,bunt:null,press:{},events:[],fw:[],pitchN:0,cheer:0,over:0,
 fielders:FIELD.map(([x,y],i)=>({x,y,hx:x,hy:y,ph:i*1.3,run:0})),lastPitch:null};
const PITCHES=[{name:'직구',kmh:148,dur:.55,brk:0,drop:0},{name:'슬라이더',kmh:134,dur:.64,brk:14,drop:3},{name:'커브',kmh:121,dur:.74,brk:-6,drop:12},{name:'포크',kmh:131,dur:.66,brk:0,drop:14}];
const CONTACT_T=.9,LEAD=.1;let audio=null;
function noise(a,sec,env){const n=a.createBuffer(1,a.sampleRate*sec|0,a.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*env(i/d.length,i);const s=a.createBufferSource();s.buffer=n;return s}
function tone(a,t,type,f0,f1,dur,vol){const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=a.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02)}
function filt(a,type,f,q){const b=a.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q||.7;return b}
let MG=null;function sfx(kind,q=0){G.events.push([kind,G.frame||0,q]);if(REC)return;try{audio=audio||new AudioContext();if(!MG||MG.context!==audio){MG=audio.createGain();MG.connect(audio.destination)}MG.gain.value=T.vol;const a={__proto__:null};const A=audio;
 const a2=new Proxy(A,{get:(o,k)=>k=='destination'?MG:(typeof o[k]=='function'?o[k].bind(o):o[k])});return sfx2(a2,kind,q)}catch(e){}}
function sfx2(a,kind,q){const t=a.currentTime;try{
 if(kind=='crack'&&T.snd=='ttak'&&q>=.45){// wooden 'TTAK!': short broadband click + hollow body resonance
   const V=.6+.6*q;const s=noise(a,.03,u=>Math.pow(1-u,6));const g=a.createGain();g.gain.value=2.2*V;s.connect(filt(a,'bandpass',2400,1.2)).connect(g).connect(a.destination);s.start(t);
   [[620,.5,.09],[1180,.3,.06],[1750,.18,.04]].forEach(([f,v,d])=>tone(a,t,'triangle',f,f*.92,d*(1+q),v*V));tone(a,t,'sine',180,110,.08,.4*V);return}
 if(kind=='crack'){if(q<.45){// weak 'tuk': dull, short, low
   const s=noise(a,.05,u=>Math.pow(1-u,4));const g=a.createGain();g.gain.value=.9;s.connect(filt(a,'lowpass',700)).connect(g).connect(a.destination);s.start(t);tone(a,t,'sine',190,90,.07,.5)}
  else{// aluminum 'KKANG~~!': sharp ping transient + long inharmonic ringing tail with shimmer; louder/longer with quality
   const V=.5+.7*q,T=.25+.75*q;const s=noise(a,.012,u=>Math.pow(1-u,3));const g=a.createGain();g.gain.value=1.8*V;s.connect(filt(a,'highpass',3000)).connect(g).connect(a.destination);s.start(t);
   tone(a,t,'square',4200,2600,.018,.18*V);
   const lfo=a.createOscillator();lfo.frequency.value=6.5;lfo.start(t);lfo.stop(t+T+.1);
   [[1560,.30,1],[2310,.22,.8],[2870,.18,.65],[3480,.13,.5],[3990,.09,.4]].forEach(([f,v,d])=>{const o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(f*(1+.012*q),t);o.frequency.exponentialRampToValueAtTime(f,t+.06);
    const lg=a.createGain();lg.gain.value=f*.004;lfo.connect(lg).connect(o.frequency);const og=a.createGain();og.gain.setValueAtTime(v*V,t);og.gain.exponentialRampToValueAtTime(.0008,t+T*d);o.connect(og).connect(a.destination);o.start(t);o.stop(t+T*d+.03)})}}
 else if(kind=='swing'){const s=noise(a,.14,u=>Math.sin(u*Math.PI)*.35);const f=filt(a,'bandpass',900,1.5);f.frequency.setValueAtTime(500,t);f.frequency.exponentialRampToValueAtTime(2200,t+.14);s.connect(f).connect(a.destination);s.start(t)}
 else if(kind=='mitt')tone(a,t,'triangle',220,70,.1,.5);
 else if(kind=='crowd'||kind=='roar'){const L=kind=='roar'?4:2.2,v=kind=='roar'?.8:.45;const s=noise(a,L,(u,i)=>Math.min(1,i/(kind=='roar'?9000:4000))*Math.pow(1-u,1.3)*v*(1+.25*Math.sin(u*40)));s.connect(filt(a,'lowpass',kind=='roar'?1900:1300)).connect(a.destination);s.start(t)}}catch(e){}}
function say(txt,col,big,sub){G.msg={txt,col,t:0,big,sub}}
function newPitch(){G.pitchN++;const forced=DEMO?DEMOP[G.pitchN-1]:null;const p=PITCHES[forced?forced.type:(rnd()*4)|0];G.lastPitch=p;
 const tx=forced?forced.tx:211+(rnd()-.5)*44,ty=forced?forced.ty:150+(rnd()-.5)*34;
 const sp=T.speed*(0.9+0.2*T.pitcher/99);const pp={...p,dur:p.dur/sp,kmh:Math.round(p.kmh*sp)};G.lastPitch=pp;
 G.ball={p:pp,t:0,tx,ty,x:REL.x,y:REL.y,r:.6,inZone:tx>=ZONE.x0-2&&tx<=ZONE.x1+2&&ty>=ZONE.y0-2&&ty<=ZONE.y1+2,judged:0};if(AUTO&&!window.fixJ)AUTO_J={ox:(Math.random()-.5)*12,oy:(Math.random()-.5)*10,dt:(Math.random()-.5)*.12}}
function ballPos(b,t){const u=Math.min(t,1.15);const e=u*u;const bx=REL.x+(b.tx-REL.x)*u+b.p.brk*(e-u)*-1+b.p.brk*0;// break late
 const brk=b.p.brk*Math.pow(u,3)-b.p.brk*u*.0;const x=REL.x+(b.tx-b.p.brk-REL.x)*u+brk;const y=REL.y+(b.ty-b.p.drop-REL.y)*u+b.p.drop*Math.pow(u,3)-Math.sin(u*Math.PI)*6;
 return{x,y,r:.6+2.2*u*u}}
function trySwing(){if(G.phase!='pitch'||G.bunt||G.swing>=0||!G.ball||G.ball.t>1.05)return;G.swing=0;G.swingBallT=G.ball.t;G.swingCur={...G.cur};sfx('swing')}
function curR(){const k=T.cursor*(0.65+0.55*T.contact/99)*(1.1-0.2*T.pitcher/99);return{rx:CUR.rx*k,ry:CUR.ry*k}}
function judge(){const b=G.ball;if(G.swing<0)return null;const P=ballPos(b,CONTACT_T),C=G.swingCur;
 const cr=curR();const d=Math.hypot((P.x-C.x)/cr.rx,(P.y-C.y)/cr.ry);const ideal=CONTACT_T-LEAD/b.p.dur;const err=(G.swingBallT-ideal)*b.p.dur;
 const pw=T.perfect/1000,ace=T.pitcher/99,pow=T.power/99;
 if(d<=.6&&Math.abs(err)<=pw){/* perfect timing = always a hit */const hrP=0.15+0.75*pow*(1-0.35*ace)*(1-d/.6*.5);return{type:rnd()<hrP?'hr':'hit',q:Math.max(.85,1-d*.2),err,sweet:1,perfect:1}}
 if(d>1.15||Math.abs(err)>.16)return{type:'miss'};
 let q=Math.max(0,1-Math.abs(err)/.16)*Math.max(0,1-d/1.15)*(1-0.25*ace);
 const r=rnd();let type=q>.55?(r<pow*.35*q?'hr':'hit'):q>.3?(r<.5+q*.6?'hit':'foul'):'foul';return{type,q,err,sweet:0}}
function batterFrame(){if(G.bunt&&['windup','pitch','bunt'].includes(G.phase))return 9;
 if(G.swing>=0){const i=Math.floor(G.swing/.035);return i>=6?8:[2,3,4,5,6,7][i]}return Math.sin(G.t*2.4)>0?0:1}
// ---- update ----
function step(dt){G.t+=dt;G.frame++;
 G.zoom=Math.max(0,G.zoom-dt*1.2);G.chrom=Math.max(0,G.chrom-dt*7);if(G.msg)G.msg.t+=dt;
 if(G.freeze>0){G.freeze-=dt;return}
 if(G.slow>0){G.slow-=dt;dt*=.3}
 G.shake=Math.max(0,G.shake-dt*30);G.cheer=Math.max(0,G.cheer-dt*.12);
 if(DEMO)demo(dt);if(AUTO)autoBot();
 G.pt+=dt;if(G.swing>=0)G.swing+=dt;
 if(G.phase=='ready'&&G.pt>.35){G.phase='windup';G.pt=0}
 else if(G.phase=='windup'&&G.pt>.6){G.phase='pitch';G.pt=0;newPitch()}
 else if(G.phase=='pitch'){const b=G.ball;b.t+=dt/b.p.dur;const q=ballPos(b,b.t);b.x=q.x;b.y=q.y;b.r=q.r;G.trail.push({x:b.x,y:b.y});if(G.trail.length>6)G.trail.shift();
  if(G.bunt&&!b.judged&&b.t>=CONTACT_T){b.judged=1;const P=ballPos(b,CONTACT_T);if(Math.abs(P.x-211)<22&&P.y>132&&P.y<170){buntContact(b);return}}
  if(!b.judged&&b.t>=CONTACT_T){const j=judge();if(j&&j.type!='miss'){b.judged=1;contact(j);return}if(j)b.judged=1}
  if(b.t>=1.08){sfx('mitt');G.ball=null;G.trail=[];const swung=G.swing>=0;
   if(G.bunt){G.strikes++;say('번트 실패','#ff8a7a',1,'스트라이크');G.bunt=null}
   else if(swung||b.inZone){G.strikes++;ST.streak=0;ST.last=swung?'miss':'look';say(G.strikes>=3?'삼진':'스트라이크','#ff8a7a',1,swung?'헛스윙':'루킹');G.shake=1*T.shake}else{G.balls++;ST.last='ball';say('볼','#ffffff',1,'잘 골랐다')}
   ST.n++;
   G.phase='result';G.pt=0}}
 else if(G.phase=='result'&&G.pt>.75){G.swing=-1;if(G.strikes>=3||G.balls>=4){G.balls=0;G.strikes=0}G.phase='ready';G.pt=0;G.msg=null;G.bunt=null}
 else if(G.phase=='foul'){const h=G.hit;h.t+=dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.vy+=80*dt;h.r=Math.max(.6,h.r-dt*2);G.trail.push({x:h.x,y:h.y});if(G.trail.length>8)G.trail.shift();
  if(h.t>.8){G.hit=null;G.trail=[];if(G.strikes<2)G.strikes++;G.phase='result';G.pt=.3}}
 else if(G.phase=='bunt'){const h=G.hit;h.t+=dt;const u=Math.min(1,h.t/1.1),e=1-Math.pow(1-u,2);h.x=h.x0+(h.x1-h.x0)*e;h.y=h.y0+(h.y1-h.y0)*e-Math.abs(Math.sin(u*9))*2*(1-u);h.r=1.3;
  const f=G.fielders[h.fi];f.run=1;f.x+=(h.x-f.x)*Math.min(1,dt*2);f.y+=(h.y+3-f.y)*Math.min(1,dt*2);
  if(h.t>1.4&&!h.done){h.done=1;say('번트 안타!','#ffe060',2,'만루 찬스!');sfx('crowd');G.cheer=.5;G.bases=[1,1,1]}
  if(h.t>2.6){G.hit=null;G.balls=0;G.strikes=0;G.bunt=null;G.swing=-1;G.phase='ready';G.pt=0;G.msg=null;G.fielders.forEach(f=>{f.x=f.hx;f.y=f.hy;f.run=0})}}
 else if(G.phase=='fly'){const h=G.hit;h.t+=dt;const u=Math.min(1,h.t/h.dur);
  h.x=h.x0+(h.x1-h.x0)*u;h.y=h.y0+(h.y1-h.y0)*u-Math.sin(u*Math.PI)*h.arc;h.r=Math.max(.6,2.6*(1-u)+.6);
  G.trail.push({x:h.x,y:h.y});if(G.trail.length>(h.type=='hr'?20:12))G.trail.shift();
  if(h.type!='hr'){const f=G.fielders[h.fi];f.run=1;f.x+=(h.x1-f.x)*Math.min(1,dt*1.5);f.y+=(h.y1-f.y)*Math.min(1,dt*1.5)}
  if(u>=1&&!h.landed){h.landed=1;if(h.type=='hr'){G.white=2;G.cheer=1;G.shake=4*T.shake;say('홈런!!','#ffe060',3,'비거리 '+h.dist+'m');sfx('roar');G.home++;
    for(let i=0;i<16;i++)G.fw.push({x:30+rnd()*360,y:12+rnd()*50,t:-i*.14,c:['#ffe060','#ff6a5a','#ffffff','#8ad8ff'][i%4]})}
   else{G.cheer=.8;say(h.dist>85?'장타!':'안타!','#ffe060',2,'타구 '+h.dist+'m');sfx('crowd')}}
  if(h.landed&&h.t>h.dur+(h.type=='hr'?1.6:.9)){G.hit=null;G.trail=[];G.balls=0;G.strikes=0;G.swing=-1;G.phase='ready';G.pt=0;G.msg=null;G.slow=0;G.fielders.forEach(f=>{f.x=f.hx;f.y=f.hy;f.run=0})}}
 G.fielders.forEach(f=>{if(!f.run){f.x+=(f.hx-f.x)*dt*2;f.y+=(f.hy-f.y)*dt*2}});
 G.fw.forEach(f=>f.t+=dt);G.fw=G.fw.filter(f=>f.t<1.4)}
function nearestF(x,y){let bi=0,bd=1e9;G.fielders.forEach((f,i)=>{const d=Math.hypot(f.x-x,f.y-y);if(d<bd){bd=d;bi=i}});return bi}
function contact(j){const b=G.ball,q=j.q;G.q=q;sfx('crack',q);if(q>.8)sfx('crowd');
 ST.n++;if(j.type!='foul'){ST.streak++;ST.hits++;ST.best=Math.max(ST.best,ST.streak)}if(j.type=='hr')ST.hr++;if(j.perfect)ST.perfect++;ST.last=j.type+(j.perfect?'*':'');
 G.freeze=T.hitstop/1000*(0.4+0.6*q);G.shake=(1+3.5*q)*T.shake;G.white=q>.8?2:q>.5?1:0;G.zoom=q>.5?.06+.14*q:0;G.chrom=q>.5?q:0;G.zc={x:b.x,y:b.y};
 G.burst={x:b.x,y:b.y,t:G.t,q};G.trail=[];const side=Math.max(-1,Math.min(1,-j.err*12));
 if(j.type=='foul'){G.hit={x:b.x,y:b.y,vx:j.err>0?160:-160,vy:-120,r:2,t:0};G.phase='foul';say('파울','#c8d0e0',1,q<.3?'빗맞았다':'아깝다!');G.ball=null;return}
 const hr=j.type=='hr';const x1=211-side*150,y1=hr?40:104;const ev=T.exitv*(0.85+0.3*T.power/99);const dist=hr?Math.round(105+20*q*ev+rnd()*8):Math.round((40+50*q)*ev);G.hit={type:j.type,dist,x0:b.x,y0:b.y,x:b.x,y:b.y,x1,y1,arc:hr?40:30,dur:(hr?1.3:.9)/T.exitv,t:0,r:2.6,fi:nearestF(x1,y1)};
 if(hr)G.slow=.5;say(j.perfect?'PERFECT!':'잘 맞았다!','#ffe060',2,j.perfect?'저스트 미트':'');
 G.ball=null;G.phase='fly';G.pt=0}
function buntContact(b){const side=G.bunt;sfx('crack',.15);G.freeze=.05;G.shake=1;G.burst={x:b.x,y:b.y,t:G.t,q:.15};G.trail=[];
 G.hit={x0:b.x,y0:b.y,x:b.x,y:b.y,x1:side=='L'?150:272,y1:side=='L'?132:130,t:0,r:1.3,fi:side=='L'?1:3};G.ball=null;G.phase='bunt';G.pt=0;say(side=='L'?'3루쪽 번트':'1루쪽 번트','#ffffff',1)}
// ---- render ----
function drawBall(c,x,y,r,glow){x=Math.round(x);y=Math.round(y);const R=Math.max(1,Math.round(r));
 if(R<=1){rect(c,x,y,2,2,'#ffffff');rect(c,x+1,y+1,1,1,'#b4bad2');return}
 disc(c,x,y,R,'#7f86a6');disc(c,x,y,R-.6,'#dfe3f0');disc(c,x-1,y-1,Math.max(1,R-1.5),'#ffffff');if(R>=2){rect(c,x-R+1,y,1,1,'#d8313a');rect(c,x+R-1,y-1,1,1,'#d8313a')}}
function drawCursor(c,x,y,active){const CR=curR();c.save();c.globalAlpha=active?.85:.55;c.fillStyle='#ffffff';
 for(let i=0;i<64;i++){const a=i/64*6.283;c.fillRect(Math.round(x+Math.cos(a)*CR.rx),Math.round(y+Math.sin(a)*CR.ry),1,1)}
 c.globalAlpha*=.6;for(let i=0;i<40;i++){const a=i/40*6.283;c.fillRect(Math.round(x+Math.cos(a)*CR.rx*.3),Math.round(y+Math.sin(a)*CR.ry*.3),1,1)}
 c.globalAlpha=active?.9:.6;c.fillRect(x,y,1,1);c.restore()}
function drawBurst(c,x,y,k,q){const n=8+Math.round(q*8),R=6+q*22;c.save();c.globalAlpha=1-k;
 for(let i=0;i<n;i++){const a=i/n*6.283+q;const r0=R*k*.3,r1=R*(.4+k*.8)*(i%2?.6:1);for(let s=r0;s<r1;s++){c.fillStyle=s<r0+(r1-r0)*.5?'#fffbe0':'#f8cc40';c.fillRect(Math.round(x+Math.cos(a)*s),Math.round(y+Math.sin(a)*s),i%2?1:2,i%2?1:2)}}
 disc(c,x,y,Math.max(1,Math.round(R*.35*(1-k))),'#ffffff');c.restore()}
function chibi(c,i,x,y,row=0){c.drawImage(IMG.chibi,i*CW,row*CH,CW,CH,Math.round(x-CW/2),Math.round(y-11),CW,CH)}
function shadow(c,x,y,w){c.save();c.globalAlpha=.28;c.fillStyle='#1c3a10';for(let k=-1;k<=1;k++){const ww=Math.round(w*(1-Math.abs(k)*.35));c.fillRect(Math.round(x-ww),Math.round(y+k),ww*2,1)}c.restore()}
function render(){const c=L;c.drawImage(IMG.bg,0,0);
 // scoreboard LED (live)
 const blink=G.cheer>.3&&(G.t*4|0)%2;ptxt(c,blink?'HOME RUN!':'TIGERS',211,59,11,blink?'#ffe060':'#ffffff','center','#1a2a70');ptxt(c,G.away+' : '+G.home,211,69,9,'#ffd040','center',null,1,'9px G9');
 G.fw.forEach(f=>{if(f.t<0)return;const r=f.t*26;for(let k=0;k<14;k++){const a=k/14*6.28;const x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r+f.t*f.t*10;rect(c,x,y,1,1,f.t>1?'#a8b4c4':f.c);rect(c,x-Math.cos(a)*2,y-Math.sin(a)*2,1,1,f.c)}});
 // fielders
 G.fielders.forEach(f=>{shadow(c,f.x,f.y,3);chibi(c,f.run?(2+((G.t*8)|0)%2):((Math.sin(G.t*2+f.ph)>0)?0:1),f.x,f.y)});
 [[0,372,133],[1,216,112],[2,50,135]].forEach(([i,x,y])=>{if(G.bases[i]){shadow(c,x,y,3);chibi(c,(Math.sin(G.t*3+i)>0)?0:1,x,y,1)}});
 let pf=4;if(G.phase=='windup')pf=G.pt<.35?4:G.pt<.75?5:6;else if(G.phase=='pitch'&&G.ball&&G.ball.t<.4)pf=7;
 shadow(c,207,121,3.5);chibi(c,pf,207,121);
 if(['ready','windup','pitch'].includes(G.phase)){c.save();c.globalAlpha=.45;c.fillStyle='#ffffff';const z=ZONE;rect(c,z.x0,z.y0,z.x1-z.x0,1,'#fff');rect(c,z.x0,z.y1,z.x1-z.x0+1,1,'#fff');rect(c,z.x0,z.y0,1,z.y1-z.y0,'#fff');rect(c,z.x1,z.y0,1,z.y1-z.y0,'#fff');c.restore()}
 // trail
 G.trail.forEach((p,i)=>{c.save();c.globalAlpha=(i+1)/G.trail.length*.45;rect(c,p.x,p.y,2,2,'#ffffff');c.restore()});
 const ballBehind=G.ball&&G.ball.t<.97;if(G.ball&&ballBehind)drawBall(c,G.ball.x,G.ball.y,G.ball.r);
 // batter
 const B=LAYOUT.batter;shadow(c,B.x+76,B.y+105,30);c.drawImage(IMG.batter,batterFrame()*BW,0,BW,BH,B.x,B.y,BW,BH);
 if(G.ball&&!ballBehind)drawBall(c,G.ball.x,G.ball.y,G.ball.r);
 if(G.hit)drawBall(c,G.hit.x,G.hit.y,G.hit.r);
 if(['ready','windup','pitch'].includes(G.phase)&&!G.bunt){const cu=G.swing>=0?G.swingCur:G.cur;drawCursor(c,Math.round(cu.x),Math.round(cu.y),!!G.drag||G.swing>=0)}
 if(G.burst){const k=(G.t-G.burst.t)/.35;if(k<1)drawBurst(c,G.burst.x,G.burst.y,k,G.burst.q);else G.burst=null}
 drawHUD(c);drawButtons(c);
 if(DEMO&&G.fing&&G.fing.down&&!G.bunt){c.save();c.globalAlpha=.5;const fx=G.cur.x+36,fy=G.cur.y+26;for(let i=0;i<24;i++){const a=i/24*6.283;rect(c,fx+Math.cos(a)*6,fy+Math.sin(a)*6,1,1,'#ffffff')}c.restore()}
 drawMsg(c);
 if(G.phase=='end'){const y=150;c.save();c.globalAlpha=.85;rect(c,120,y-11,182,22,'#0e1a40');c.restore();rect(c,120,y-11,182,1,'#86c8f0');rect(c,120,y+10,182,1,'#86c8f0');ptxt(c,G.over>0?'경기 끝! 타이거즈 승리':'경기 끝… 패배',211,y,11,'#ffffff','center','#0e1a40')}
 if(G.white>0){c.save();c.globalAlpha=G.white>=2?.9:.5;c.fillStyle='#fffbe0';c.fillRect(0,0,LW,LH);c.restore();G.white--}
 blit()}
const RC=document.createElement('canvas'),GC=document.createElement('canvas');RC.width=GC.width=LW*S;RC.height=GC.height=LH*S;
function blit(){const sh=G.shake,ox=sh?Math.round((rnd()-.5)*sh*2)*S:0,oy=sh?Math.round((rnd()-.5)*sh*2)*S:0;
 const z=1+G.zoom,zx=G.zc.x*S,zy=G.zc.y*S;
 const draw=ctx=>{ctx.imageSmoothingEnabled=false;ctx.setTransform(z,0,0,z,zx*(1-z)+ox,zy*(1-z)+oy);ctx.drawImage(low,0,0,LW*S,LH*S);ctx.setTransform(1,0,0,1,0,0)};
 X.fillStyle='#000';X.fillRect(0,0,cv.width,cv.height);
 if(G.chrom>.05){const k=Math.round(G.chrom*4)*S/2|0;for(const[cc,col,dx]of[[RC,'#ff0000',-k],[GC,'#00ffff',k]]){const g=cc.getContext('2d');g.globalCompositeOperation='source-over';draw(g);g.globalCompositeOperation='multiply';g.fillStyle=col;g.fillRect(0,0,cc.width,cc.height)}
  X.globalCompositeOperation='lighter';X.drawImage(RC,-k,0);X.drawImage(GC,k,0);X.globalCompositeOperation='source-over'}else draw(X)}
function drawMsg(c){const m=G.msg;if(!m)return;const y=LAYOUT.msgY;const a=Math.min(1,m.t/.12);let sc=m.big>=3?3:m.big>=2?2:1;
 const t=ptex(m.txt,'12px GB',m.col,'#5a1a10');while(t.width*sc>LW-20&&sc>1)sc--;const pop=1+(1-a)*1.5;const w=t.width*sc*pop,h=t.height*sc*pop;
 c.save();c.globalAlpha=.75*a;rect(c,0,y-h/2-3,LW,h+6+(m.sub?12:0),'#0e1a40');c.restore();rect(c,0,y-h/2-3,LW,1,'#86c8f0');
 c.drawImage(t,Math.round(211-w/2),Math.round(y-h/2),w,h);if(m.sub&&a>=1)ptxt(c,m.sub,211,y+h/2+5,11,'#ffffff','center','#0e1a40')}
// ---- HUD (baked panel + live text) ----
function drawHUD(c){const H=LAYOUT.hud,x=H.x,y=H.y;c.drawImage(IMG.hud,x,y);
 ptxt(c,'9',x+15,y+13,12,'#ffffff','center','#16265a',2);ptxt(c,'회말',x+15,y+30,9,'#ffffff','center',null,1,'9px G9');
 // team row
 const r1=y+11;for(let i=0;i<4;i++)rect(c,x+33+i,r1-3+i*.5,1,7-i*2,'#ffffff');
 ptxt(c,'원정',x+39,r1,11,'#ffffff','left',null);ptxt(c,String(G.away).padStart(2,'0'),x+90,r1,11,'#ffffff','right',null);rect(c,x+93,r1-4,1,9,'#5a7ab8');
 ptxt(c,String(G.home).padStart(2,'0'),x+96,r1,11,'#ffffff','left',null);ptxt(c,'KIA',x+115,r1,11,'#ffffff','left',null);
 const ac=(G.t*2|0)%2?'#ff8a3a':'#ff6a1a';for(let i=0;i<5;i++)rect(c,x+144+i,r1-i,1,1+i*2,ac);
 // B/S/O
 const r2=y+26;const dots=(l,n,max,col,x0)=>{ptxt(c,l,x0,r2,11,'#ffffff','left',null);for(let i=0;i<max;i++){const xx=x0+11+i*7;disc(c,xx,r2,2,'#2a3a5c');if(i<n){disc(c,xx,r2,2,col);rect(c,xx-1,r2-1,1,1,'#ffffff')}}};
 dots('B',G.balls,3,'#56d050',x+30);dots('S',G.strikes,2,'#ffd040',x+58);dots('O',G.outs,2,'#ff5a4a',x+80);
 // info chip: wind + pitch speed
 const lp=G.lastPitch;if(lp&&!['ready','windup'].includes(G.phase))ptxt(c,lp.kmh+'',x+134,r2,11,'#ffe060','center',null);
 else{disc(c,x+122,r2,3,'#dfe3f0');disc(c,x+125,r2-1,2,'#ffffff');for(let i=0;i<3;i++)rect(c,x+128-i,r2-1+i,1+i*2,1,'#5ab0ff');rect(c,x+128,r2+2,1,3,'#5ab0ff');ptxt(c,'7m',x+133,r2,11,'#ffffff','left',null)}
 const D=LAYOUT.diamond;c.drawImage(IMG.diamond,D.x,D.y);const cx=D.x+23,cy=D.y+23;
 for(const[i,bx,by]of[[0,cx+19,cy],[1,cx,cy-19],[2,cx-19,cy]])c.drawImage(G.bases[i]?IMG.bag1:IMG.bag0,bx-4,by-4);c.drawImage(IMG.bag0,cx-4,cy+15)}
function drawStats(c){const x=300,y=6;c.save();c.globalAlpha=.7;rect(c,x,y,118,30,'#0e1a40');c.restore();rect(c,x,y,118,1,'#86c8f0');
 ptxt(c,'연속안타 '+ST.streak+'  최고 '+ST.best,x+4,y+9,9,'#ffe060','left',null,1,'9px G9');ptxt(c,'퍼펙트 '+ST.perfect+'  홈런 '+ST.hr+'  투구 '+ST.n,x+4,y+21,9,'#ffffff','left',null,1,'9px G9')}
function drawButtons(c){drawStats(c);const B=LAYOUT.btn;for(const k of['L','R','SW']){const b=B[k];const pr=(G.press[k]&&G.t-G.press[k]<.2)||(k!='SW'&&G.bunt==k&&G.phase!='ready');const im=IMG['btn'+k+(pr?'_p':'')];
 c.drawImage(im,Math.round(b.x-im.width/2),Math.round(b.y-im.height/2+(pr?1:0)))}}
function hitBtn(x,y){const B=LAYOUT.btn;for(const k of['SW','L','R']){const b=B[k];if(Math.hypot(x-b.x,y-b.y)<=b.r+2)return k}return null}
function pressBtn(k){G.press[k]=G.t;if(k=='SW')trySwing();else if(['ready','windup','pitch'].includes(G.phase)&&!G.bunt&&G.swing<0&&!(G.ball&&G.ball.t>.8)){G.bunt=k;sfx('swing')}}
// ---- demo: take a slider, L번트 single (bases loaded), track + swing = sweet-spot grand slam ----
const DEMOP=[{type:1,tx:236,ty:160},{type:0,tx:206,ty:156},{type:0,tx:213,ty:148}];
const DPLAN=[{off:{x:-14,y:-8},gain:.5},{bunt:'L'},{off:{x:0,y:0},gain:1,sw:1}];
const SCRIPT={done:0};const AUTO=Q.has('auto');
function autoBot(){if(G.phase!='pitch'||!G.ball||G.swing>=0)return;const b=G.ball,P=ballPos(b,CONTACT_T);const j=AUTO_J;G.cur.x=P.x+j.ox;G.cur.y=P.y+j.oy;clampCur();
 if(b.t>=CONTACT_T-LEAD/b.p.dur+j.dt/b.p.dur)pressBtn('SW')}
let AUTO_J={ox:0,oy:0,dt:0};window.setAutoJ=o=>AUTO_J=o;
function demo(dt){const k=G.pitchN-1,pl=DPLAN[G.pitchN-(G.phase=='pitch'?1:0)]||{};
 if(G.phase=='windup'){G.fing=G.fing||{down:0};if(!pl.bunt)G.fing.down=1;if(pl.bunt&&G.pt>.6&&!G.bunt)pressBtn(pl.bunt)}
 if(G.phase=='pitch'&&G.ball&&G.swing<0&&!G.bunt){const p=DPLAN[k],P=ballPos(G.ball,CONTACT_T);const tx=211+(P.x+p.off.x-211)*p.gain,ty=151+(P.y+p.off.y-151)*p.gain;
  const r=Math.min(1,dt*(G.ball.t>.15?11:2));G.cur.x+=(tx-G.cur.x)*r;G.cur.y+=(ty-G.cur.y)*r;
  if(p.sw&&G.ball.t>=CONTACT_T-LEAD/G.ball.p.dur){G.cur.x=tx;G.cur.y=ty;pressBtn('SW')}}
 if(G.phase!='pitch'&&G.phase!='windup'&&G.fing)G.fing.down=0;
 if(G.phase=='ready'){G.cur.x+=(211-G.cur.x)*Math.min(1,dt*4);G.cur.y+=(151-G.cur.y)*Math.min(1,dt*4)}
 if(G.phase=='end'){SCRIPT.endT=(SCRIPT.endT||0)+dt;if(SCRIPT.endT>1.3)SCRIPT.done=1}}
// ---- input: buttons; drag elsewhere aims the meet cursor, release swings ----
const clampCur=()=>{G.cur.x=Math.max(CUR.x0,Math.min(CUR.x1,G.cur.x));G.cur.y=Math.max(CUR.y0,Math.min(CUR.y1,G.cur.y))};
const toLow=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*LW,y:(e.clientY-r.top)/r.height*LH}};
cv.addEventListener('pointerdown',e=>{if(audio==null){try{audio=new AudioContext()}catch(_){}}
 const p=toLow(e),b=hitBtn(p.x,p.y);if(b){pressBtn(b);return}if(G.drag)return;cv.setPointerCapture(e.pointerId);G.drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,cx:G.cur.x,cy:G.cur.y}});
cv.addEventListener('pointermove',e=>{if(!G.drag||G.drag.id!==e.pointerId)return;const r=cv.getBoundingClientRect(),k=LW/r.width*.9;G.cur.x=G.drag.cx+(e.clientX-G.drag.sx)*k;G.cur.y=G.drag.cy+(e.clientY-G.drag.sy)*k;clampCur()});
cv.addEventListener('pointerup',e=>{if(!G.drag||e.pointerId!==G.drag.id)return;G.drag=null;trySwing()});cv.addEventListener('pointercancel',()=>{G.drag=null});
const KEYS={};window.addEventListener('keydown',e=>{KEYS[e.code]=1;if(e.repeat)return;if(e.code=='Space')pressBtn('SW');if(e.code=='KeyZ')pressBtn('L');if(e.code=='KeyX')pressBtn('R')});window.addEventListener('keyup',e=>{KEYS[e.code]=0});
setInterval(()=>{const v=1.2;if(KEYS.ArrowLeft)G.cur.x-=v;if(KEYS.ArrowRight)G.cur.x+=v;if(KEYS.ArrowUp)G.cur.y-=v;if(KEYS.ArrowDown)G.cur.y+=v;clampCur()},16);
window.G=G;window.SCRIPT=SCRIPT;window.advance=n=>{for(let i=0;i<n;i++)step(1/60);render()};
Promise.all([...LOADS,...['12px GB','11px GB','11px G','9px G9'].map(f=>document.fonts.load(f))]).then(()=>{window.ready=1;render();
 if(!REC){let last=performance.now(),acc=0;const loop=now=>{acc+=Math.min(.1,(now-last)/1000);last=now;while(acc>=1/60){step(1/60);acc-=1/60}render();requestAnimationFrame(loop)};requestAnimationFrame(loop)}});
