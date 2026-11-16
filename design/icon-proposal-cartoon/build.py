"""Build the approval sheet and original SVG sources; does not modify the app."""
from pathlib import Path
import html, json, re

ROOT = Path(__file__).parent
icons = {}
def p(d, **attrs):
    return '<path d="' + d + '" ' + ' '.join(f'{k.replace("_", "-")}="{v}"' for k,v in attrs.items()) + '/>'
def accent(d, fill=False):
    return p(d, stroke='var(--icon-accent,#f26a2e)', fill='var(--icon-tint,#fff0e7)' if fill else 'none')
def circle(x,y,r,orange=False):
    return f'<circle cx="{x}" cy="{y}" r="{r}"'+(' stroke="var(--icon-accent,#f26a2e)"' if orange else '')+'/>'
def add(name,label,group,body): icons[name] = dict(label=label,group=group,body=body)

N='Навигация'; A='Действия'; L='Занятия и знания'; P='Профиль и общение'; F='Платежи и статусы'; E='Редактор'
add('back','Назад',N,p('m14.5 5.5-6.5 6.5 6.5 6.5'))
add('right','Вперёд',N,p('m9.5 5.5 6.5 6.5-6.5 6.5'))
add('down','Раскрыть',N,p('m5.5 9 6.5 6 6.5-6'))
add('arrow-up','Наверх',N,p('m5.5 15 6.5-6 6.5 6'))
add('menu','Меню',N,p('M4.5 6.5h15M4.5 12h15M4.5 17.5h15'))
add('x','Закрыть',N,p('m6 6 12 12M18 6 6 18'))
add('more','Ещё',N,circle(5,12,.8)+circle(12,12,.8)+circle(19,12,.8))
add('home','Главная',N,p('m3 10 9-7 9 7M5 9v10q0 2 2 2h10q2 0 2-2V9')+accent('M10 21v-7h4v7'))
add('search','Поиск',A,circle(10.5,10.5,6.4)+p('m15.4 15.4 5.1 5.1')+accent('M7 10a3.6 3.6 0 0 1 3.5-3.2'))
add('filter','Фильтры',A,p('M4 6h16M4 12h16M4 18h16')+p('M8 4v4M16 10v4M10 16v4',stroke='var(--icon-accent,#f26a2e)',stroke_width='2.8'))
add('sort','Сортировка',A,p('M7 4v16m-3-3 3 3 3-3M17 20V4m-3 3 3-3 3 3'))
add('plus','Добавить',A,p('M12 4.5v15M4.5 12h15'))
add('minus','Уменьшить',A,p('M4.5 12h15'))
add('check','Подтвердить',A,p('m4.5 12 4.8 4.8L19.5 6.5'))
add('checks','Прочитать всё',A,p('m4 6 .8.8L7 4.5M10 6h10M4 12l.8.8L7 10.5M10 12h10M4 18l.8.8L7 16.5M10 18h10'))
add('tick','Отправлено',A,p('m5 12 4 4L19 6'))
add('ticks','Прочитано',A,p('m2.5 12 4 4L16 6m-4 9 1 1L22 6'))
add('pen','Редактировать',A,p('m5 15-1.2 5.2L9 19l10.8-10.8q1.2-1.2 0-2.4l-1.6-1.6q-1.2-1.2-2.4 0ZM13.5 6.5l4 4')+accent('m5 15 4 4'))
add('trash','Удалить',A,p('M4 6h16M9 6V3h6v3M6 6l1 13q.1 2 2 2h6q1.9 0 2-2l1-13')+accent('M10 10v7M14 10v7'))
add('repeat','Повторить / перенести',A,p('M20 10a8 8 0 0 0-13-5L3 8m0-5v5h5M4 14a8 8 0 0 0 13 5l4-3m0 5v-5h-5'))
add('upload','Загрузить',A,p('M12 16V3m-4 4 4-4 4 4M4 15v4q0 2 2 2h12q2 0 2-2v-4'))
add('share','Поделиться',A,p('M12 15V3m-4 4 4-4 4 4M8 10H6q-2 0-2 2v7q0 2 2 2h12q2 0 2-2v-7q0-2-2-2h-2'))
add('copy','Копировать',A,p('M8 8h10q2 0 2 2v10H10q-2 0-2-2ZM15 4H6q-2 0-2 2v9'))
add('link','Ссылка',A,p('m9 15 6-6M8 10l-3 3a4.2 4.2 0 0 0 6 6l3-3M10 8l3-3a4.2 4.2 0 0 1 6 6l-3 3'))
add('attach','Вложение',A,p('m8 13 6-6a2.1 2.1 0 0 1 3 3l-7 7a4 4 0 0 1-5.7-5.7l7.6-7.6a5.5 5.5 0 0 1 7.8 7.8l-8 8'))
add('eye','Показать пароль',A,p('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z')+circle(12,12,2.6,True))
add('eye-off','Скрыть пароль',A,p('m3 3 18 18M8.5 5.6Q10 5 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3.5 4.4M5.5 7.4A19 19 0 0 0 2 12s3.5 7 10 7q2 0 4-1')+p('M10 10a2.8 2.8 0 0 0 4 4'))
add('book','Книга / занятия',L,p('M12 5Q7 2 3 4v15q5-2 9 1 4-3 9-1V4q-4-2-9 1Zm0 0v15')+accent('M6 8q1.5-.5 3 .5M6 11q1.5-.5 3 .5M15 8q1.5-1 3-.5'))
add('cal','Календарь',L,p('M5 5h14q2 0 2 2v12q0 2-2 2H5q-2 0-2-2V7q0-2 2-2ZM7 3v4M17 3v4M3 10h18')+accent('m8 15 3 3 5-5'))
add('clock','Время',L,circle(12,12,9)+accent('M12 6.5v6l4 2.5'))
add('school','Образование',L,accent('m2 8.5 10-5 10 5-10 5Z',True)+p('M6 11v6q6 5 12 0v-6M22 9v7m0 0-1 3h2Z'))
add('doc','Документ / диплом',L,p('M6 3h8l5 5v11q0 2-2 2H6q-2 0-2-2V5q0-2 2-2Zm8 0v5h5')+accent('M8 12h7M8 16h5'))
add('star','Достижение',L,p('m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.3-.9Z'))
add('star-on','Выбранная звезда',L,accent('m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.3-.9Z',True))
add('globe','Языки',L,circle(12,12,9)+p('M3 12h18M12 3q-7 9 0 18 7-9 0-18Z')+accent('M5 7.5q7 3 14 0M5 16.5q7-3 14 0'))
add('target','Цель',L,circle(11,13,8)+circle(11,13,4)+accent('m11 13 8-8m-3 0h3v3'))
add('gift','Бесплатное знакомство',L,p('M3 9h18v4H3Zm2 4v8h14v-8M12 9v12')+accent('M12 9C4 10 4 1 8 3q3 .5 4 6Zm0 0c8 1 8-8 4-6q-3 .5-4 6Z'))
add('shapes','Предметы',L,accent('m7 3 4 7H3Z',True)+circle(17,7,3.5)+p('M4 15h7v7H4Zm13 0 4 3.5-4 3.5-4-3.5Z'))
add('route','План обучения',L,circle(5,18,2)+circle(19,6,2,True)+p('M7 18h8a4 4 0 0 0 0-8H9a2 2 0 0 1 0-4h8'))
add('chart','Результат',L,p('M4 3v18h17')+accent('m8 15 4-5 3 2 5-7'))
add('user','Профиль',P,circle(12,7.2,4)+p('M4 21v-2q0-6 8-6t8 6v2Z'))
add('person-plus','Ученики',P,circle(9,7.2,3.7)+p('M2.5 21v-2q0-5.5 6.5-5.5 3.5 0 5.2 1.8')+accent('M19 13v8M15 17h8'))
add('chat','Диалог',P,p('M5 4h14q3 0 3 3v9q0 3-3 3h-8l-6 3v-3q-3 0-3-3V7q0-3 3-3Z')+accent('M7 9h10M7 13h6'))
add('chat-round','Общение',P,p('M21 11.5a9 9 0 0 1-9 9q-2 0-4-1L3 21l1.5-5a9 9 0 1 1 16.5-4.5Z')+accent('M7 10h10M7 14h6'))
add('send','Отправить',P,accent('m3 4 19-2-7 20-4-8Z',True)+p('m11 14 7-8M11 14l-1 6 5-4'))
add('email','Почта',P,p('M5 5h14q3 0 3 3v10q0 2-3 2H5q-3 0-3-2V8q0-3 3-3Z')+accent('m3 7 9 7 9-7'))
add('phone','Телефон',P,p('M7 3 3 5q-1 13 14 16l4-4-5-4-3 3q-4-2-5-5l3-3Z'))
add('video','Видеозанятие',P,p('M4 5h10q2 0 2 2v10q0 2-2 2H4q-2 0-2-2V7q0-2 2-2Z')+accent('m16 9 6-4v14l-6-4Z',True))
add('bell','Уведомления',P,p('M5 10q0-7 7-7t7 7v6l2 2H3l2-2Z')+accent('M9 21q3 2 6 0'))
add('list','Заявки',P,p('M8 5h12M8 12h12M8 19h12')+accent('m3 5 .5.5L5 3.5m-2 8.5.5.5L5 10.5m-2 8.5.5.5L5 17.5'))
add('settings','Настройки',P,p('m9 3-.5 3-2 1.2L3.7 6 1.5 10l2.5 2v2L1.5 16l2.2 4 2.8-1.2 2 1.2.5 3h5l.5-3 2-1.2 2.8 1.2 2.2-4-2.5-2v-2l2.5-2-2.2-4-2.8 1.2-2-1.2L14 3Z',transform='translate(1 0) scale(.92)')+circle(12,12,3,True))
add('flag','Пожаловаться',P,p('M5 22V3m0 1q4-3 8 0t7 0v9q-3 3-7 0t-8 0'))
add('inbox','Входящие',P,p('m5 5-3 10v5h20v-5L19 5ZM2 15h5l2 3h6l2-3h5')+accent('M8 9h8'))
add('card','Карта',F,p('M5 4h14q3 0 3 3v10q0 3-3 3H5q-3 0-3-3V7q0-3 3-3ZM2 9h20')+accent('M6 15h4M14 15h4'))
add('wallet','Кошелёк',F,p('M4 6h15q2 0 2 2v11q0 2-2 2H5q-3 0-3-3V6q0-3 3-3h13v3')+accent('M16 10h6v7h-6q-3-3.5 0-7Z',True)+circle(17,13.5,.5))
add('shield','Проверено',F,p('M12 2 21 6v6q0 6-9 10-9-4-9-10V6Z')+accent('m7.5 11.5 3 3 6-6'))
add('lock','Безопасность',F,p('M7 10V7a5 5 0 0 1 10 0v3M5 10h14q2 0 2 2v7q0 2-2 2H5q-2 0-2-2v-7q0-2 2-2Z')+accent('M12 14v3'))
add('circle-check','Подтверждено',F,circle(12,12,9)+accent('m7 12 3.5 3.5L17 8.5'))
add('info','Информация',F,circle(12,12,9)+p('M12 11v6')+circle(12,7,.65,True))
add('help','Помощь',F,circle(12,12,9)+p('M9 8q0-3 3-3t3 3q0 2-3 3v2')+circle(12,17,.65,True))
add('alert','Внимание',F,p('M10 3q2-2 4 0l8 16q1 3-2 3H4q-3 0-2-3Z')+accent('M12 8v6')+circle(12,18,.65))
add('pause','Приостановить',F,p('M7 4v16M17 4v16',stroke_width='3'))
add('bold','Полужирный',E,p('M6 3h7a4.5 4.5 0 0 1 0 9H6Zm0 9h8a4.5 4.5 0 0 1 0 9H6Z'))
add('italic','Курсив',E,p('M10 3h9M5 21h9M15 3 9 21'))
add('strikethrough','Зачёркнутый',E,p('M17 5q-2-3-5-2-5 1-4 5 .5 2 4 3M8 18q2 4 6 3 4-1 3-5M3 12h18'))
add('quote','Цитата',E,p('M4 5h6v7H4q0 5 4 7M14 5h6v7h-6q0 5 4 7'))
add('table','Таблица',E,p('M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18'))
add('image-plus','Добавить изображение',E,p('M20 12v8H3V4h10M3 16l5-5 5 5 3-3 4 4')+accent('M19 2v7M15.5 5.5h7')+circle(8,8,1))
add('list-ordered','Нумерация',E,p('M9 5h12M9 12h12M9 19h12M3 3h1v5M2.5 11q3-2 3 1 0 1-3 2.5h3M2.5 18q3-1 3 1-1 .5-2 .5 3-.5 2 2-1.5 1-3 0'))

