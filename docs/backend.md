# Бэкенд TopRepet (Django)

Сервер лежит в `backend/`. Фронтенд переключается на него переменной `VITE_API_URL`; для демонстрации нужен явный `VITE_API_MODE=demo` (или `pnpm build:e2e`). Адреса, поля и ошибки описаны в `src/new-design/api/contract.ts` и `types.ts`. Подробный разбор защиты и порядок обновления существующей базы — [backend-security.md](backend-security.md).

## Быстрый старт

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
export DEBUG=1
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
| `DEBUG` | `1` — разработка, `0` — прод | `0` |
| `SECRET_KEY` | секрет Django (в проде обязателен) | только для разработки |
| `ALLOWED_HOSTS` | домены API через запятую | `*` в разработке |
| `DATABASE_URL` | PostgreSQL обязателен в production; SQLite только для разработки | SQLite `db.sqlite3` при DEBUG=1 |
| `ALLOWED_ORIGINS` | точные адреса сайта с scheme/port (CORS и Origin) | localhost в разработке, пусто в production |
| `SITE_URL` | адрес сайта для ссылок в письмах | `http://localhost:5173` |
| `SESSION_COOKIE_DOMAIN` | необязателен; host-only cookie API достаточно для credentials fetch | пусто |
| `EMAIL_URL` | `smtp://user:pass@host:587` (или `smtps://` для SSL) | консоль только DEBUG; без SMTP production отвечает 503 |
| `DEFAULT_FROM_EMAIL` | отправитель писем | `TopRepet <noreply@toprepet.ru>` |
| `PAYMENT_PROVIDER` | `fake` — заглушка для разработки; настоящего провайдера пока нет | fake при DEBUG=1, иначе disabled |
| `MEETING_URL` | ссылка на видеоурок (пока общая) | `https://telemost.yandex.ru/` |
| `MEDIA_ROOT`, `MEDIA_URL` | публичные аватары | `backend/media`, `/media/` |
| `PRIVATE_MEDIA_ROOT` | приватные документы и вложения чата, вне web root | `backend/private-media` |
| `TRUSTED_PROXY_CIDRS` | адреса непосредственных доверенных прокси, через запятую | пусто |
| `DB_STATEMENT_TIMEOUT_MS`, `DB_LOCK_TIMEOUT_MS` | лимиты PostgreSQL в production; отдельное значение 0 для планового DDL | 5000, 3000 |
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | вход через Яндекс ID (включится после доработки) | пусто |
| `HSTS_SUBDOMAINS`, `HSTS_PRELOAD` | `1`, когда все поддомены только по HTTPS | выкл. |

## Как устроено

- **Сессия и защита.** Вход создаёт httpOnly-cookie `toprepet_session` (`SameSite=Lax`, `Secure` в проде). Сайт `toprepet.ru` и API `api.toprepet.ru` для браузера — один «сайт», поэтому cookie ходит без CSRF-токена: небезопасные запросы принимаются только с известного `Origin` и только как JSON или multipart (`core/middleware.py`). Попытки входа ограничены (30 в минуту).
- **Ошибки.** Всегда `{ "message": "...", "code": "..." }`; `message` фронтенд показывает как есть. Нет входа — 401, нет прав — 403, чужие данные — 404.
- **Деньги.** Запись замораживает сумму, подтверждение репетитором списывает, отказ или молчание репетитора снимают заморозку, отмена учеником раньше чем за 4 часа возвращает деньги, позже — нет. Выплата репетитору проходит через сутки после урока, если у него заполнены реквизиты самозанятого (`lessons/jobs.py`). Ученик не видит цену репетитора, репетитор — цену ученика: сервисный сбор 10 % видит только админка (`lessons/serializers.py`).
- **Платёжный слой** — интерфейс `payments/providers.py`: `hold`, `capture`, `cancel_hold`, `refund`, `payout`, `tokenize_card`. Сейчас `FakeProvider` (номер карты, оканчивающийся на `0119`, имитирует отказ банка). Настоящий провайдер подключается новым классом и значением `PAYMENT_PROVIDER`.
- **Фоновые задания.** `python manage.py run_jobs` раз в минуту (cron или отдельный контейнер `jobs` в `docker-compose.yml`): истёкшие неподтверждённые записи, автозавершение уроков без отметки, выплаты, истёкшие заявки и очистка старых buckets лимитов.
- **Сброс пароля.** `POST /auth/password-reset` и `POST /auth/password-reset/confirm {token, password}`; frontend `/reset-password` принимает токен из ссылки.
- **Переписки.** `GET /conversations/:id/messages?before=:messageId&limit=100` — страница истории без изменения прочитанности. `POST /conversations/:id/read {throughMessageId}` — отдельное подтверждение чтения.
- **Документы.** Приватная выдача `/documents/:id/file`, отдельная модерация `/admin/documents/:id`. Фото чата доступны только участникам через `/conversations/:id/messages/:messageId/image`.

## Деплой

1. Сервер с Docker или Python 3.13, Postgres 16, домен `api.toprepet.ru`, HTTPS (nginx или Caddy перед gunicorn).
2. Переменные из таблицы выше; `DEBUG=0`, длинный `SECRET_KEY`.
3. Закрыть публичную выдачу старых документов, подготовить btree_gist и исторические данные, выполнить `python manage.py migrate`, `python manage.py secure_documents`, `python manage.py secure_chat_attachments`. Точный порядок — [backend-security.md](backend-security.md).
4. `python manage.py check --deploy --fail-level ERROR`; затем запуск `gunicorn config.wsgi:application` от непривилегированного пользователя и cron/контейнер с `run_jobs`. Администратор создаётся `python manage.py createsuperuser` с ролью admin автоматически.
5. Резервные копии БД и обоих каталогов media/private-media с проверкой восстановления. Проверять `/ready` и heartbeat фонового задания.
6. Во фронтенде при сборке задать `VITE_API_URL=https://api.toprepet.ru`.

CI собирает Dockerfile и проверяет непривилегированный UID. `docker-compose.yml` предназначен только для локальной демонстрации с DEBUG=1 и тестовым паролем БД; для production нужны собственные секреты, volumes и ingress.

## Что нужно от владельца для боевого запуска

- Домен и сервер (или облако), SMTP для писем.
- Платёжный сервис и ключи (ЮKassa или Т-Касса), решение по выплатам самозанятым.
- Ключи Яндекс ID, S3-бакет для фото и документов.
- Решения по видеосвязи (Телемост/Zoom/Jitsi) и по тому, показывать ли репетитору сервисный сбор.


После аудита безопасный режим включён по умолчанию. Для локальных команд экспортируйте DEBUG=1; для сервера задайте SECRET_KEY и ALLOWED_HOSTS. В рабочем режиме платёжный провайдер по умолчанию disabled. Подробности изменений — hardening.md.
