// Перевірка даних форм на клієнті. Сервер перевіряє їх повторно, але користувач одразу бачить підказки.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateLogin = ({ email, password }) => {
  const e = {};
  if (!EMAIL.test(email.trim())) e.email = "Введіть коректну адресу пошти";
  if (password.length < 6) e.password = "Пароль має містити щонайменше 6 символів";
  return e;
};

export const validateAccount = ({ name, balance }) => {
  const e = {};
  if (!name.trim()) e.name = "Введіть назву рахунку";
  else if (name.trim().length > 50) e.name = "Назва не довша за 50 символів";
  if (balance !== "" && !Number.isFinite(Number(balance))) e.balance = "Баланс має бути числом";
  return e;
};

export const validateTransaction = ({ accountId, categoryId, amount, date, description }) => {
  const e = {};
  if (!accountId) e.accountId = "Спершу створіть рахунок";
  if (!categoryId) e.categoryId = "Оберіть категорію";
  const n = Number(amount);
  if (amount === "" || !Number.isFinite(n)) e.amount = "Введіть суму";
  else if (n <= 0) e.amount = "Сума має бути більшою за нуль";
  else if (n > 1e9) e.amount = "Занадто велика сума";
  if (!date) e.date = "Оберіть дату";
  if (description.length > 255) e.description = "Опис не довший за 255 символів";
  return e;
};

export const validateBudget = ({ categoryId, maxAmount }) => {
  const e = {};
  if (!categoryId) e.categoryId = "Оберіть категорію";
  if (maxAmount === "" || !Number.isFinite(Number(maxAmount)) || Number(maxAmount) <= 0) e.maxAmount = "Введіть ліміт більший за нуль";
  return e;
};

// Текст для AI-помічника: непорожній і не довший за ліміт (повертає текст помилки або порожній рядок)
export const validateAiText = (text, max) => {
  const t = text.trim();
  if (!t) return "Напишіть текст";
  if (t.length > max) return `Текст не довший за ${max} символів`;
  return "";
};
