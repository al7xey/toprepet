# Нижнее меню «жидкое стекло»: универсальное руководство

Руководство по созданию нижней панели навигации в стиле liquid glass (стеклянная панель, по которой плавно переезжает полупрозрачная «капля»-пилюля выбранного пункта). Первые разделы не привязаны к проекту: рецепт, правила, готовая заготовка на чистом HTML/CSS/JS. В конце приложение с рабочим кодом меню из проекта TopRepet (React + React Router) и его итоговыми стилями.

Цвета подставляйте свои. Везде, где цвет важен для эффекта, он вынесен в переменные.

---

## 1. Из чего состоит эффект

Меню собирается из пяти слоёв. Если любой из них убрать, «стекло» разваливается.

| Слой | Что это | Зачем |
|---|---|---|
| 1. Панель | Скруглённая «таблетка» с полупрозрачной заливкой (и при желании размытием фона) | Основа: читается на любом фоне и сразу выглядит как стекло |
| 2. Пилюля | Более светлая полупрозрачная таблетка под выбранным пунктом | Показывает выбор, ради неё и затеян эффект |
| 3. Блик | Светлая внутренняя линия сверху и тонкий светлый контур | Создаёт ощущение толщины стекла |
| 4. Значки | Тёмные, одной толщины, поверх пилюли | Всегда читаются, выбранный чуть жирнее |
| 5. Движение | Пилюля растягивается в пути как капля и увеличивается под пальцем | Даёт «жидкость» |

Главная мысль: **стекло это не размытие, а свет**. Размытие фона вторично. Дорогим меню выглядит из-за мягкой тени, внутреннего блика, правильных радиусов и плавного движения.

---

## 2. Рецепт панели

### 2.1 Геометрия
- Парящая панель, не прижатая к краям: отступ от низа 4–12 px плюс безопасная зона телефона (`env(safe-area-inset-bottom)`).
- Ширина 300–340 px по центру, не на весь экран. На экранах уже 340 px: `calc(100% − 32px)`.
- Высота 58–64 px, внутренний отступ 5 px, радиус `999px`.
- 3–5 пунктов. Больше пяти не помещается; четыре лучший вариант.
- Колонки сетки одинаковой ширины (`repeat(n, 1fr)`), зазор 2 px.
- Панель `position: fixed`, `z-index` выше контента. Контенту снизу добавьте отступ `padding-bottom` не меньше высоты панели + 40 px, чтобы последняя строка не пряталась.

### 2.2 Заливка панели: два варианта
**Матовая плашка (как в проекте).** Тёмная полупрозрачная заливка, без размытия. Надёжна, одинаково выглядит везде, не нагружает слабые телефоны.
```css
background: rgb(32 40 56 / 11%);
```
**Настоящее стекло.** Светлая заливка плюс размытие и насыщение фона. Красивее над фотографиями, но зависит от того, что под панелью.
```css
background: rgb(255 255 255 / 38%);
-webkit-backdrop-filter: blur(18px) saturate(1.6);
backdrop-filter: blur(18px) saturate(1.6);
box-shadow:
  inset 0 1px 0 rgb(255 255 255 / 80%),      /* верхний блик */
  inset 0 0 0 1px rgb(255 255 255 / 35%),    /* контур стекла */
  0 8px 24px rgb(0 0 0 / 12%);               /* мягкая тень под панелью */
```
Правило выбора: на белом сплошном фоне размытие ничего не даёт, берите матовую плашку. Над фотографиями, лентой и картой берите настоящее стекло.

### 2.3 Важные детали
- `overflow: hidden` на панели обязателен: растянутая пилюля не должна выходить за скругление.
- Префикс `-webkit-backdrop-filter` нужен для Safari и iOS.
- `backdrop-filter` не работает внутри родителя с `overflow` или `transform`, который сам создаёт слой; панель делайте прямым потомком `body` или корневого контейнера.
- Не ставьте тяжёлую тень (более 30 px размытия): на слабых телефонах появятся тормоза.

