# TopRepet

Лендинг сервиса частных репетиторов. Статическое React-приложение на TypeScript и Vite, публикуемое через GitHub Pages.

## Запуск

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

## Публикация

Каждый push в `main` запускает `.github/workflows/pages.yml`: проект собирается в `dist` и публикуется на GitHub Pages. В настройках репозитория выберите **Settings → Pages → GitHub Actions**. Пользовательский домен указан в `public/CNAME`.

## Основные маршруты

- `/#/` — главная страница.
- `/#/lessons` — выбор цели, предмета, класса и экзамена.
- `/#/teacher/:id` — подробная анкета преподавателя.

Цена и контактный Telegram настраиваются в `src/shared/config/site.ts`.
