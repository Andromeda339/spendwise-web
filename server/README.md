# SpendWise server

Серверна частина SpendWise: Node.js + Express 5, Prisma ORM, PostgreSQL (Neon), Firebase Authentication.

## Структура

```
server/
├── src/
│   ├── server.js        точка входу, middleware, /health, /api-docs
│   ├── routes/          маршрути
│   ├── controllers/     обробка запитів і відповідей
│   ├── services/        бізнес-логіка і робота з БД через Prisma
│   ├── middleware/      перевірка токена Firebase, завантаження файлів
│   └── config/          підключення до БД і Firebase
├── prisma/              схема, міграції, seed
├── openapi.yaml         специфікація OpenAPI 3.0
└── postman/             колекція та оточення Postman
```

## Запуск

```bash
npm install
npm run dev
```

Потрібні файли `.env` (змінні з `.env.example`) та `firebase-admin.json`. Вони не потрапляють у Git.

## Перевірка

- Стан сервера: <http://localhost:5000/health>
- Документація (Swagger UI): <http://localhost:5000/api-docs>
- Специфікація у JSON: <http://localhost:5000/api-docs.json>

## Тестування в Postman

1. Імпортуйте `postman/SpendWise.postman_collection.json` і `postman/local.postman_environment.json`.
2. Оберіть оточення **SpendWise local**, заповніть `email` і `password` користувача Firebase (акаунт з паролем).
3. Запустіть колекцію через Collection Runner. Перший запит отримує `idToken`, решта використовують його автоматично.

Колекція створює тестові рахунки й категорію, а наприкінці видаляє їх.