---

## 3. Рецепт пилюли

```css
.pill {
  position: absolute; top: 5px; bottom: 5px; left: 5px;   /* left и width задаёт скрипт */
  border-radius: 999px;
  background: linear-gradient(rgb(255 255 255 / 58%), rgb(255 255 255 / 36%));  /* светлее панели, сверху плотнее */
  box-shadow:
    0 2px 8px rgb(32 40 56 / 10%),                 /* лёгкая тень: пилюля приподнята */
    inset 0 1px 0 rgb(255 255 255 / 85%),          /* блик по верхней кромке */
    inset 0 0 0 1px rgb(255 255 255 / 35%);        /* тонкий светлый контур */
  will-change: left, width;
  z-index: 0;                                      /* под значками */
}
```
- Пилюля **светлее** панели и **полупрозрачная**: сквозь неё угадывается значок и фон. Непрозрачная белая пилюля выглядит как обычная кнопка, а не стекло.
- Значки лежат выше (`z-index: 1`), пилюля их не перекрывает.
- Пилюля занимает ту же ширину, что и ячейка пункта, и симметрична слева и справа. Берите размеры из реальной вёрстки (`getBoundingClientRect`), а не из «магических» чисел.

---

## 4. Значки

- Один набор, один стиль линий (контурные, 1.8–2.2 px), размер 26–30 px.
- Цвет всегда тёмный (цвет текста), не меняйте его на цвет акцента. Выбранный пункт выделяется пилюлей и чуть более жирным или закрашенным вариантом значка.
- Значок выбранного пункта и пункта под пальцем получает «жирный» вариант (другая маска или толщина линии).
- Подписи пунктов в панели нет; название для скринридера прячем (`.sr-only`).
- Значки как CSS-маски: цвет задаётся через `background: currentColor`, это упрощает смену цвета и тем.
```css
.i { display:block; width:28px; height:28px; background: currentColor;
     -webkit-mask: var(--m) center / contain no-repeat; mask: var(--m) center / contain no-repeat; }
```

---

## 5. Непрочитанное

- Только **маленькая точка** (7 px) справа сверху от значка. Не число и не большой кружок.
- Позиция: `top: 12px; left: calc(50% + 8px)`, чтобы касалась значка, но не закрывала его.
- В скринридер добавляйте текст «есть новые».

---

## 6. Движение (то, что делает стекло «жидким»)

### 6.1 Переезд пилюли
Не анимируйте только `left`. Нужны три ключевых кадра: старт, середина и конец. В середине пилюля **растягивается от старого места до нового** (`width + расстояние × 0.9`) и сдвинута к старту, к концу снова сжимается. Это даёт эффект капли.

- Длительность: `260 мс + расстояние × 1.1`, но не более 480 мс.
- Кривая: `cubic-bezier(.32, .72, 0, 1)` (быстрый старт, мягкая остановка).
- Анимируйте через Web Animations API (`element.animate`), так проще отменить и перезапустить с текущего места.
- Растянутая пилюля никогда не выходит за панель (`overflow: hidden`).

### 6.2 Под пальцем
- При касании панель или пилюля **слегка увеличиваются** (`scale(1.03…1.1)`), как будто стекло приподнялось.
- Пока палец на панели, пилюля идёт за ним без анимации (`pointermove`), значок под пилюлей подсвечивается.
- Раздел открывается **при отпускании** на пункте, а не при касании: тогда страница не мигает, пока палец ведёт пилюлю.
- Палец не должен «сбрасываться», когда пилюля увеличивается (используйте `setPointerCapture`).

### 6.3 Без прыжков
- Запоминайте последнее положение пилюли в переменной уровня модуля. Если страница пересобирает меню при переходе, новая пилюля стартует с запомненного места и доезжает, а не появляется на новом.
- После отпускания пилюля сразу едет к выбранному пункту, а не возвращается назад в ожидании смены адреса.
- При повороте телефона пересчитайте положение (`ResizeObserver`).

