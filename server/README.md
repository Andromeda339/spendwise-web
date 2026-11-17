# SpendWise server

Серверна частина SpendWise: Node.js + Express 5, Prisma ORM, PostgreSQL (Neon), Firebase Authentication.

## Структура

```
server/
├── src/
│   ├── server.js            точка входу, ланцюжок middleware, /health, /api-docs
│   ├── routes/              маршрути з підключеною валідацією
│   ├── controllers/         обробка запитів і відповідей
│   ├── services/            бізнес-логіка та робота з БД (Prisma)
│   ├── validation/          схеми перевірки даних (zod)
│   ├── middleware/          автентифікація, валідація, безпека, обробка помилок, завантаження файлів
│   └── config/              підключення до БД і Firebase
├── prisma/                  схема, міграції, seed
├── scripts/                 допоміжні скрипти
├── openapi.yaml             специфікація OpenAPI 3.0
└── postman/                 колекція та оточення Postman
```

## Запуск

```bash
npm install
npm run dev
```

Потрібні файли `.env` та `firebase-admin.json`. Вони не потрапляють у Git.

## Змінні оточення (безпека)

| Змінна | Призначення | За замовчуванням |
|---|---|---|
| `CORS_ORIGINS` | Адреси вебклієнта через кому | `http://localhost:5173` |
| `RATE_LIMIT_MAX` | Максимум запитів до `/api` за 15 хвилин з однієї адреси | `600` |
| `TRUST_PROXY` | Кількість проксі перед сервером (на Render: `1`) | не задано |

## Захист даних

- **Автентифікація:** токен Firebase перевіряється в кожному запиті до `/api` (крім `/health`).
- **Валідація:** усі тіла запитів і параметри адреси перевіряються схемами zod, зайві поля відкидаються.
- **Helmet:** захисні HTTP-заголовки.
- **CORS:** браузерні запити дозволені лише з адрес `CORS_ORIGINS`.
- **Rate limiting:** загальний ліміт на `/api`, суворіші ліміти на `/api/auth` і `/api/transactions/scan`.
- **Обмеження розміру:** JSON до 100 КБ, зображення до 5 МБ (JPG, PNG, WebP).
- **Помилки:** клієнт отримує загальні повідомлення, технічні подробиці пишуться лише в лог.
- **Секрети:** `.env` і `firebase-admin.json` ігноруються Git.

## Перевірка

- Стан сервера: <http://localhost:5000/health>
- Документація (Swagger UI): <http://localhost:5000/api-docs>

## Тестування в Postman

1. Імпортуйте `postman/SpendWise.postman_collection.json` і `postman/local.postman_environment.json`.
2. Оберіть оточення **SpendWise local**, заповніть `email` і `password` користувача Firebase (акаунт з паролем).
3. Запустіть колекцію через Collection Runner.
