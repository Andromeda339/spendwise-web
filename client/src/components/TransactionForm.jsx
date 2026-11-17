import { useEffect, useState } from "react";
import { api } from "../api";
import { todayISO } from "../format";
import { loadJSON, removeKey, saveJSON } from "../storage";
import { validateTransaction } from "../validators";
import Field from "./Field.jsx";

const DRAFT_KEY = "sw.draft";

export default function TransactionForm({ accounts, categories, onCreated }) {
  // Чернетка форми відновлюється з localStorage (дата завжди сьогоднішня)
  const [f, setF] = useState(() => ({
    type: "EXPENSE", accountId: "", categoryId: "", amount: "", description: "", ...loadJSON(DRAFT_KEY, {}), date: todayISO(),
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { type, accountId, categoryId, amount, description } = f;
    saveJSON(DRAFT_KEY, { type, accountId, categoryId, amount, description });
  }, [f]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === "type" ? { categoryId: "" } : {}) });

  const options = categories.filter((c) => c.type === f.type && !c.isStorage);
  // Значення з чернетки можуть бути застарілими (рахунок чи категорію видалено)
  const accountId = accounts.some((a) => String(a.id) === f.accountId) ? f.accountId : String(accounts[0]?.id ?? "");
  const categoryId = options.some((c) => String(c.id) === f.categoryId) ? f.categoryId : "";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const found = validateTransaction({ ...f, accountId, categoryId });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      // id рахунку й категорії бекенд очікує як числа
      await api.createTransaction({
        accountId: Number(accountId), categoryId: Number(categoryId), type: f.type,
        amount: Number(f.amount), transactionDate: f.date, description: f.description.trim(),
      });
      removeKey(DRAFT_KEY);
      setF({ ...f, amount: "", description: "" });
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>Нова транзакція</h2>
      <div className="seg">
        {[["EXPENSE", "Витрата"], ["INCOME", "Дохід"]].map(([v, l]) => (
          <button type="button" key={v} className={f.type === v ? "on" : ""} onClick={() => set("type")({ target: { value: v } })}>{l}</button>
        ))}
      </div>
      <Field label="Рахунок" error={errors.accountId}>
        <select value={accountId} onChange={set("accountId")} aria-invalid={!!errors.accountId}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Категорія" error={errors.categoryId}>
        <select value={categoryId} onChange={set("categoryId")} aria-invalid={!!errors.categoryId}>
          <option value="">Оберіть…</option>
          {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="two">
        <Field label="Сума, грн" error={errors.amount}>
          <input type="number" step="0.01" value={f.amount} onChange={set("amount")} aria-invalid={!!errors.amount} />
        </Field>
        <Field label="Дата" error={errors.date}>
          <input type="date" value={f.date} onChange={set("date")} aria-invalid={!!errors.date} />
        </Field>
      </div>
      <Field label="Опис" error={errors.description}>
        <input value={f.description} onChange={set("description")} maxLength={255} placeholder="Необов’язково" aria-invalid={!!errors.description} />
      </Field>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Збереження…" : "Додати"}</button>
      <p className="hint">Чернетка зберігається в браузері автоматично.</p>
    </form>
  );
}
