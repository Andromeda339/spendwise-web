# Деплой SpendWise на Render

Інструкція до лабораторної роботи №5 «Хмарні сервіси та деплоймент». Розгортаються два сервіси Render з одного репозиторію:

| Сервіс | Тип Render | Папка | Призначення |
|---|---|---|---|
| `spendwise-web-api` | Web Service | `server/` | REST API (Node.js, Express 5, Prisma) |
| `spendwise-web-client` | Static Site | `client/` | Вебклієнт (React 18, Vite 6) |

Зовнішні сервіси, які використовує API: PostgreSQL на Neon, Firebase Authentication, Cloudinary (фото чеків), OCR.space (розпізнавання чеків). Стара серверна частина (`spendwise-nwoi`) для мобільного застосунку не змінюється; нова працює з тією самою базою Neon, тому міграції (`prisma migrate`) на Render не запускаються.

```
Браузер ─► Static Site (React) ─► Web Service (Express) ─► Neon (PostgreSQL)
                │                        ├─► Firebase Admin (перевірка токена)
                └─► Firebase Auth        ├─► Cloudinary (зберігання чеків)
                    (вхід, ID-токен)     └─► OCR.space (розпізнавання)
```

## 1. Web Service (бекенд)

| Параметр | Значення |
|---|---|
| Repository / Branch | `Andromeda339/spendwise-web`, `main` |
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install && npm run build` (скрипт `build` виконує `prisma generate`) |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/health` |
| Auto-Deploy | On Commit |

`dotenv` і `prisma` винесені в `dependencies`, щоб збірка не залежала від dev-залежностей.

## 2. Змінні оточення сервера

Задаються у вкладці **Environment** сервісу. Локально ті самі змінні лежать у `server/.env` (шаблон: `server/.env.example`), файл у Git не потрапляє.

| Змінна | Призначення | Секрет |
|---|---|---|
| `DATABASE_URL` | Рядок підключення до Neon | так |
| `FIREBASE_CREDENTIALS` | Повний JSON ключа service account Firebase одним рядком (локально замість нього файл `firebase-admin.json`) | так |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Доступ до Cloudinary | ключ і секрет |
| `OCR_SPACE_API_KEY` | Ключ OCR.space | так |
| `CORS_ORIGINS` | Дозволені адреси клієнта через кому; на Render: `https://<клієнт>.onrender.com,http://localhost:5173` | ні |
| `RATE_LIMIT_MAX` | Ліміт запитів на IP за 15 хвилин (за замовчуванням 600) | ні |
| `TRUST_PROXY` | `1` за reverse-proxy Render, щоб rate limit бачив IP клієнта | ні |
| `NODE_VERSION` | Версія Node.js на Render (наприклад, `24`) | ні |

`PORT` на Render не задається: платформа виставляє його сама. `RENDER_EXTERNAL_URL` також надає Render; сервер додає цю адресу до дозволених CORS-джерел, щоб працював Swagger UI.

## 3. Static Site (клієнт)

| Параметр | Значення |
|---|---|
| Root Directory | `client` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Змінні (задаються у Environment; вони читаються **під час збірки**, тому після зміни потрібен новий деплой):

| Змінна | Значення |
|---|---|
| `VITE_API_URL` | Адреса Web Service, `https://<api>.onrender.com` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Публічні ідентифікатори Firebase (див. `client/.env.example`) |

Після першого деплою:

1. Firebase Console → Authentication → Settings → Authorized domains: додати `<клієнт>.onrender.com`.
2. У Web Service оновити `CORS_ORIGINS` адресою клієнта.

## 4. Порядок деплою

1. Створити Web Service, задати змінні, дочекатися статусу Live, перевірити `/health` і `/api-docs`.
2. Створити Static Site з `VITE_API_URL` на адресу з кроку 1.
3. Додати домен клієнта у Firebase та в `CORS_ORIGINS`.
4. Перевірити вхід, рахунки, транзакції, завантаження чека.
5. Прогнати колекцію Postman з оточенням `server/postman/cloud.postman_environment.json` (змінити `baseUrl`, у Current value заповнити `email` і `password` тестового користувача).

## 5. Моніторинг

| Засіб | Що показує |
|---|---|
| `GET /health` | Легка перевірка «процес живий» (uptime, час). Саме її опитує Render, тому вона не звертається до БД |
| `GET /ready` | Глибша перевірка: пінг БД і час відповіді, використання пам'яті, uptime, версія Node. Статус 503, якщо БД недоступна |
| Логи запитів | Рядки вигляду `GET /api/accounts 200 34.2 мс` у вкладці **Logs** на Render (`/health` і Swagger UI не логуються) |
| Render Dashboard | Вкладки Logs, Events (деплої, перезапуски), Metrics (якщо доступні на поточному тарифі), налаштування Health Checks і Notifications |
| Зовнішній монітор | Опитування `/health` сервісом на кшталт UptimeRobot (лише на період вимірювань: пінг не дає безкоштовному сервісу засинати і витрачає години тарифу) |

Вимірювання холодного й теплого старту (PowerShell, підставте адресу API):

```powershell
$u = "https://<api>.onrender.com/health"
"Холодний старт:"; (Measure-Command { curl.exe -s -o NUL $u }).TotalMilliseconds
"Теплі запити:"; 1..10 | ForEach-Object { (Measure-Command { curl.exe -s -o NUL $u }).TotalMilliseconds }
```

Холодний старт вимірюють після понад 15 хвилин без запитів. Умови безкоштовного тарифу Render можуть змінюватися, актуальні ліміти варто перевіряти на сайті платформи.

## 6. Типові проблеми

| Симптом | Причина й розв'язання |
|---|---|
| Перший запит триває близько хвилини | Безкоштовний сервіс заснув; наступні запити швидкі |
| У браузері помилка CORS або 403 | Адреси клієнта немає в `CORS_ORIGINS` (без слеша в кінці) |
| Вхід у клієнті не працює | Домен клієнта не доданий у Firebase → Authorized domains |
| Клієнт звертається до `localhost` | `VITE_API_URL` не задано в Static Site або після його зміни не було нового деплою |
| `Cannot find package 'dotenv'` або `prisma` у логах збірки | Пакети мають бути в `dependencies`, а Build Command має містити `npm run build` |
| Сервіс перезапускається в циклі | Health Check Path вказує на повільний шлях; має бути `/health` |
