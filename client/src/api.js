import { signOut } from "firebase/auth";
import { auth } from "./firebase";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Усі запити до REST API йдуть з токеном Firebase у заголовку Authorization.
async function request(path, { method = "GET", body, params } = {}) {
  const token = await auth.currentUser?.getIdToken();
  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))
    : "";
  const res = await fetch(BASE + path + query, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  // Сесія недійсна: завершуємо її, і застосунок повертає користувача на екран входу
  if (res.status === 401) {
    await signOut(auth);
    throw new Error("Сесія завершилась. Увійдіть знову.");
  }
  if (!res.ok) {
    // Сервер повертає перелік помилок валідації у полі details
    const details = Array.isArray(data.details) ? data.details.map((d) => `${d.field}: ${d.message}`).join("; ") : "";
    throw new Error(details || data.error || `Помилка сервера (${res.status})`);
  }
  return data;
}

export const api = {
  accounts: () => request("/api/accounts"),
  createAccount: (body) => request("/api/accounts", { method: "POST", body }),
  categories: () => request("/api/categories"),
  transactions: (params) => request("/api/transactions", { params }),
  summary: (params) => request("/api/transactions/summary", { params }),
  createTransaction: (body) => request("/api/transactions", { method: "POST", body }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: "DELETE" }),
  budgets: (params) => request("/api/budgets", { params }),
  setBudget: (body) => request("/api/budgets", { method: "POST", body }),
  deleteBudget: (id) => request(`/api/budgets/${id}`, { method: "DELETE" }),
  // AI-помічник: ключ Gemini зберігається лише на сервері, клієнт звертається до власного API
  aiChat: (messages) => request("/api/ai/chat", { method: "POST", body: { messages } }),
  aiParse: (text) => request("/api/ai/parse", { method: "POST", body: { text } }),
};
