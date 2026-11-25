import { z } from 'zod';

// ---- базові правила ----
const id = z.coerce.number().int('Має бути цілим числом').positive('Має бути додатним числом');
const text = (max, label) => z.string().trim().min(1, `${label}: поле не може бути порожнім`).max(max, `${label}: максимум ${max} символів`);
const optText = (max) => z.string().trim().max(max, `Максимум ${max} символів`).optional().nullable();
const money = z.coerce.number().min(-1e12, 'Занадто мала сума').max(1e12, 'Занадто велика сума');
const positiveMoney = z.coerce.number().positive('Сума має бути більшою за нуль').max(1e12, 'Занадто велика сума');
const dateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Некоректна дата');

const accountType = z.enum(['CASH', 'CARD', 'DEPOSIT', 'JAR', 'OTHER']);
const currency = z.enum(['UAH', 'USD', 'EUR']);
const transactionType = z.enum(['INCOME', 'EXPENSE']);

// ---- рахунки ----
export const accountCreate = z.object({
  name: text(50, 'Назва'),
  type: accountType,
  balance: money.optional(),
  currency: currency.optional(),
  isFamilyAccount: z.boolean().optional(),
  clientId: optText(100),
});
export const accountUpdate = z.object({
  name: text(50, 'Назва').optional(),
  type: accountType.optional(),
  balance: money.optional(),
  currency: currency.optional(),
});

// ---- категорії ----
export const categoryCreate = z.object({
  name: text(50, 'Назва'),
  type: transactionType,
  isStorage: z.boolean().optional(),
  householdId: id.optional().nullable(),
  clientId: optText(100),
});
export const categoryUpdate = z.object({
  name: text(50, 'Назва').optional(),
  type: transactionType.optional(),
  isStorage: z.boolean().optional(),
});

// ---- транзакції ----
export const transactionCreate = z.object({
  clientId: optText(100),
  accountId: id,
  categoryId: id,
  type: transactionType,
  amount: positiveMoney,
  transactionDate: dateString,
  description: optText(255),
  receiptUrl: optText(500),
});
export const transactionUpdate = transactionCreate.partial();

export const transfer = z.object({
  fromAccountId: id,
  toAccountId: id,
  amount: positiveMoney,
  description: optText(255),
  date: dateString.optional().nullable(),
}).refine((d) => d.fromAccountId !== d.toAccountId, 'Рахунки відправника й отримувача мають відрізнятися');

// ---- параметри адреси (query) ----
export const transactionsQuery = z.object({
  accountId: id.optional(),
  page: z.coerce.number().int().min(1, 'Сторінка починається з 1').optional(),
  limit: z.coerce.number().int().min(1, 'Мінімум 1 запис').max(500, 'Максимум 500 записів на сторінку').optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});
export const summaryQuery = z.object({
  accountId: id.optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});
export const statsQuery = z.object({
  startDate: dateString,
  endDate: dateString,
  type: transactionType.optional(),
});

// ---- бюджети ----
export const budgetSet = z.object({
  categoryId: id,
  maxAmount: z.coerce.number().min(0, 'Ліміт не може бути від’ємним').max(1e12, 'Занадто великий ліміт'),
  month: z.coerce.number().int().min(1, 'Місяць від 1 до 12').max(12, 'Місяць від 1 до 12'),
  year: z.coerce.number().int().min(2000, 'Некоректний рік').max(2100, 'Некоректний рік'),
  isPersonal: z.boolean().optional(),
  clientId: optText(100),
});
export const budgetsQuery = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

// ---- родини ----
export const householdCreate = z.object({ name: text(50, 'Назва'), clientId: optText(100) });
export const householdJoin = z.object({ inviteCode: text(30, 'Код запрошення') });

// ---- AI-помічник ----
// Історія чату: до 10 повідомлень, останнє — від користувача. Відповіді помічника можуть бути довгими.
export const aiChat = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: text(4000, 'Повідомлення'),
  })).min(1, 'Потрібне хоча б одне повідомлення').max(10, 'Забагато повідомлень в історії'),
}).refine((d) => d.messages.at(-1)?.role === 'user', 'Останнє повідомлення має бути від користувача');

export const aiParse = z.object({
  text: text(300, 'Текст'),
});
