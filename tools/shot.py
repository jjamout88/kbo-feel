import sys
from playwright.sync_api import sync_playwright
url,out,w,h=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4])
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files']);pg=b.new_page(viewport={'width':w,'height':h})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(url);pg.wait_for_function('window.done',timeout=20000);pg.screenshot(path=out);print('errors',errs)
