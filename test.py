from playwright.sync_api import sync_playwright
def run(pg,q,n=3600,fix=None):
    pg.goto('file:///workspace/kbobaseball/feel/index.html?'+q);pg.wait_for_function('window.ready')
    if fix: pg.evaluate(f'window.fixJ=1;setAutoJ({fix})')
    pg.evaluate(f'advance({n})');return pg.evaluate('({...ST,phase:G.phase})')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args=['--allow-file-access-from-files'])
    pg=b.new_page(viewport={'width':844,'height':390});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('file:///workspace/kbobaseball/feel/index.html');pg.evaluate('localStorage.clear()')
    print('default auto',run(pg,'test&auto',7200))
    pg.evaluate("localStorage.setItem('kboFeel',JSON.stringify({contact:25,power:25,pitcher:95}))")
    print('weak vs ace',run(pg,'test&auto',7200))
    pg.evaluate("localStorage.setItem('kboFeel',JSON.stringify({perfect:80}))")
    print('perfect80',run(pg,'test&auto',7200))
    pg.evaluate("localStorage.setItem('kboFeel',JSON.stringify({speed:1.8}))")
    print('speed1.8 (pitch dur)',pg.goto('file:///workspace/kbobaseball/feel/index.html?test') or pg.wait_for_function('window.ready') or pg.evaluate('advance(80);G.ball&&G.ball.p.dur'))
    pg.evaluate('localStorage.clear()')
    print('speed1.0 (pitch dur)',pg.goto('file:///workspace/kbobaseball/feel/index.html?test') or pg.wait_for_function('window.ready') or pg.evaluate('advance(80);G.ball&&G.ball.p.dur'))
    print('perfect-only fixed',run(pg,'test&auto',7200,'{ox:0,oy:0,dt:0}'))
    # screenshots
    run(pg,'test&auto',0)
    pg.evaluate('window.fixJ=1;setAutoJ({ox:0,oy:0,dt:0})')
    for i in range(400):
        pg.evaluate('advance(1)')
        if pg.evaluate("G.phase=='fly'&&G.hit&&G.hit.t>.25"):break
    pg.screenshot(path='shots/feel_gameplay.png')
    pg.click('#gear');pg.screenshot(path='shots/feel_panel.png');pg.click('#copy')
    print('copy text:',pg.input_value('#out'))
    # slider via UI persists
    pg.fill('#s_cursor','1.5') if False else pg.evaluate("s_cursor.value=1.5;s_cursor.dispatchEvent(new Event('input'))")
    print('saved',pg.evaluate("localStorage.getItem('kboFeel')"))
    print('errors',errs)
