# Новый интерфейс TopRepet

Весь сайт живёт в `src/new-design`: публичные страницы, документы (`pages/public/legal*.tsx`), блог (`pages/public/blog.tsx`, данные из `src/blog/data.ts`), кабинеты. Старые адреса (`/lessons`, `/contact`, `/free-intro`, `/direction/*`, `/for-tutors`, `/teacher/*`) перенаправляются в `routes/public.tsx`, а для поисковиков на них создаются статические страницы-редиректы в `scripts/prerender.mjs`. Админка блога `/blog/admin/*` осталась отдельной оболочкой (`src/blog/admin.tsx`, вне Метрики).

## Как устроено

- `api/` — слой данных. `types.ts` — контракт с бэкендом (сущности), `contract.ts` — все методы с REST-адресами, `http.ts` — реальный клиент (включается переменной `VITE_API_URL`), `mock.ts` — моковый бэкенд в браузере с правилами продукта, `hooks.ts` — `useQuery` и `useMutation`, `session.tsx` — текущий пользователь, `RequireRole`, `homeFor(role)`.
- `ui/` — UI-кит. Любой элемент интерфейса собирается из него, похожие элементы выглядят одинаково. `kit.tsx` — базовые компоненты, `domain.tsx` — карточка репетитора, урок, календарь записи, сообщения, `overlay.tsx` — окна и тосты, `kit.css` — их стили.
- `layout/layouts.tsx` — `PublicLayout` (публичные страницы), `AuthLayout` (вход, регистрация), `AppLayout role=…` (кабинеты: на компьютере шапка с разделами, на телефоне нижняя панель вкладок без шапки).
- `routes/*.tsx` — маршруты по зонам, `router.tsx` — сборка, провайдеры, анимации появления.
- `pages/<зона>/` — страницы.
- `lib/format.ts` — деньги, даты, склонения.
- `tr.css` — стили макетов (сгенерированы, руками не правятся), `home.css` — главная, каталог, анкета.

## Правила

