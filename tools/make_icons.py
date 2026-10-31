# 앱 아이콘 생성: tools/icon.html(게임 타자 스프라이트)을 64x64로 렌더 → app/icons/ 에 180·192·512·마스커블512
import os
from playwright.sync_api import sync_playwright
from PIL import Image
T=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(os.path.dirname(T),'app','icons'); os.makedirs(OUT,exist_ok=True)
tmp=os.path.join(OUT,'_base.png')
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files']);pg=b.new_page(viewport={'width':64,'height':64})
    pg.goto('file://'+os.path.join(T,'icon.html'));pg.wait_for_function('window.done')
    pg.screenshot(path=tmp,clip={'x':0,'y':0,'width':64,'height':64})
base=Image.open(tmp).convert('RGB')
for s in (180,192,512): base.resize((s,s),Image.NEAREST).save(os.path.join(OUT,f'icon-{s}.png'))
m=Image.new('RGB',(512,512),(10,14,36)); m.paste(base.resize((410,410),Image.NEAREST),(51,51)); m.save(os.path.join(OUT,'icon-maskable-512.png'))
os.remove(tmp); print('icons ->',OUT)