### 6.4 Доступность движения
Для `prefers-reduced-motion: reduce` отключайте растяжение и увеличение: пилюля просто мгновенно встаёт на место.

---

## 7. Типичные ошибки

| Симптом | Причина | Исправление |
|---|---|---|
| Пилюля вылезает за панель | Нет `overflow: hidden` или растяжение больше доступного места | Скрыть переполнение, ограничить растяжение |
| Слева и справа от пилюли разные отступы | Размеры взяты «на глаз» | Брать `left/width` из `getBoundingClientRect` ячеек |
| Пилюля прыгает при смене страницы | Меню пересоздаётся, пилюля начинает с нуля | Хранить последнее положение вне компонента |
| Стекло выглядит «грязным серым» | Тёмная заливка слишком плотная | Заливка 8–14 % при матовой плашке, 30–40 % белого при стекле |
| Размытие не работает на iPhone | Нет `-webkit-backdrop-filter` | Добавить префикс |
| Значок не виден на пилюле | Слишком светлый значок | Значки тёмные, цвет не менять |
| Меню закрывает последний контент | Нет нижнего отступа у страницы | `padding-bottom` ≥ высота панели + 40 px |
| Пилюля дёргается при перетаскивании | Анимация и `pointermove` борются | При перетаскивании отменять анимации и ставить `left` напрямую |
| Серая вспышка при нажатии | Системная подсветка касания | `-webkit-tap-highlight-color: transparent` |
| Раздел открывается дважды | И `pointerup`, и обычный `click` | После жеста подавлять следующий `click` |

---

## 8. Готовая заготовка: чистый HTML, CSS, JS

Работает без сборки и библиотек. Сохраните в `index.html` и откройте.

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Liquid glass menu</title>
<style>
  :root {
    --ink: #202838;
    --accent: #f26a2e;              /* цвет точки непрочитанного: ваш */
    --bar: rgb(32 40 56 / 11%);     /* матовая плашка; для стекла см. раздел 2.2 */
    --move-ease: cubic-bezier(.32, .72, 0, 1);
  }
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #fff; color: var(--ink); font: 17px/1.5 system-ui, sans-serif;
         padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px)); }
  .page { padding: 24px 16px; }

  .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

  .lg-bar {
    position: fixed; left: 0; right: 0; margin: 0 auto;
    bottom: calc(4px + env(safe-area-inset-bottom, 0px));
    width: min(318px, calc(100% - 32px)); height: 62px; padding: 5px;
    display: grid; grid-template-columns: repeat(var(--n, 4), 1fr); gap: 2px;
    border-radius: 999px; overflow: hidden; z-index: 50;
    background: var(--bar);
    touch-action: pan-y; user-select: none; -webkit-user-select: none;
    transition: transform .25s var(--move-ease);
  }
  .lg-bar.press { transform: scale(1.03); }

  .lg-pill {
    position: absolute; top: 5px; bottom: 5px; left: 5px; width: 70px;
    border-radius: 999px; z-index: 0; will-change: left, width;
    background: linear-gradient(rgb(255 255 255 / 58%), rgb(255 255 255 / 36%));
    box-shadow: 0 2px 8px rgb(32 40 56 / 10%), inset 0 1px 0 rgb(255 255 255 / 85%), inset 0 0 0 1px rgb(255 255 255 / 35%);
    transition: box-shadow .25s, transform .25s var(--move-ease);
  }
  .lg-bar.press .lg-pill { transform: scale(1.08, 1.06); box-shadow: 0 8px 18px rgb(32 40 56 / 16%), inset 0 1px 0 rgb(255 255 255 / 85%), inset 0 0 0 1px rgb(255 255 255 / 35%); }

  .lg-tab { position: relative; z-index: 1; display: grid; place-items: center; min-height: 50px; border-radius: 999px; color: var(--ink); text-decoration: none; }
  .lg-tab svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
  .lg-tab.cur svg { stroke-width: 2.4; }          /* выбранный чуть жирнее */
  .lg-dot { position: absolute; top: 12px; left: calc(50% + 8px); width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }

  @media (prefers-reduced-motion: reduce) { .lg-bar, .lg-pill { transition: none; } }
