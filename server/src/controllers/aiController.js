import * as transactionService from '../services/transactionService.js';
import * as budgetService from '../services/budgetService.js';
import { getAccountsByUserId } from '../services/accountService.js';
import { getAllCategories } from '../services/categoryService.js';
import { generate } from '../services/aiService.js';
import {
  todayKyiv, monthRange, shapeContext, chatSystemPrompt, toGeminiContents,
  parseSystemPrompt, extractJson, sanitizeParsed,
} from '../services/aiHelpers.js';

// Зведення для чату: підсумки й витрати за категоріями (поточний і минулий місяць), бюджети, рахунки
const buildContext = async (userId, householdId) => {
  const today = todayKyiv();
  const [year, month] = today.split('-').map(Number);

  const period = async (offset) => {
    const r = monthRange(today, offset);
    const [summary, byCategory] = await Promise.all([
      transactionService.getTransactionSummary(userId, householdId, undefined, r.start.toISOString(), r.end.toISOString()),
      transactionService.getTransactionStats(userId, householdId, r.start.toISOString(), r.end.toISOString(), 'EXPENSE'),
    ]);
    return { label: r.label, summary, byCategory };
  };

  const [current, previous, budgets, accounts] = await Promise.all([
    period(0), period(-1),
    budgetService.getBudgets(userId, householdId, month, year),
    getAccountsByUserId(userId),
  ]);
  return shapeContext({ today, current, previous, budgets, accounts });
};

// POST /api/ai/chat: відповідь помічника на запитання про витрати користувача.
// Помилки (ліміт, таймаут, збій AI) обробляє єдиний errorHandler.
export const chat = async (req, res) => {
  const { id: userId, householdId } = req.user;
  const context = await buildContext(userId, householdId);
  const { text, tokens, model } = await generate({
    system: chatSystemPrompt(context),
    contents: toGeminiContents(req.body.messages),
    temperature: 0.3,
    maxOutputTokens: 1500,
  });
  console.log(`AI chat: модель ${model}, токенів ${tokens ?? 'н/д'}`);
  res.json({ reply: text, model });
};

// POST /api/ai/parse: розбір вільного тексту в чернетку транзакції.
// Транзакцію тут НЕ створюємо: клієнт показує результат, і користувач підтверджує його.
export const parseTransaction = async (req, res) => {
  const userId = req.user.id;
  const [accountRows, categoryRows] = await Promise.all([getAccountsByUserId(userId), getAllCategories(userId)]);
  const accounts = accountRows.map((a) => ({ id: a.id, name: a.name }));
  const categories = categoryRows.filter((c) => !c.isStorage).map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const today = todayKyiv();

  const { text, tokens, model } = await generate({
    system: parseSystemPrompt({ today, accounts, categories }),
    contents: [{ role: 'user', parts: [{ text: req.body.text }] }],
    temperature: 0.1,
    maxOutputTokens: 800,
  });
  console.log(`AI parse: модель ${model}, токенів ${tokens ?? 'н/д'}`);

  const result = sanitizeParsed(extractJson(text), { accounts, categories, today, originalText: req.body.text });
  if (result.error) return res.status(422).json({ error: result.error });
  res.json({ parsed: result.parsed, note: result.note, model });
};
