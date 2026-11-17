// Безпечна робота з localStorage: якщо сховище недоступне (приватний режим, заборона), застосунок не ламається.
export const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
export const saveJSON = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* сховище недоступне */ }
};
export const removeKey = (key) => {
  try { localStorage.removeItem(key); } catch { /* сховище недоступне */ }
};
