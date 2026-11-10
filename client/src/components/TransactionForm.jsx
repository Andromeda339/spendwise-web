import { useState } from "react";
import { api } from "../api";
import { todayISO } from "../format";

export default function TransactionForm({ accounts, categories, onCreated }) {
  const [f, setF] = useState({ type: "EXPENSE", accountId: "", categoryId: "", amount: "", date: todayISO(), description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === "type" ? { categoryId: "" } : {}) });

  const accountId = f.accountId || String(accounts[0]?.id ?? "");
  const options = categories.filter((c) => c.type === f.type && !c.isStorage);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!accountId) return setError("Спершу створіть рахунок.");
    if (!f.categoryId) return setError("Оберіть категорію.");
    if (!(Number(f.amount) > 0)) return setError("Сума має бути більшою за нуль.");
    setBusy(true);
    try {
      // id рахунку й категорії бекенд очікує як числа
      await api.createTransaction({
        accountId: Number(accountId), categoryId: Number(f.categoryId), type: f.type,
        amount: Number(f.amount), transactionDate: f.date, description: f.description.trim(),
      });
      setF({ ...f, amount: "", description: "" });
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Нова транзакція</h2>
      <div className="seg">
        {[["EXPENSE", "Витрата"], ["INCOME", "Дохід"]].map(([v, l]) => (
          <button type="button" key={v} className={f.type === v ? "on" : ""} onClick={() => set("type")({ target: { value: v } })}>{l}</button>
        ))}
      </div>
      <label>Рахунок
        <select value={accountId} onChange={set("accountId")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </label>
      <label>Категорія
        <select value={f.categoryId} onChange={set("categoryId")}>
          <option value="">Оберіть…</option>
          {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="two">
        <label>Сума, грн<input type="number" min="0.01" step="0.01" value={f.amount} onChange={set("amount")} /></label>
        <label>Дата<input type="date" value={f.date} onChange={set("date")} /></label>
      </div>
      <label>Опис<input value={f.description} onChange={set("description")} maxLength={120} placeholder="Необов’язково" /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Збереження…" : "Додати"}</button>
    </form>
  );
}