from cartoon import drawings, extras
assert drawings.keys() == icons.keys(), 'Every existing icon must have an intentional drawing'
for name, body in drawings.items():
    icons[name]['body'] = body
for name, (label, body) in extras.items():
    add(name,label,L,body)

aliases={'arrow':'right','left':'back','cross':'x','edit':'pen','chat-bubble':'chat','msg':'chat','dot-check':'circle-check'}
# Editor names map to the same drawings; no duplicate visual styles.
aliases.update({'Bold':'bold','Italic':'italic','Strikethrough':'strikethrough','Quote':'quote','Table2':'table','ImagePlus':'image-plus','ListOrdered':'list-ordered','Link2':'link','List':'list','Minus':'minus','Trash2':'trash'})
attrs='fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
dest=ROOT/'svg';dest.mkdir(exist_ok=True)
for name, item in icons.items():
    standalone=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {attrs}>{item["body"]}</svg>'
    for token,color in [('var(--icon-fill,#f26a2e)','#f26a2e'),('var(--icon-accent,#f26a2e)','#f26a2e'),('var(--icon-paper,#ffffff)','#ffffff'),('var(--icon-tint,#fff0df)','#fff0df'),('currentColor','#202020')]:
        standalone=standalone.replace(token,color)
    (dest/(name+'.svg')).write_text(standalone,encoding='utf-8')