</style>
</head>
<body>
<div class="page"><h1>Страница</h1><p>Прокручиваемый контент под меню.</p></div>

<nav class="lg-bar" id="bar" aria-label="Разделы" style="--n:4">
  <span class="lg-pill" id="pill" aria-hidden="true"></span>
  <a class="lg-tab cur" href="#search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span class="sr-only">Поиск</span></a>
  <a class="lg-tab" href="#lessons"><svg viewBox="0 0 24 24"><path d="M2.5 5.5C5 4 8.5 4 12 6.5c3.5-2.5 7-2.5 9.5-1v13c-2.5-1.5-6-1.5-9.5 1-3.5-2.5-7-2.5-9.5-1z"/><path d="M12 6.5v13"/></svg><span class="sr-only">Занятия</span></a>
  <a class="lg-tab" href="#chats"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4A8 8 0 1120 12z"/></svg><span class="sr-only">Чаты, есть новые</span><span class="lg-dot" aria-hidden="true"></span></a>
  <a class="lg-tab" href="#profile"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1-4 4-6 7.5-6s6.500 2 7.500 6"/></svg><span class="sr-only">Профиль</span></a>
</nav>

<script>
  const bar = document.getElementById('bar');
  const pill = document.getElementById('pill');
  const tabs = [...bar.querySelectorAll('.lg-tab')];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;          // выбранный пункт
  let gesture = null;       // { x, moved }
  let swallowClick = false; // после жеста обычный click не нужен

  // положение и ширина пункта внутри панели (берём из вёрстки: слева и справа всё симметрично)
  const cell = (i) => {
    const b = bar.getBoundingClientRect(), r = tabs[i].getBoundingClientRect();
    const scale = b.width / bar.offsetWidth || 1;           // панель может быть увеличена под пальцем
    return { left: (r.left - b.left) / scale - bar.clientLeft, width: r.width / scale };
  };
  const nearest = (clientX) => {
    let best = 0, dist = Infinity;
    tabs.forEach((t, i) => { const r = t.getBoundingClientRect(); const d = Math.abs(clientX - (r.left + r.width / 2)); if (d < dist) { dist = d; best = i; } });
    return best;
  };

  // пилюля плавно едет к пункту i; в середине пути растянута, как капля
  function glide(i) {
    const { left: dest, width: w } = cell(i);
    const live = parseFloat(getComputedStyle(pill).left);   // где пилюля прямо сейчас
    pill.getAnimations().forEach((a) => a.cancel());
    pill.style.width = w + 'px';
    pill.style.left = dest + 'px';
    if (REDUCED || Number.isNaN(live) || Math.abs(live - dest) < 1) return;
    const dist = Math.abs(dest - live);
    pill.animate(
      [{ left: live + 'px', width: w + 'px' },
       { left: Math.min(live, dest) + 'px', width: w + dist * 0.9 + 'px', offset: 0.5 },
       { left: dest + 'px', width: w + 'px' }],
      { duration: Math.round(Math.min(480, 260 + dist * 1.1)), easing: 'cubic-bezier(.32,.72,0,1)' });
  }
  function select(i) {
    current = i;
    tabs.forEach((t, k) => t.classList.toggle('cur', k === i));
    glide(i);
    // здесь откройте раздел: history.pushState, router.navigate и т. п.
  }

  // касание и перетаскивание: раздел открывается при отпускании
  bar.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture = { x: e.clientX, moved: false };
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('press');
    const i = nearest(e.clientX);
    tabs.forEach((t, k) => t.classList.toggle('cur', k === i));
    glide(i);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!gesture) return;
    if (Math.abs(e.clientX - gesture.x) > 6) gesture.moved = true;
    if (!gesture.moved) return;
    const b = bar.getBoundingClientRect(), scale = b.width / bar.offsetWidth || 1;
    const first = cell(0), w = first.width;
    const left = Math.min(Math.max((e.clientX - b.left) / scale - bar.clientLeft - w / 2, first.left), cell(tabs.length - 1).left);
    pill.getAnimations().forEach((a) => a.cancel());        // за пальцем идём без анимации
    pill.style.left = left + 'px';
    const i = nearest(e.clientX);
    tabs.forEach((t, k) => t.classList.toggle('cur', k === i));
  });
  const end = (e) => {
    if (!gesture) return;
    const i = nearest(e.clientX);
    gesture = null;
    bar.classList.remove('press');
    swallowClick = true; setTimeout(() => { swallowClick = false; }, 0);
    select(i);
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', () => { gesture = null; bar.classList.remove('press'); glide(current); });
  bar.addEventListener('click', (e) => { if (swallowClick) e.preventDefault(); }, true);
  bar.addEventListener('contextmenu', (e) => e.preventDefault());
  new ResizeObserver(() => glide(current)).observe(bar);    // поворот телефона и смена ширины
  glide(current);
</script>
</body>
</html>
```

Как адаптировать: замените значки на свои, цвета в `:root`, добавьте открытие страницы в `select()`. Для настоящего стекла замените `--bar` и добавьте `backdrop-filter` из раздела 2.2.

---

## 9. Чек-лист качества

- [ ] Панель парящая, не на весь экран, отступ от низа с учётом безопасной зоны.
- [ ] Пилюля светлее панели, полупрозрачная, с верхним бликом и тонким контуром.
- [ ] Отступы слева и справа от пилюли одинаковые.
- [ ] Значки тёмные, одного стиля; выбранный чуть жирнее.
- [ ] Пилюля при переезде растягивается и не выходит за панель.
- [ ] Под пальцем панель или пилюля чуть увеличиваются, пилюля идёт за пальцем.
- [ ] Раздел открывается при отпускании, обычный click не дублирует.
- [ ] Нет прыжка пилюли при смене страницы; положение запоминается.
- [ ] Непрочитанное малой точкой, без числа.
- [ ] Нет серой вспышки при касании; контент не прячется под панелью.
- [ ] `prefers-reduced-motion` отключает растяжение; у пунктов есть названия для скринридера.
- [ ] Проверено на iPhone Safari и Android Chrome, на узком экране 320–360 px.

---

# Приложение A. Код меню из проекта TopRepet (React + React Router)

Меню лежит в `src/new-design/layout/layouts.tsx` (компонент `TabBar`). Оно уже доведено до рабочего вида: пилюля растягивается при переезде, увеличивается под пальцем, идёт за пальцем, помнит последнее положение между страницами, открывает раздел при отпускании.

Что нужно, чтобы перенести в свой проект:
1. React 18+ и React Router (`NavLink`, `useLocation`, `useNavigate`); при другом роутере замените эти три вызова.
2. Компонент `Icon` с CSS-масками (см. раздел 4) или замените на свои значки.
3. Данные пунктов: `{ label, to, icon, also?, badge? }`, где `also` список дополнительных путей, при которых пункт считается выбранным, а `badge` показывает точку.
4. Стили из приложения B.

## A.1 Компонент

```tsx
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

type NavItem = { label: string; to: string; icon: string; also?: string[]; badge?: number | boolean };

const cx = (...p: (string | false | undefined)[]) => p.filter(Boolean).join(' ');

const DRAG_PX = 6; // на сколько сдвинуть палец, чтобы нажатие стало перетаскиванием
const MOVE_MS = 480; // дольше всего пилюля переезжает к новому пункту

/** Где пилюля стояла в последний раз: страницы собирают панель заново, а пилюля должна ехать от старого места, а не появляться на новом. */
let lastPillLeft: number | null = null;

/** Положение и ширина каждого пункта относительно внутреннего края панели. Берём из вёрстки, поэтому слева и справа всё симметрично. */
function cellsOf(host: HTMLElement) {
  const box = host.getBoundingClientRect();
  const scale = box.width / host.offsetWidth || 1; // панель на миг увеличивается под пальцем: возвращаем мерки к исходным
  const origin = box.left + host.clientLeft * scale;
  return Array.from(host.querySelectorAll<HTMLElement>('a.tab'), (tab) => {
    const r = tab.getBoundingClientRect();
    return { left: (r.left - origin) / scale, width: r.width / scale };
  });
}

/**
 * Нижняя панель «жидкое стекло». Прозрачная пилюля выбранного раздела переезжает к новому пункту,
 * на ходу растягиваясь, как капля. Под пальцем она увеличивается и идёт за ним влево и вправо:
 * пока палец на панели, страница не меняется и ничего не пересобирается, раздел открывается при отпускании.
 */
export function TabBar({ tabs }: { tabs: NavItem[] }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bar = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const gesture = useRef<{ x: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const placed = useRef(false);
  const [width, setWidth] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null); // пункт под пальцем: подсвечивает значок
  const [pending, setPending] = useState<{ index: number; at: string } | null>(null); // куда едем, пока адрес ещё не сменился
  const current = tabs.findIndex((t) => [t.to, ...(t.also ?? [])].some((to) => pathname === to || pathname.startsWith(`${to}/`)));
  // после отпускания пилюля сразу едет к выбранному пункту, а не возвращается назад в ожидании смены адреса
  const target = pending && pending.at === pathname ? pending.index : current;
  const shown = dragIndex ?? target;

  // палец в долях пункта: 0 — первый пункт, n−1 — последний
  const posAt = (clientX: number) => {
    const el = bar.current;
    if (!el) return Math.max(target, 0);
    const cells = cellsOf(el);
    if (cells.length < 2) return 0;
    const box = el.getBoundingClientRect();
    const scale = box.width / el.offsetWidth || 1;
    const x = (clientX - box.left) / scale - el.clientLeft;
    const step = cells[1].left - cells[0].left;
    return Math.min(Math.max((x - cells[0].left - cells[0].width / 2) / step, 0), cells.length - 1);
  };
  const leftOf = (cells: { left: number }[], pos: number) => cells[0].left + pos * (cells.length > 1 ? cells[1].left - cells[0].left : 0);

  // пилюля плавно едет к краю dest; в середине пути растянута от старого места до нового и не выходит за панель
  const glide = (dest: number, w: number, from?: number) => {
    const el = pill.current;
    if (!el) return;
    const live = from ?? (placed.current ? parseFloat(getComputedStyle(el).left) : (lastPillLeft ?? Number.NaN));
    el.getAnimations().forEach((a) => a.cancel());
    el.style.width = `${w}px`;
    el.style.left = `${dest}px`;
    placed.current = true;
    lastPillLeft = dest;
    if (Number.isNaN(live) || Math.abs(live - dest) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dist = Math.abs(dest - live);
    const anim = el.animate(
      [{ left: `${live}px`, width: `${w}px` }, { left: `${Math.min(live, dest)}px`, width: `${w + dist * 0.9}px`, offset: 0.5 }, { left: `${dest}px`, width: `${w}px` }],
      { duration: Math.round(Math.min(MOVE_MS, 260 + dist * 1.1)), easing: 'cubic-bezier(.32,.72,0,1)' },
    );
    // пока пилюля едет, запоминаем, где она сейчас: если страница пересоберёт панель, новая пилюля продолжит путь с этого места
    lastPillLeft = live;
    const sample = () => {
      if (!el.isConnected) return;
      const now = parseFloat(getComputedStyle(el).left);
      if (!Number.isNaN(now)) lastPillLeft = now;
      if (anim.playState === 'running') requestAnimationFrame(sample);
      else lastPillLeft = dest;
    };
    requestAnimationFrame(sample);
  };
  // пилюля идёт за пальцем без анимации и без перерисовки страницы
  const follow = (pos: number) => {
    const el = pill.current;
    const host = bar.current;
    if (!el || !host) return;
    const cells = cellsOf(host);
    if (!cells.length) return;
    el.getAnimations().forEach((a) => a.cancel());
    const left = leftOf(cells, pos);
    el.style.width = `${cells[0].width}px`;
    el.style.left = `${left}px`;
    lastPillLeft = left;
  };

  const finish = () => { gesture.current = null; setDragIndex(null); };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture.current = { x: e.clientX, moved: false };
    bar.current?.setPointerCapture(e.pointerId);
    // под пальцем пилюля сразу увеличивается и плавно подъезжает к нажатому пункту
    const index = Math.round(posAt(e.clientX));
    setDragIndex(index);
    const host = bar.current;
    if (host && index !== target) {
      const cells = cellsOf(host);
      if (cells.length) glide(leftOf(cells, index), cells[0].width);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.moved && Math.abs(e.clientX - g.x) > DRAG_PX) g.moved = true;
    if (!g.moved) return;
    const pos = posAt(e.clientX);
    follow(pos);
    const index = Math.round(pos);
    setDragIndex((prev) => (prev === index ? prev : index));
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!gesture.current) return;
    const index = Math.round(posAt(e.clientX));
    const to = tabs[index];
    finish();
    // и нажатие, и перетаскивание открывают раздел здесь; обычный клик по ссылке после этого не нужен
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
    if (to && index !== target) { setPending({ index, at: pathname }); void navigate(to.to); return; }
    // отпустили на прежнем пункте: пилюля плавно возвращается на место
    const host = bar.current;
    if (host) { const cells = cellsOf(host); if (cells.length) glide(leftOf(cells, target), cells[0].width); }
  };
  // обработчики вешаем на элемент в эффекте: nav сам по себе не интерактивен
  useEffect(() => {
    const el = bar.current;
    if (!el) return undefined;
    const onContext = (e: Event) => e.preventDefault();
    const onClick = (e: Event) => { if (swallowClick.current) e.preventDefault(); };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', finish);
    el.addEventListener('contextmenu', onContext);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', finish);
      el.removeEventListener('contextmenu', onContext);
      el.removeEventListener('click', onClick, true);
    };
  });
  // ширина панели меняется при повороте телефона
  useEffect(() => {
    const el = bar.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // в покое пилюля стоит на выбранном пункте; пока палец на панели, её ведёт жест
  useLayoutEffect(() => {
    const host = bar.current;
    if (!host || target < 0 || gesture.current) return;
    const cells = cellsOf(host);
    if (cells.length) glide(leftOf(cells, target), cells[0].width);
  }, [target, width, tabs.length]);

  return (
    <nav ref={bar} className={cx('tabbar trk-tabbar', dragIndex !== null && 'press')} aria-label="Разделы" style={{ '--n': tabs.length } as CSSProperties}>
      {target >= 0 && <span ref={pill} className="tabpill" aria-hidden="true" />}
      {tabs.map((t, i) => (
        <NavLink key={t.to} to={t.to} draggable={false} className={cx('tab', i === shown && 'cur')}>
          <Icon name={t.icon} /><span className="sr-only">{t.label}{t.badge ? ', есть новые' : ''}</span>{t.badge ? <span className="dot" aria-hidden="true" /> : null}
        </NavLink>
      ))}
    </nav>
  );
}
```

`Icon` в проекте это `<i className={`i i-${name}`} aria-hidden="true" />` с масками из приложения B.

Использование:

```tsx
const tabs = [
  { label: 'Поиск', to: '/teachers', icon: 'search' },
  { label: 'Занятия', to: '/me/lessons', icon: 'book' },
  { label: 'Чаты', to: '/me/chats', icon: 'chat-bubble', badge: unreadChats },
  { label: 'Профиль', to: '/me/account', icon: 'user', also: ['/me/requests', '/me/payments'] },
];
<TabBar tabs={tabs} />
```

Нижний отступ страницы: `padding-bottom: 110px` (панель + запас).

---

# Приложение B. Итоговые стили меню из проекта

В проекте стили накапливались слоями правок. Ниже собран **итоговый результат**: те значения, которые браузер реально применяет сейчас. Его можно вставлять целиком.

```css
/* ===== Панель ===== */
.tabbar {
  position: fixed;
  left: 0; right: 0;
  margin: 0 auto;                                   /* по центру */
  bottom: calc(4px + env(safe-area-inset-bottom, 0px));
  width: min(318px, calc(100% - 32px));
  height: 62px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr));
  gap: 2px;
  border-radius: 999px;
  overflow: hidden;                                 /* растянутая пилюля не выходит за панель */
  z-index: 50;
  background: rgb(32 40 56 / 11%);                  /* матовая плашка */
  box-shadow: none;
  touch-action: pan-y;
  -webkit-user-select: none; user-select: none;
  transition: none;
}
.tabbar.press { transform: none; }                  /* увеличивается пилюля, не вся панель */

