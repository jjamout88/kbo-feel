# dist/ 생성: 아티팩트용 game.html(문서 골격 없이) + js/fonts 복사
import re,shutil,os
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
src=open('app/index.html',encoding='utf-8').read()
head=re.search(r'<head>(.*)</head>',src,re.S).group(1); body=re.search(r'<body>(.*)</body>',src,re.S).group(1)
head=re.sub(r'<meta charset[^>]*>\s*','',head); head=re.sub(r'<meta name="viewport"[^>]*>\s*','',head)
os.makedirs('dist',exist_ok=True)
import base64
for f in ['Galmuri11-Bold','Galmuri11','Galmuri9']:
    b=base64.b64encode(open(f'app/fonts/{f}.woff2','rb').read()).decode()
    head=head.replace(f"url(fonts/{f}.woff2)",f"url(data:font/woff2;base64,{b})")
open('dist/game.html','w',encoding='utf-8').write(head.strip()+'\n'+body.strip()+'\n')
for d in ['js','fonts']:
    if os.path.exists('dist/'+d): shutil.rmtree('dist/'+d)
    shutil.copytree('app/'+d,'dist/'+d)
print(os.listdir('dist'),os.path.getsize('dist/game.html'))