symbols=''.join(f'<symbol id="ic-{name}" viewBox="0 0 24 24" {attrs}>{item["body"]}</symbol>' for name,item in icons.items())
(ROOT/'sprite.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg">'+symbols+'</svg>',encoding='utf-8')
(ROOT/'aliases.json').write_text(json.dumps(aliases,ensure_ascii=False,indent=2),encoding='utf-8')
def icon(name, size=24):
    return f'<svg width="{size}" height="{size}" aria-hidden="true"><use href="#ic-{aliases.get(name,name)}"/></svg>'
cards=''
for group in [N,L,P,F,A,E]:
    cards+=f'<section><h2>{group}</h2><div class="grid">'
    for name,item in icons.items():
        if item['group']!=group: continue
        cards+=f'<article class="tile" data-search="{item["label"].lower()} {name}"><div class="large">{icon(name,40)}</div><b>{item["label"]}</b><div class="sizes">{icon(name,16)}{icon(name,20)}{icon(name,24)}</div><a href="svg/{name}.svg" download>{name}.svg</a></article>'
    cards+='</div></section>'
page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TopRepet — SVG-иконки на согласование</title><style>
*{box-sizing:border-box}body{margin:0;background:#fff;color:#202838;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1184px;margin:auto;padding:48px 24px}h1{font-size:40px;line-height:1.12;letter-spacing:-1.2px;margin:12px 0 16px}h2{font-size:24px;letter-spacing:-.6px;margin:38px 0 18px}p{max-width:680px;color:#626a76}.eyebrow{color:#f26a2e;font-weight:700}.status{padding:8px 14px;border-radius:20px;background:#fff0e7;display:inline-block;font-size:14px}svg{display:inline-block;flex:none;color:inherit;vertical-align:middle;overflow:visible}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.tile{border:1px solid #e8ebef;border-radius:20px;padding:20px 8px 14px;text-align:center;display:grid;gap:12px;justify-items:center;min-width:0}.tile b{font-size:14px;line-height:1.2;min-height:34px;display:flex;align-items:center}.large{height:48px;display:grid;place-items:center}.sizes{display:flex;gap:14px;align-items:center;height:28px}a{color:#626a76;font-size:12px;text-decoration:none}a:hover{text-decoration:underline}input{font:inherit;border:1px solid #dce1e7;padding:14px 18px;border-radius:24px;width:min(100%,420px);margin-top:24px}.examples{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:26px}.example{border:1px solid #e8ebef;border-radius:24px;padding:24px}.example h3{margin:0 0 20px;font-size:18px}.round{height:48px;width:48px;border:1px solid #dfe3e9;border-radius:50%;background:white;color:#202838;display:grid;place-items:center}.row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.orange{background:#f26a2e;color:white;border:0;--icon-accent:currentColor;--icon-tint:transparent}.mono{--icon-accent:currentColor;--icon-tint:transparent}.tabbar{display:flex;justify-content:space-around;align-items:center;padding:8px;background:#f6f7f9;border-radius:32px}.tab{display:grid;place-items:center;width:62px;height:44px;border-radius:24px}.selected{background:#fff;--icon-accent:#f26a2e;color:#f26a2e}.profile-row{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid #edf0f3}.profile-row:last-child{border:0}.profile-row span{flex:1}footer{color:#626a76;font-size:14px;margin-top:36px}.tile[hidden]{display:none}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid #f26a2e;outline-offset:3px}@media(max-width:900px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:560px){main{padding:24px 16px}h1{font-size:32px}.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tile{padding:16px 4px}.sizes{gap:8px}.tile b{font-size:12px}.examples{grid-template-columns:1fr}.example{padding:18px}}
</style><body>SPRITE<main><span class="eyebrow">toprepet</span><h1>Новые иконки.<br>Сначала — согласование.</h1><span class="status">Предложение · текущий сайт не изменён</span><p>Чёткий мягкий контур, спокойные пропорции и один оранжевый акцент. Без рамок, случайных штрихов, теней и декоративного шума. Все элементы нарисованы в SVG.</p><div class="examples"><div class="example"><h3>Нижнее меню · 24 px</h3><div class="tabbar">TABS</div><h3 style="margin-top:26px">Круглые кнопки · 48 px</h3><div class="row">BUTTONS</div></div><div class="example"><h3>Профиль · 24 px</h3>PROFILE</div></div><label><input id="search" placeholder="Найти иконку…" aria-label="Найти иконку"></label><div class="row" style="margin-top:16px"><label><input type="checkbox" id="mono" style="width:auto;margin:0"> Только контур</label></div>CARDS<footer>COUNT оригинальных рисунков · сетка 24 × 24 · штрих 1,8 · размеры 16 / 20 / 24 / 40 px. Внедрение на сайт — после согласования.</footer></main><script>document.querySelector('#search').addEventListener('input',e=>{let q=e.target.value.toLowerCase();document.querySelectorAll('.tile').forEach(t=>t.hidden=!t.dataset.search.includes(q))});document.querySelector('#mono').addEventListener('change',e=>document.querySelector('main').classList.toggle('mono',e.target.checked));</script></body></html>'''
tabs=''.join('<span class="tab '+('selected' if i==0 else '')+'">'+icon(n)+'</span>' for i,n in enumerate(['search','book','chat','user']))
buttons=''.join('<button class="round '+('orange' if n=='send' else 'mono')+'" aria-label="'+icons[n]['label']+'">'+icon(n)+'</button>' for n in ['back','share','pen','send'])
profile=''.join('<div class="profile-row">'+icon(n)+'<span>'+label+'</span><span style="flex:none" class="mono">'+icon('right',18)+'</span></div>' for n,label in [('list','Мои заявки'),('book','Мои репетиторы'),('bell','Уведомления'),('wallet','Платежи')])
page=page.replace('SPRITE','<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">'+symbols+'</svg>').replace('TABS',tabs).replace('BUTTONS',buttons).replace('PROFILE',profile).replace('CARDS',cards).replace('COUNT',str(len(icons)))
page=page.replace('Новые иконки.<br>Сначала — согласование.','Маленькие рисунки.<br>Один характер с иллюстрациями.')
page=page.replace('Чёткий мягкий контур, спокойные пропорции и один оранжевый акцент. Без рамок, случайных штрихов, теней и декоративного шума. Все элементы нарисованы в SVG.','Новый мультяшный вариант: объёмные силуэты, чёрная обводка, оранжевая заливка и белые детали. Книга — с пухлыми страницами, календарь — с кольцами, диплом — с лентой. Всё нарисовано в SVG, без фоновых рамок и теней.')
page=page.replace('.mono{--icon-accent:currentColor;--icon-tint:transparent}', '.mono{--icon-accent:currentColor;--icon-fill:transparent;--icon-tint:transparent;--icon-paper:transparent}')
page=page.replace('.orange{background:#f26a2e;color:white;border:0;--icon-accent:currentColor;--icon-tint:transparent}', '.orange{background:#f26a2e;color:white;border:0;--icon-accent:currentColor;--icon-fill:transparent;--icon-tint:transparent;--icon-paper:transparent}')
page=page.replace('--icon-accent:#f26a2e;color:#f26a2e','--icon-accent:#f26a2e;color:#202838')
page=page.replace('штрих 1,8','штрих 1,7')
page=page.replace('document.querySelectorAll(\'.tile\').forEach(t=>t.hidden=!t.dataset.search.includes(q))','document.querySelectorAll(\'.tile\').forEach(t=>t.hidden=!t.dataset.search.includes(q));document.querySelectorAll(\'section\').forEach(s=>s.hidden=![...s.querySelectorAll(\'.tile\')].some(t=>!t.hidden))')
featured=['book','cal','school','gift','trophy','diploma','chat','search','wallet','math','languages','flask']
feature_html='<div class="feature-grid">'+''.join('<div>'+icon(n,64)+'<span>'+icons[n]['label']+'</span></div>' for n in featured)+'</div>'
page=page.replace('<div class="examples">',feature_html+'<div class="examples">')
page=page.replace('</style>', '.feature-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:32px 16px;padding:28px 0 12px}.feature-grid>div{display:grid;justify-items:center;gap:12px}.feature-grid span{font-size:13px;text-align:center}.tile[hidden],section[hidden]{display:none}@media(max-width:560px){.feature-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 8px}.feature-grid svg{width:52px;height:52px}} </style>')
page=page.replace('svg{display:inline-block;','svg{color:#202020;display:inline-block;').replace('color:inherit;vertical-align:middle;','vertical-align:middle;')
page=page.replace('</style>','.orange svg{color:#ffffff}</style>')
(ROOT/'index.html').write_text(page,encoding='utf-8')
ordered=[(name,item) for group in [N,L,P,F,A,E] for name,item in icons.items() if item['group']==group]
sheet=f'<svg xmlns="http://www.w3.org/2000/svg" width="1184" height="1260" viewBox="0 0 1184 1260" color="#202838"><defs>{symbols}</defs><rect width="1184" height="1260" fill="white"/><g font-family="Arial,sans-serif" fill="#202838"><text x="48" y="50" font-size="17" fill="#f26a2e" font-weight="700">toprepet</text><text x="48" y="98" font-size="32" font-weight="700">SVG-иконки · предложение на согласование</text><text x="48" y="132" font-size="16" fill="#626a76">Единый контур 1,8 · оранжевые детали · без рамок вокруг самих иконок</text>'
for i,(name,item) in enumerate(ordered):
    x=48+(i%9)*121; y=166+(i//9)*131
    sheet+=f'<rect x="{x}" y="{y}" width="109" height="118" rx="14" fill="white" stroke="#e8ebef"/><svg x="{x+34}" y="{y+15}" width="40" height="40"><use href="#ic-{name}"/></svg>'
    words=item['label'].split(); lines=['']
    for word in words:
        if len(lines[-1])+len(word)>15: lines.append(word)
        else: lines[-1]+=(' ' if lines[-1] else '')+word
    for j,line in enumerate(lines[:2]): sheet+=f'<text x="{x+54.5}" y="{y+76+j*15}" text-anchor="middle" font-size="11.5">{html.escape(line)}</text>'
sheet=sheet.replace('height="1260"','height="1390"').replace('0 0 1184 1260','0 0 1184 1390').replace('color="#202838"','color="#202020"').replace('Единый контур 1,8 · оранжевые детали · без рамок вокруг самих иконок','Мультяшный вариант · оранжевая заливка · чёрная обводка · без фоновых рамок')
sheet+='<text x="48" y="1370" font-size="13" fill="#626a76">Сайт пока не изменён. Примеры кнопок и меню — в интерактивном просмотре.</text></g></svg>'
(ROOT/'overview.svg').write_text(sheet,encoding='utf-8')

poster=f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="800" viewBox="0 0 1080 800" color="#202020"><defs>{symbols}</defs><rect width="1080" height="800" fill="white"/><g font-family="Arial,sans-serif" fill="#202838"><text x="48" y="56" font-size="20" fill="#f26a2e" font-weight="700">toprepet</text><text x="48" y="108" font-size="36" font-weight="700">Иконки как маленькие иллюстрации</text><text x="48" y="143" font-size="17" fill="#626a76">Мультяшные формы, оранжевая заливка и чёрный контур. Вариант на согласование.</text>'
for i,name in enumerate(featured):
    x=48+(i%4)*252; y=190+(i//4)*182
    poster+=f'<svg x="{x+76}" y="{y}" width="96" height="96"><use href="#ic-{name}"/></svg><text x="{x+124}" y="{y+126}" text-anchor="middle" font-size="16">{html.escape(icons[name]["label"])}</text>'
poster+='<text x="48" y="776" font-size="14" fill="#626a76">77 SVG-иконок · стрелки и служебные знаки сохранены простыми · сайт пока не изменён</text></g></svg>'
(ROOT/'direction.svg').write_text(poster,encoding='utf-8')
print(f'{len(icons)} drawings, {len(aliases)} aliases')