/* ===== Пункты ===== */
.tabbar .tab {
  position: relative; z-index: 1;
  display: grid; align-content: center; justify-items: center;
  min-height: 50px; padding: 0;
  border-radius: 999px;
  color: #202838;                                   /* значки всегда тёмные */
  background: transparent;
  transition: none;
}
.tabbar .tab .i { width: 28px; height: 28px; transition: none; background: currentColor; }
.tabbar .tab.cur { background: transparent; color: #202838; }
/* выбранный и пункт под пальцем: жирный (заполненный) вариант значка, например:
.tabbar .tab.cur .i-book { --m: url(...жирный вариант...) } */

/* ===== Пилюля ===== */
.tabbar .tabpill {
  position: absolute; top: 5px; bottom: 5px; left: 5px;   /* left и width выставляет скрипт */
  border-radius: 999px;
  z-index: 0;
  background: linear-gradient(rgb(255 255 255 / 58%), rgb(255 255 255 / 36%));
  box-shadow:
    0 2px 8px rgb(32 40 56 / 10%),
    inset 0 1px 0 rgb(255 255 255 / 85%),
    inset 0 0 0 1px rgb(255 255 255 / 35%);
  will-change: left, width;
  transition: box-shadow .25s, transform .25s cubic-bezier(.32, .72, 0, 1);
}
.tabbar.press .tabpill {
  transform: scale(1.1, 1.08);                      /* приподнялась под пальцем */
  box-shadow:
    0 8px 18px rgb(32 40 56 / 16%),
    inset 0 1px 0 rgb(255 255 255 / 85%),
    inset 0 0 0 1px rgb(255 255 255 / 35%);
}

/* ===== Точка непрочитанного ===== */
.tabbar .tab .dot {
  position: absolute; top: 12px; left: calc(50% + 8px);
  width: 7px; height: 7px; padding: 0; min-width: 0;
  border-radius: 999px;
  background: #f26a2e;                              /* цвет акцента проекта: замените на свой */
}

/* ===== Значки как CSS-маски (пример) ===== */
.i { display: block; background: currentColor;
     -webkit-mask: var(--m) center / contain no-repeat; mask: var(--m) center / contain no-repeat; }
.i-search { --m: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><g fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round'><circle cx='11' cy='11' r='6.5'/><path d='M16 16l4.5 4.5'/></g></svg>"); }

/* ===== Страница под панелью и доступность ===== */
.app { padding-bottom: 110px; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
* { -webkit-tap-highlight-color: transparent; }
@media (prefers-reduced-motion: reduce) { .tabbar, .tabbar .tabpill { transition: none; } }
```

Замечания по переносу:
- В проекте панель показывается только на телефоне (до 760 px), на компьютере вместо неё верхняя шапка. Для этого стоит `@media (max-width: 760px)`; на компьютере панель скрыта (`display: none`).
- Матовая плашка в проекте выбрана осознанно (без размытия). Если нужен вариант с настоящим стеклом, замените `background` панели и добавьте `backdrop-filter` из раздела 2.2 основной части.
- Пункт «Профиль» всегда последний. Пункты, которых нет в панели, открываются из профиля.
