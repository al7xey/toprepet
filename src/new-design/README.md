# Новый интерфейс TopRepet

Всё новое живёт в `src/new-design`. Старое приложение (блог, документы, старые лендинги) не трогаем; какие адреса обслуживает новый интерфейс — `isNewPath` в `router.tsx`.

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
2. **Заголовки.** Страница — `PageHeader` (h1: 40 px на компьютере, 30 на телефоне), секция — `Section` (h2: 30/26), карточка — `CardTitle` (22/20). Герой главной и «Для репетиторов» — тоже 40/30 (решение владельца). Заголовки внутри списков шагов (`Steps`) — 22/20. Своих размеров заголовков нет.
3. **Данные только через `api`.** Никаких захардкоженных списков на страницах. У каждого запроса есть загрузка (скелетон), ошибка с «Повторить» и пустое состояние.
4. **Каждая кнопка работает.** Если функции нет в API — кнопки нет. Формы: проверка полей, кнопка с `loading`, ошибка сервера через `FormError`, успех через тост или переход.
5. **Тексты для ученика** не упоминают сервисный сбор. Длительность бесплатного знакомства задаёт репетитор (`tutor.introMinutes`), «20 минут» не пишем. Избранного и менеджера нет.
6. **Телефон 390 px** без горизонтальной прокрутки. В кабинетах на телефоне нет закреплённой шапки.
7. **Контраст.** Белый текст на оранжевой кнопке (#f26a2e) даёт 3,05:1, поэтому текст основной кнопки крупный и жирный (≥ 19 px, 700): так он проходит AA как крупный. Цвет кнопки не меняем (решение владельца).
8. **Семантика.** Модальные окна и меню — `<dialog>`, группы выбора — `<fieldset>`, выбор карточкой — настоящий `<input type="radio">`, поиск — `<search>`. Инлайн-стили только для динамических значений (размер аватара, скелетона); статичное — классы `u-*` из `ui/kit.css`.
9. **Проверки.** Перед пушем: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test` (правила мока). То же гоняет CI (`.github/workflows/quality.yml`).
10. Стили страницы — только если без них никак, в `pages/<зона>/<зона>.css` с префиксом `.tr .p-<зона>-`.

## Демо-доступ (мок)

`olga@mail.ru` — ученик, `anastasia@toprepet.ru` — репетитор, `admin@toprepet.ru` — администратор; пароль `demo`. Состояние мока хранится в `localStorage` (`toprepet-mock-v3`), сбросить — удалить этот ключ.

## Подключение бэкенда

Задать `VITE_API_URL=https://api.toprepet.ru/v1` при сборке. Все методы и адреса — в `api/contract.ts`, форматы — в `api/types.ts`. Сессия — httpOnly cookie, запросы идут с `credentials: 'include'`.

## Меню кабинетов и готовность страниц
В меню и нижней панели показываются только страницы, которые уже собраны: список `READY` в `layout/layouts.tsx`. Собрали новую страницу — добавьте её адрес в `READY`, и кнопка появится сама. Так ни одна кнопка не ведёт на 404.

## Мок и данные репетитора
Данные кабинета репетитора (расписание, исключения, анкета, документы, выплаты) хранятся по id анкеты. Регистрация репетитора создаёт черновик анкеты; новая анкета уходит на модерацию администратору (этап 5). Ключ хранилища `toprepet-mock-v3`: при смене формы данных повышаем версию.

## Flat surfaces

No blur (`backdrop-filter`), gradients, glossy highlights or drop shadows anywhere in the project: surfaces are white or a plain tint with a 1–1.5px ring (`box-shadow: inset 0 0 0 1px var(--line)`), buttons are solid colour, hover does not lift elements. The header is a solid white bar. Browser autofill is neutralised in `.trk-input`, letter avatars are centred with grid (`.avatar.trk-avatar-letter`). Class names `surf`, `surf-strong`, `surf-photo` replace the old `glass*` names.

## Stage 5: reviews, disputes, payments, notifications, admin

- Student: `/me/lessons/:id/review` (`RatingInput`, min 20 characters, goes to moderation), `/me/lessons/:id/problem` (24 hours after the start), `/me/disputes/:id`, `/me/payments` (history + cards, `AddCardModal` from the kit), `/me/notifications`.
- Tutor: `/tutor/reviews` (one reply per published review), `/tutor/disputes/:id`, `/tutor/notifications`; a new profile goes to moderation (`TutorStatus 'review'`), a returned one carries `moderationNote`.
- Admin: `/admin/disputes` (refund or pay out), `/admin/cancellations`, `/admin/reviews`, `/admin/profiles` (`adminProfileQueue`, `adminModerateProfile`).
- The mock writes notifications for the other party on every step (`note()` in `api/mock.ts`); the header bell refreshes on the `tr:notes` window event.
- Demo data: lesson `l-4` can be reviewed, `l-7` finished three hours ago and can be disputed. Accounts: `olga@mail.ru`, `anastasia@toprepet.ru`, `admin@toprepet.ru`, password `demo`.