1. **Только кит.** Кнопка — `Button`, поле — `TextField`/`TextArea`/`SelectField`/`PasswordField`, выбор — `ChoiceCards`/`OptionChips`/`Checkbox`/`Switch`, статус — `Status`, сообщение — `Note`, шаги «1-2-3» — `Steps`, пустой экран — `EmptyState`, загрузка/ошибка — `QueryView`, урок — `LessonCard`, выбор времени — `SlotPicker`, окно — `Modal`/`ConfirmDialog`, уведомление — `useToast`. Свой вариант существующего элемента не делаем.
2. **Заголовки.** Страница — `PageHeader` (h1: 32 px на компьютере, 26 на телефоне), секция — `Section` (h2: 24/21), карточка — `CardTitle` (18). Эти размеры проверяются в `e2e/quality.spec.ts`; отдельные заголовки героев и окон задаются UI-китом. Своих размеров заголовков на страницах нет.
3. **Данные только через `api`.** Никаких захардкоженных списков на страницах. У каждого запроса есть загрузка (скелетон), ошибка с «Повторить» и пустое состояние.
4. **Каждая кнопка работает.** Если функции нет в API — кнопки нет. Формы: проверка полей, кнопка с `loading`, ошибка сервера через `FormError`, успех через тост или переход.
5. **Тексты для ученика** не упоминают сервисный сбор. Длительность бесплатного знакомства задаёт репетитор (`tutor.introMinutes`), «20 минут» не пишем. Избранного и менеджера нет.
6. **Телефон 390 px** без горизонтальной прокрутки. В кабинетах на телефоне нет закреплённой шапки.
7. **Контраст.** Белый текст на оранжевой кнопке (#f26a2e) даёт 3,05:1, поэтому текст основной кнопки крупный и жирный (≥ 19 px, 700): так он проходит AA как крупный. Цвет кнопки не меняем (решение владельца).
   Для небольшого оранжевого текста активной навигации используется #c8460f, уже предусмотренный исходными стилями: яркий цвет кнопки не подходит для текста 17 px. Axe проверяет навигацию без исключений.
8. **Семантика.** Модальные окна и меню — `<dialog>`, группы выбора — `<fieldset>`, выбор карточкой — настоящий `<input type="radio">`, поиск — `<search>`. Инлайн-стили только для динамических значений (размер аватара, скелетона); статичное — классы `u-*` из `ui/kit.css`.
9. **Проверки.** Перед пушем: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test` (правила мока). То же гоняет CI (`.github/workflows/quality.yml`).
10. Стили страницы — только если без них никак, в `pages/<зона>/<зона>.css` с префиксом `.tr .p-<зона>-`.

## Демо-доступ (мок)

`olga@mail.ru` — ученик, `anastasia@toprepet.ru` — репетитор, `admin@toprepet.ru` — администратор; пароль `demo`. Состояние мока хранится в `localStorage` (`toprepet-mock-v3`), сбросить — удалить этот ключ.

## Подключение бэкенда

Задать `VITE_API_URL=https://api.toprepet.ru` при сборке. Все методы и адреса — в `api/contract.ts`, форматы — в `api/types.ts`. Сессия — httpOnly cookie, запросы идут с `credentials: 'include'`.

## Меню кабинетов и готовность страниц
В меню и нижней панели показываются только страницы, которые уже собраны: список `READY` в `layout/layouts.tsx`. Собрали новую страницу — добавьте её адрес в `READY`, и кнопка появится сама. Так ни одна кнопка не ведёт на 404.

## Мок и данные репетитора
Данные кабинета репетитора (расписание, исключения, анкета, документы, выплаты) хранятся по id анкеты. Регистрация репетитора создаёт черновик анкеты; новая анкета уходит на модерацию администратору (этап 5). Ключ хранилища `toprepet-mock-v3`: при смене формы данных повышаем версию.

## Liquid Glass

Источник интерфейса — [страница Liquid Glass в исходном макете](https://www.figma.com/design/z5laXdV2X4IQyFEaasZSK3/Untitled?node-id=61-2). Белые рабочие поверхности отделены от стеклянных шапок, поиска, подписей поверх портретов, меню и нижней панели. Общие материалы и оптика находятся в `ui/liquid-glass.css` и `ui/liquid-glass.tsx`. При нажатии движется только декоративный блик.

## Stage 5: reviews, disputes, payments, notifications, admin

- Student: `/me/lessons/:id/review` (`RatingInput`, min 20 characters, goes to moderation), `/me/lessons/:id/problem` (24 hours after the start), `/me/disputes/:id`, `/me/payments` (history + cards, `AddCardModal` from the kit), `/me/notifications`.
- Tutor: `/tutor/reviews` (one reply per published review), `/tutor/disputes/:id`, `/tutor/notifications`; a new profile goes to moderation (`TutorStatus 'review'`), a returned one carries `moderationNote`.
- Admin: `/admin/disputes` (refund or pay out), `/admin/cancellations`, `/admin/reviews`, `/admin/profiles` (`adminProfileQueue`, `adminModerateProfile`).
- The mock writes notifications for the other party on every step (`note()` in `api/mock.ts`); the header bell refreshes on the `tr:notes` window event.
- Demo data: lesson `l-4` can be reviewed, `l-7` finished three hours ago and can be disputed. Accounts: `olga@mail.ru`, `anastasia@toprepet.ru`, `admin@toprepet.ru`, password `demo`.

## Backend

`VITE_API_URL` включает настоящий сервер (Django, `backend/`, см. `docs/backend.md`), без префикса `/v1` при текущем URLconf. Для мока нужно явно задать `VITE_API_MODE=demo`; без обоих вариантов приложение сообщает об ошибке конфигурации. Общие сценарии правил продукта лежат в `api/scenarios.ts`: их проходят и мок (`mock.test.ts`), и сервер (`http.contract.test.ts`, запуск `bash backend/scripts/contract.sh`). Меняете правило в моке — меняйте сценарий, и тест покажет, что сервер разошёлся.

