"""Original small illustrations for TopRepet. Geometry is native SVG, not raster."""
INK = 'currentColor'
ORANGE = 'var(--icon-fill,#f26a2e)'
PAPER = 'var(--icon-paper,#ffffff)'
CREAM = 'var(--icon-tint,#fff0df)'

def path(d, fill='none', **attrs):
    return '<path d="'+d+'" fill="'+fill+'" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'

def circle(x,y,r,fill='none', **attrs):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" '+ ' '.join(f'{k.replace("_","-")}="{v}"' for k,v in attrs.items())+'/>'

def line(d): return path(d)
def orange(d): return path(d,ORANGE)
def white(d): return path(d,PAPER)
def cream(d): return path(d,CREAM)
def shine(d): return path(d,stroke='var(--icon-paper,#ffffff)',stroke_width='1.2')

drawings={
    'back':line('M15.5 4.8 8 12l7.5 7.2'),
    'right':line('M8.5 4.8 16 12l-7.5 7.2'),
    'down':line('m5 8.5 7 7 7-7'),
    'arrow-up':line('m5 15.5 7-7 7 7'),
    'menu':line('M4.5 6h15M4.5 12h15M4.5 18h15'),
    'x':line('m6 6 12 12M18 6 6 18'),
    'more':circle(4.5,12,.7,INK)+circle(12,12,.7,INK)+circle(19.5,12,.7,INK),
    'home':orange('M4.5 10.5 12 5l7.5 5.5v9.2q0 1.8-1.8 1.8H6.3q-1.8 0-1.8-1.8Z')+white('M9.5 21.5v-7h5v7')+line('m2.3 11.8 8.2-8q1.5-1.4 3 0l8.2 8')+shine('M7.5 11.5v4'),
    'search':orange('m14 16 2-2 6 5q1.5 1.5 0 3t-3 0Z')+circle(9.8,9.8,7,CREAM)+line('M5.7 9.5q.4-3.8 4-4'),
    'filter':line('M3 6h18M3 12h18M3 18h18')+orange('M6 3.5q2-1 4 0v5q-2 1-4 0Z')+white('M14 9.5q2-1 4 0v5q-2 1-4 0Z')+orange('M7 15.5q2-1 4 0v5q-2 1-4 0Z'),
    'sort':line('M7 3.5v17m-4-4 4 4 4-4M17 20.5v-17m-4 4 4-4 4 4'),
    'plus':line('M12 4v16M4 12h16'),
    'minus':line('M4 12h16'),
    'check':line('m4.5 12 5 5 10-11'),
    'checks':line('m2.5 5 1.3 1.3L6.5 3.5M10 5h11m-18.5 7 1.3 1.3 2.7-2.8M10 12h11m-18.5 7 1.3 1.3 2.7-2.8M10 19h11'),
    'tick':line('m5 12 4.5 4.5L19 6.5'),
    'ticks':line('m2 12 4.5 4.5L16 6.5M12 15l1.5 1.5L23 6.5'),
    'pen':orange('m5 14 10-10q1.5-1.5 3 0l2 2q1.5 1.5 0 3L10 19Z')+cream('m5 14-2 7 7-2Z')+line('m3 21 1-3M13 6l5 5')+white('m15 4 1-1q1.5-1.5 3 0l2 2q1.5 1.5 0 3l-1 1Z')+shine('m8 13 5-5'),
    'trash':orange('m5.5 7 1 12q.2 2.5 3 2.5h5q2.8 0 3-2.5l1-12Z')+white('M3.5 7h17V4.5h-17Z')+line('M9 4.5V2.8h6v1.7M10 11l.4 6M14 11l-.4 6'),
    'repeat':line('M20 9a8.2 8.2 0 0 0-14-3L3 9m0-5v5h5M4 15a8.2 8.2 0 0 0 14 3l3-3m0 5v-5h-5'),
    'upload':cream('M3.5 14v5q0 2 2.5 2h12q2.5 0 2.5-2v-5')+line('M12 15V3m-4 4 4-4 4 4'),
    'share':white('M7 9H5q-2 0-2 2v9q0 1.5 2 1.5h14q2 0 2-1.5v-9q0-2-2-2h-2')+line('M12 15V2.5M8 6.5l4-4 4 4'),
    'copy':orange('M3 3.5q0-1 1-1h11v15H3Z')+white('M8 7.5q6-1 13 0v14H10q-2 0-2-2Z')+line('M12 12h5M12 16h4'),
    'link':cream('m9 15-2 2q-2 2-4 0t0-4l4-4q2-2 4 0')+orange('m15 9 2-2q2-2 4 0t0 4l-4 4q-2 2-4 0')+line('m8.5 15.5 7-7'),
    'attach':line('m8 13 6-6q2-2 4 0t0 4l-7.5 7.5q-3 3-6 0t0-6l8-8q4-4 8 0t0 8l-8.5 8.5'),
    'eye':white('M2 12q4-7 10-7t10 7q-4 7-10 7T2 12Z')+circle(12,12,4,ORANGE)+circle(12,12,1,INK)+circle(13.3,10.7,.6,PAPER,stroke='none'),
    'eye-off':white('M2 12q4-7 10-7t10 7q-4 7-10 7T2 12Z')+circle(12,12,4,ORANGE)+line('m3 3 18 18'),
    'book':orange('M2 6q5-1 10 1 5-2 10-1v14q-6-1.5-10 1-4-2.5-10-1Z')+white('M3 3.5q5-1 9 2 4-3 9-2v14q-5-1.5-9 1.5-4-3-9-1.5Z')+line('M12 5.5V19M6 7q1.5 0 3 1M6 10q1.5 0 3 1')+orange('M15 4.5v7l2-1 2 1V3.5'),
    'cal':white('M4.5 4q7-1 15 0 2 .3 2 3V19q0 2.5-2.5 2.5H5q-2.5 0-2.5-2.5V7q0-2.5 2-3Z')+orange('M4.5 4q7-1 15 0 2 .3 2 3v2.5h-19V7q0-2.5 2-3Z')+line('M7.5 2v4.5M16.5 2v4.5m-9 10 3 3 6-6')+circle(7,12.8,.55,INK,stroke='none')+circle(12,12.8,.55,INK,stroke='none'),
    'clock':orange('m6 19-2 3M18 19l2 3')+circle(12,12,9,ORANGE)+circle(12,12,6.5,PAPER)+line('M12 7.5v5l3.5 2')+white('M3 4Q5 0 8 2M16 2q3-2 5 2'),
    'school':white('M6 10v7.5q6 5 12 0V10Z')+orange('M2 7.5 12 2l10 5.5L12 13Z')+line('m12 7.5 8 2v6')+orange('M20 15q-1.6 2.5-1 5h2q.6-2.5-1-5Z'),
    'doc':white('M5 2.5q6-1 13 0v17H7q-3 0-3-3V5q0-1.8 1-2.5Z')+line('M8 7h6M8 10h4')+orange('m15 16-2 6 3-1 2.5 1-.5-6Z')+circle(16,15,3,ORANGE)+circle(16,15,.8,PAPER,stroke='none'),
    'star':orange('m12 2.8 3.1 5.6 6.2 1q1 .2.2 1.1l-4.2 4.2.8 6q.2 1.2-1 .6L12 18.5l-5.1 2.8q-1 .6-1-.7l1-5.9-4.3-4.2q-.8-.9.4-1.1l6-1Z')+shine('m9.5 8.5 2-3'),
    'star-on':orange('m12 2.8 3.1 5.6 6.2 1q1 .2.2 1.1l-4.2 4.2.8 6q.2 1.2-1 .6L12 18.5l-5.1 2.8q-1 .6-1-.7l1-5.9-4.3-4.2q-.8-.9.4-1.1l6-1Z')+shine('m9.5 8.5 2-3'),
    'globe':circle(11,10,8,CREAM)+orange('M5 4.5 9 4l1 3-2 2-3-1-2 2M16 5l-2 4 2 2 2-1M9 13l4-1 2 3-2 3')+line('M20 6q3 9-7 15M11 18v3M7 22h10'),
    'target':orange('M4 20 6 17M18 20l-2-3')+circle(11,12,8.5,ORANGE)+circle(11,12,5.3,PAPER)+circle(11,12,1.8,ORANGE)+line('m11 12 9-9')+orange('m16 5 1-3h4v4l-3 1'),
    'gift':orange('M4 10h16v11H4Z')+white('M2.5 7.5h19v5h-19Z')+white('M10 7.5h4V21h-4Z')+orange('M12 7.5Q4 8 5 3.5q1-4 4-.5ZM12 7.5Q20 8 19 3.5q-1-4-4-.5Z')+shine('M6.5 15.5v3'),
    'shapes':orange('m6 2.5 4.5 8h-9Z')+circle(17,7,4.2,PAPER)+cream('M2.5 14h8v8h-8Z')+orange('m17 13 5 4.5-5 4.5-5-4.5Z'),
    'route':line('M6 19h9q5 0 5-4t-5-4H8q-4 0-4-3t4-3h7')+circle(5,19,2.8,ORANGE)+orange('M16 2q6-.5 6 3.5 0 3.5-4.2 6.5-4.3-3-4.3-6.5 0-2.8 2.5-3.5Z')+circle(17.8,5.5,1,PAPER,stroke='none'),
    'chart':line('M3 2v20h19')+cream('M6 15h4v7H6Z')+orange('M12 10h4v12h-4Z')+white('M18 5h4v17h-4Z')+line('m6 9 5-5 3 2 5-4'),
    'user':orange('M3.5 21q-.7-8 8.5-8t8.5 8Z')+circle(12,7,4.5,CREAM)+line('M8.5 5.5q1.5.5 3-1 2 2 5 1'),
    'person-plus':orange('M2 21q0-7 7-7 4.5 0 6 3')+circle(9,7,4,CREAM)+line('M6 5.5q2 1 5-1M19 13v8M15 17h8'),
    'chat':orange('M17 5q5 0 5 5v5q0 4-4 4h-2l-1 3-5-3H9')+white('M6 2.5h9q5 0 5 4v5.5q0 4-5 4H9l-5 4v-4q-2.5-.5-2.5-4V7q0-4.5 4.5-4.5Z')+circle(6.5,9.5,.7,INK)+circle(11,9.5,.7,INK)+circle(15.5,9.5,.7,INK),
    'chat-round':orange('M21 12q0 8-9 8l-8 2 1-6Q0 9 5 5q3-3 8-2 8 0 8 9Z')+white('M7 10h10M7 14h6'),
    'send':orange('M2.5 4.5 22 2 15.5 22l-5-8Z')+white('m10.5 14 7-7-4 10-4 3Z')+line('m10.5 14 7-7'),
    'email':white('M2.5 6q0-2 2-2h15q2 0 2 2v13q0 2-2 2h-15q-2 0-2-2Z')+orange('M2.5 6q0-2 2-2h15q2 0 2 2l-9.5 8Z')+line('m3 19 5.5-6M21 19l-5.5-6'),
    'phone':orange('M6 2.5 2.5 5q.5 13 15.5 17l4-4-5-4-3 2q-4-2-6-5l2-3Z')+shine('M5 6q.2 2.5 1.5 4'),
    'video':orange('M16 9q3-3 6-4v14q-3-1-6-4Z')+white('M5 4q6-1 11 0 2 .5 2 3v10q0 2-2 3H5q-3 0-3-3V7q0-2.5 3-3Z')+circle(9.5,12,3,ORANGE),
    'bell':orange('M5 10q-.2-7 7-7 6.5 0 6.5 7v5l2 3q-8.5 2-17 0l2-3Z')+circle(12,20,2,PAPER)+line('M10 2h4')+shine('M8 8q0-2 2-2'),
    'list':white('M5 3.5h14q2 0 2 2v16H3V5.5q0-2 2-2Z')+orange('M8 2h8v4H8Z')+line('M11 11h6M11 17h6m-5 0h5')+path('m6 11 1 1 1.5-2M6 17l1 1 1.5-2',stroke='var(--icon-accent,#f26a2e)'),
    'settings':orange('m9 2.5-.7 3-1.6.9-2.9-.9L1.5 10l2.4 2v1.8L1.5 16l2.3 4 2.9-.9 1.6.9.7 2.5h6l.7-2.5 1.6-.9 2.9.9 2.3-4-2.4-2.2V12l2.4-2-2.3-4.5-2.9.9-1.6-.9-.7-3Z')+circle(12,12.5,4,PAPER)+circle(12,12.5,1.3,ORANGE,stroke='none'),
    'flag':line('M5 22V3')+orange('M5 3q4-2 8 0t8 0v10q-4 2-8 0t-8 0Z'),
    'inbox':cream('m5 5-3 10v6h20v-6L19 5Z')+orange('M2 15h5l2 3h6l2-3h5v6H2Z')+white('M7 2.5h10V14H7Z')+line('M10 6h4M10 9h3'),
    'card':orange('M4 3.5h16q2 0 2 2v14q0 2-2 2H4q-2 0-2-2v-14q0-2 2-2Z')+white('M2 8h20v5H2Z')+line('M6 17h5')+shine('M17 17h1.5'),
    'wallet':orange('M3 6q-.5-3 3-3h13v4')+cream('M3 6.5q7-1 16 0 2 0 2 2v11q0 2-2 2H5q-3 0-3-3V8q0-1.5 1-1.5Z')+orange('M16 10h6v7h-6q-4-3.5 0-7Z')+circle(17,13.5,.7,PAPER,stroke='none'),
    'shield':orange('M12 2q4 3 9 3v7q0 6-9 10-9-4-9-10V5q5 0 9-3Z')+white('M12 5.5q2.5 1.8 6 2v5q0 3.5-6 6.5-6-3-6-6.5v-5q3.5-.2 6-2Z')+line('m8.5 11.5 2.5 2.5 4.5-5'),
    'lock':orange('M7 10V7q0-5 5-5t5 5v3h-3V7q0-2-2-2t-2 2v3Z')+cream('M4.5 9q7.5-1.2 15 0V19q0 2.5-2.5 2.5H7q-2.5 0-2.5-2.5Z')+circle(12,14,1.5,INK)+line('M12 15.5v2'),
    'circle-check':circle(12,12,9.5,ORANGE)+white('m7 12 3.2 3.5L17 8.5'),
    'info':circle(12,12,9.5,CREAM)+line('M10 11h2v6h2')+circle(12,7,.7,INK),
    'help':circle(12,12,9.5,ORANGE)+line('M8.5 8q.2-3.5 4-3 3 .5 3 3 0 2-3.5 3.5v2')+circle(12,17,.7,INK),
    'alert':orange('M10 3q2-2.5 4 0l8 15.5q1.5 3-2 3H4q-3.5 0-2-3Z')+line('M12 7.5v6')+circle(12,17.5,.7,INK),
    'pause':orange('M5 3h4v18H5Z')+orange('M15 3h4v18h-4Z'),
    'bold':line('M6 3h7a4.5 4.5 0 0 1 0 9H6Zm0 9h8a4.5 4.5 0 0 1 0 9H6Z'),
    'italic':line('M10 3h9M5 21h9M15 3 9 21'),
    'strikethrough':line('M17 5q-2-3-5-2-5 1-4 5 .5 2 4 3M8 18q2 4 6 3 4-1 3-5M3 12h18'),
    'quote':orange('M3 5h7v7H3q0 6 5 8M14 5h7v7h-7q0 6 5 8'),
    'table':white('M3 3h18v18H3Z')+orange('M3 3h18v6H3Z')+line('M3 15h18M9 3v18M15 3v18'),
    'image-plus':white('M20 12v8H3V4h10')+orange('m3 16 5-5 5 5 3-3 4 4v3H3Z')+line('M19 2v7M15.5 5.5h7')+circle(8,8,1,ORANGE),
    'list-ordered':line('M9 5h12M9 12h12M9 19h12M3 3h1v5M2.5 11q3-2 3 1 0 1-3 2.5h3M2.5 18q3-1 3 1-1 .5-2 .5 3-.5 2 2-1.5 1-3 0'),
}

