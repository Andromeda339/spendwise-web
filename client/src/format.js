// Decimal з PostgreSQL приходить рядком, тому завжди перетворюємо в число.
export const num = (v) => parseFloat(v) || 0;
export const money = (v, currency = "UAH") =>
  new Intl.NumberFormat("uk-UA", { style: "currency", currency }).format(num(v));
// Мобільний застосунок записує перекази як дві звичайні транзакції з маркером у описі.
export const isTransfer = (t) => t.isTransfer || /^\[TRANSFER:/.test(t.description || "");
export const cleanDesc = (d) => (d || "").replace(/^\[TRANSFER:[^\]]*\]\s*/, "");
export const day = (iso) => new Date(iso).toLocaleDateString("uk-UA", { timeZone: "UTC" });
export const todayISO = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
export const ACCOUNT_TYPES = { CASH: "Готівка", CARD: "Картка", DEPOSIT: "Депозит", JAR: "Банка", OTHER: "Інше" };
