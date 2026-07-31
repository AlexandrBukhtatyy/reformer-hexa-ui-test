# reformer-hexa-ui

Формы из JSON-схем на `@reformer/renderer-json` поверх дизайн-системы `@kaspersky/hexa-ui`:
страница регистрации и многошаговая заявка (wizard). Обе собраны из одного реестра компонентов —
схема несёт только layout, валидация и поведение живут отдельными TS-модулями.

## Демо

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/AlexandrBukhtatyy/reformer-hexa-ui-test)

<https://stackblitz.com/github/AlexandrBukhtatyy/reformer-hexa-ui-test>

Зависимости ставятся и дев-сервер поднимается сами: `.stackblitzrc` запускает `npm start`.

## Локальный запуск

```bash
npm start        # установка зависимостей + vite dev
```

Дальше — `npm run dev`, `npm run build`, `npm run lint`.

`legacy-peer-deps` включён в `.npmrc` намеренно: hexa-ui тянет antd 4, который в peerDependencies
просит React 16/17, а проект на React 19 — без флага установка падает с ERESOLVE.

## Структура

| Путь | Что внутри |
| --- | --- |
| [src/libs/hexa-ui/](src/libs/hexa-ui/) | мост @reformer ↔ hexa-ui: реестр компонентов, адаптеры контролов, обёртка поля, тексты ошибок |
| [src/layouts/FormLayout.tsx](src/layouts/FormLayout.tsx) | глобальные провайдеры рендерера и сообщений валидации |
| [src/pages/registration/](src/pages/registration/) | простая форма |
| [src/pages/subscription/](src/pages/subscription/) | wizard из трёх шагов со всеми компонентами реестра |

Каждая страница разложена одинаково: `form.json` — layout, `model.ts` — данные, `validation.ts` —
правила над моделью, `behavior.ts` — реактивные связи, `ui.ts` — render-behavior, `Form.tsx` — сборка.

## Реестр компонентов

Имена для `$component(...)` — [src/libs/hexa-ui/registry.ts](src/libs/hexa-ui/registry.ts):
`Textbox`, `Radio`, `Wizard`, `Step`, `Card`, `SectionMessage`, `Text`, `Heading`.

Три из них подключены через адаптеры: `Wizard` (шаги-ноды JSON → `steps` c `render()`),
`Card` (строковый заголовок → объект hexa-ui) и `Radio` (antd-группа отдаёт значение DOM-событием).
