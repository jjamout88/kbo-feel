# 스크린샷 도우미: python3 tools/play.py out.png "js 코드" [프레임]
import sys
from playwright.sync_api import sync_playwright
import os as _os
TOOLS=_os.path.dirname(_os.path.abspath(__file__)); APP='file://'+_os.path.join(_os.path.dirname(TOOLS),'app','index.html')
out=sys.argv[1]; code=sys.argv[2] if len(sys.argv)>2 else ''; n=int(sys.argv[3]) if len(sys.argv)>3 else 30
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files']);pg=b.new_page(viewport={'width':844,'height':390})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type in('error','warning') and errs.append(m.text))
    pg.goto(APP+'?manual');pg.wait_for_function('window.ready',timeout=20000)
    pg.evaluate('localStorage.clear()')
    if code: pg.evaluate(code)
    pg.evaluate(f'advance({n})');pg.screenshot(path=out);print('errors',errs)
