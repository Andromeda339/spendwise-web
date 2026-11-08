# SpendWise — лабораторна робота №1

**Тема:** ознайомлення з середовищем та базовими інструментами.
**Проєкт:** SpendWise, застосунок для обліку особистих і сімейних витрат.
**Автор:** Якимович О. В., ІП-23-4.

**Опублікована сторінка:** <https://andromeda339.github.io/spendwise-web/>
**Репозиторій:** <https://github.com/Andromeda339/spendwise-web>

## Про проєкт

SpendWise є розвитком мого застосунку для обліку витрат (мобільний клієнт на Flutter та серверна частина на Node.js), створеного раніше. У межах лабораторних робіт я створюю для нього вебклієнт і поступово переношу та вдосконалюю серверну частину. У цій роботі зроблено першу сторінку проєкту й налаштовано середовище розробки.

## 1. Огляд стеку технологій

| Технологія | Роль у проєкті |
|---|---|
| HTML5 | Структура сторінки: семантичні теги, форма з атрибутами `required`, `min`, `type`. |
| CSS3 | Вигляд: CSS-змінні, grid і flex, адаптивність, світла та темна теми. |
| JavaScript | Логіка в браузері: обробка форми, перевірка введення, оновлення таблиці та підсумків без перезавантаження. |
| Node.js + Express 5 | Серверна частина SpendWise: REST API, бізнес-логіка, обробка завантажених чеків. |
| Prisma ORM | Опис моделей у `schema.prisma` та запити до бази даних з коду. |
| PostgreSQL (Neon) | Реляційна база даних у хмарі: користувачі, рахунки, категорії, транзакції, бюджети, домогосподарства, чеки. |
| Firebase Authentication | Вхід користувачів. Клієнт отримує ID-токен, сервер перевіряє його в заголовку `Authorization: Bearer …`. |
| Cloudinary | Зберігання фото чеків. |
| OCR.space | Розпізнавання тексту на фото чеків. |
| Flutter | Мобільний клієнт SpendWise. Вебклієнт створюється в наступних лабораторних. |
| REST API | Домовленість про обмін даними: ресурси (`/api/transactions`), методи GET, POST, PUT, DELETE, формат JSON. |

Ruby і Python у проєкті не використовуються: серверна частина написана на Node.js. Flask, Django чи Ruby on Rails виконували б у ній ту саму роль веб-сервера з REST API.

### Як усе пов'язано

```
Клієнт (браузер / Flutter) ──токен Firebase──▶ REST API (Node.js + Express) ──Prisma──▶ PostgreSQL
                                                    │
                                                    ├──▶ Cloudinary (фото чеків)
                                                    └──▶ OCR.space (розпізнавання тексту)
```

Клієнт надсилає HTTP-запити у форматі JSON разом із токеном Firebase. Сервер перевіряє токен і дані, звертається до бази через Prisma та повертає відповідь. Фото чека надходить на сервер як `multipart/form-data`, звідти йде в OCR, а розпізнані дані повертаються користувачеві.

### Приклад REST-запиту

```http
POST /api/transactions
Authorization: Bearer <Firebase ID token>
Content-Type: application/json

{
  "accountId": 1,
  "categoryId": 4,
  "type": "EXPENSE",
  "amount": 842.50,
  "transactionDate": "2026-06-24",
  "description": "Продукти"
}
```

Відповідь: `201 Created` і JSON створеної транзакції.

## 2. Налаштування середовища

1. **VS Code**: встановити з <https://code.visualstudio.com>, додати розширення *Live Server*, *ESLint*, *Prettier*.
2. **Git**: встановити з <https://git-scm.com>, налаштувати ім'я та пошту (команди в розділі 5).
3. **Node.js (LTS, версія 20 або новіша)**: з <https://nodejs.org>. Перевірка: `node -v`, `npm -v`.
4. **GitHub**: акаунт [Andromeda339](https://github.com/Andromeda339), авторизація через браузер або Personal Access Token.

## 3. Локальний запуск

Сторінка статична, тож підійде будь-який простий сервер:

```bash
npx serve docs
```

Відкрити адресу з терміналу (зазвичай `http://localhost:3000`). Альтернатива: у VS Code правою кнопкою на `docs/index.html` → *Open with Live Server*.

## 4. Структура репозиторію

```
spendwise-web/
├── .gitignore
├── README.md
└── docs/
    ├── index.html   розмітка
    ├── style.css    стилі
    └── script.js    логіка форми й таблиці
```

Сторінка лежить у `docs/`, тому що GitHub Pages публікує саме цю папку. Корінь залишено вільним для `client/` і `server/` у наступних лабораторних.

## 5. Публікація на GitHub Pages

```bash
git remote add origin https://github.com/Andromeda339/spendwise-web.git
git push -u origin main
git tag lab-1
git push origin lab-1
```

Далі в репозиторії: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, папка `/docs` → Save**. Через 1-2 хвилини сторінка з'явиться за адресою <https://andromeda339.github.io/spendwise-web/>.

## 6. Що показано у звіті

- [ ] Версії `node`, `npm`, `git`.
- [ ] VS Code з відкритим проєктом.
- [ ] Сторінка на `localhost`.
- [ ] Історія комітів (`git log --oneline`) і репозиторій на GitHub з тегом `lab-1`.
- [ ] Налаштування Pages і опублікована сторінка.
- [ ] Висновки: що вивчено, які були труднощі.
