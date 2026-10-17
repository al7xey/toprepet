# Бэкенд TopRepet (Django)

Сервер лежит в `backend/`. Фронтенд переключается на него одной переменной `VITE_API_URL` (без неё работает мок в браузере). Адреса, поля и ошибки описаны в `src/new-design/api/contract.ts` и `types.ts`; сервер выдаёт ровно эти формы.

## Быстрый старт

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo          # демо-данные: olga@mail.ru, anastasia@toprepet.ru, admin@toprepet.ru, пароль demo
python manage.py runserver 8000
# в другом терминале, в корне репозитория:
VITE_API_URL=http://127.0.0.1:8000 pnpm dev
```

Тесты: `cd backend && python -m pytest`. Контрактные тесты (те же сценарии, что у мока, но против сервера на чистой базе): `bash backend/scripts/contract.sh` из корня репозитория.
Демо-каталог выгружается из фронтенда командой `pnpm exec tsx scripts/export-demo.mjs` (файл `backend/tutors/fixtures/demo_tutors.json`).

## Переменные окружения

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `DEBUG` | `1` — разработка, `0` — прод | `1` |
| `SECRET_KEY` | секрет Django (в проде обязателен) | только для разработки |
| `ALLOWED_HOSTS` | домены API через запятую | `*` в разработке |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db`, иначе SQLite | SQLite `db.sqlite3` |
| `ALLOWED_ORIGINS` | адреса сайта (CORS и проверка Origin) | `localhost:5173,5199` |
| `SITE_URL` | адрес сайта для ссылок в письмах | `http://localhost:5173` |
| `SESSION_COOKIE_DOMAIN` | в проде `.toprepet.ru`, чтобы cookie ходила между сайтом и `api.` | пусто |
| `EMAIL_URL` | `smtp://user:pass@host:587` (или `smtps://` для SSL); без него письма печатаются в консоль | консоль |
| `DEFAULT_FROM_EMAIL` | отправитель писем | `TopRepet <noreply@toprepet.ru>` |
| `PAYMENT_PROVIDER` | `fake` — заглушка | `fake` |
| `MEETING_URL` | ссылка на видеоурок (пока общая) | `https://telemost.yandex.ru/` |
| `MEDIA_ROOT`, `MEDIA_URL` | куда сохранять фото и документы | `backend/media` |
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | вход через Яндекс ID (включится после доработки) | пусто |
| `HSTS_SUBDOMAINS`, `HSTS_PRELOAD` | `1`, когда все поддомены только по HTTPS | выкл. |

## Как устроено

- **Сессия и защита.** Вход создаёт httpOnly-cookie `toprepet_session` (`SameSite=Lax`, `Secure` в проде). Сайт `toprepet.ru` и API `api.toprepet.ru` для браузера — один «сайт», поэтому cookie ходит без CSRF-токена: небезопасные запросы принимаются только с известного `Origin` и только как JSON или multipart (`core/middleware.py`). Попытки входа ограничены (30 в минуту).
- **Ошибки.** Всегда `{ "message": "...", "code": "..." }`; `message` фронтенд показывает как есть. Нет входа — 401, нет прав — 403, чужие данные — 404.
- **Деньги.** Запись замораживает сумму, подтверждение репетитором списывает, отказ или молчание репетитора снимают заморозку, отмена учеником раньше чем за 4 часа возвращает деньги, позже — нет. Выплата репетитору проходит через сутки после урока, если у него заполнены реквизиты самозанятого (`lessons/jobs.py`). Ученик не видит цену репетитора, репетитор — цену ученика: сервисный сбор 10 % видит только админка (`lessons/serializers.py`).
- **Платёжный слой** — интерфейс `payments/providers.py`: `hold`, `capture`, `cancel_hold`, `refund`, `payout`, `tokenize_card`. Сейчас `FakeProvider` (номер карты, оканчивающийся на `0119`, имитирует отказ банка). Настоящий провайдер подключается новым классом и значением `PAYMENT_PROVIDER`.
- **Фоновые задания.** `python manage.py run_jobs` раз в минуту (cron или отдельный контейнер `jobs` в `docker-compose.yml`): истёкшие неподтверждённые записи, автозавершение уроков без отметки, выплаты, истёкшие заявки.
- **Сброс пароля.** Эндпоинты `POST /auth/password-reset` и `POST /auth/password-reset/confirm {token, password}`. Страницы нового пароля во фронтенде пока нет (этап 7).

## Деплой (черновик)

1. Сервер с Docker или Python 3.13, Postgres 16, домен `api.toprepet.ru`, HTTPS (nginx или Caddy перед gunicorn).
2. Переменные из таблицы выше; `DEBUG=0`, длинный `SECRET_KEY`.
3. `python manage.py migrate`, затем запуск `gunicorn config.wsgi` (см. `backend/Dockerfile`) и cron/контейнер с `run_jobs`.
4. Администратор: `python manage.py createsuperuser` (роль `admin` задаётся в админке Django или командой `shell`).
5. Резервные копии базы (`pg_dump` раз в сутки) и каталога `media` (или S3-совместимое хранилище через `django-storages`).
6. Во фронтенде при сборке задать `VITE_API_URL=https://api.toprepet.ru`.

`docker-compose.yml` и `Dockerfile` написаны, но в среде разработки не запускались (нет Docker-демона): первый запуск проверьте на своей машине.

## Что нужно от владельца для боевого запуска

- Домен и сервер (или облако), SMTP для писем.
- Платёжный сервис и ключи (ЮKassa или Т-Касса), решение по выплатам самозанятым.
- Ключи Яндекс ID, S3-бакет для фото и документов.
- Решения по видеосвязи (Телемост/Zoom/Jitsi) и по тому, показывать ли репетитору сервисный сбор.