# Larger semantic icons for education and achievements use the same construction.
extras={
    'trophy':('Победы и награды', orange('M6 3h12v7q0 7-6 7t-6-7Z')+line('M6 5H2q0 8 6 7M18 5h4q0 8-6 7M12 17v4M7 22h10')+shine('M9 6v3')),
    'medal':('Медаль', orange('m7 2 5 8 5-8h5l-6 12H8L2 2Z')+circle(12,15.5,6.5,CREAM)+orange('m12 11 1.3 2.8 3 .4-2.2 2.2.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.2 3-.4Z')),
    'diploma':('Диплом', white('M4 3h13q-2.5 1-2 5l2 9H5L3 7Q1 2 5 3Z')+orange('M17 3q5 0 4 4h-6q-.5-4 2-4Z')+line('M6 8h5M7 11h4')+orange('m15 15-3 7 3-1 2 1 2-7Z')+circle(16,15,3,ORANGE)),
    'math':('Математика', orange('M4 2.5q8-1 16 0v19H4Z')+white('M7 5h10v5H7Z')+line('M7 14h3M8.5 12.5v3M14 14h3M7 18h3m4 0h3')),
    'languages':('Иностранные языки', orange('M11 10h11v10h-4l-4 3v-3h-3Z')+white('M2 2.5h15v12H8l-4 3v-3H2Z')+line('m5 11 3-6 3 6M6 9h4M17 14h3M17 17h2')),
    'flask':('Химия', white('M8 2h8M9 2v7L3 18q-2 3 2 4h14q4-1 2-4l-6-9V2')+orange('m5.5 14.5-3 4.5q-.5 3 2.5 3h14q3 0 2.5-3l-3-4.5q-6 3-13 0Z')+circle(10,17.5,.6,PAPER,stroke='none')+circle(14.5,19.5,.8,PAPER,stroke='none')),
    'biology':('Биология', orange('M5 4Q13 0 21 3q1 13-11 15-8 0-5-14Z')+line('M3 22 17 7M8 16l-.5-5M12 12l5 .5')),
    'computer':('Информатика', white('M4 3h16v14H4Z')+orange('M2 17h20l-1.5 4h-17Z')+line('m9 7-2 3 2 3m6-6 2 3-2 3')),
}
