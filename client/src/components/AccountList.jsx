import { useState } from "react";
import { api } from "../api";
import { ACCOUNT_TYPES, money } from "../format";
import { validateAccount } from "../validators";
import Field from "./Field.jsx";

const empty = { name: "", type: "CARD", balance: "0" };

export default function AccountList({ accounts, onChanged }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateAccount(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setError("");
    try {
      await api.createAccount({ name: form.name.trim(), type: form.type, balance: Number(form.balance) || 0, currency: "UAH" });
      setForm(empty);
      setOpen(false);
      onChanged();
    } catch (err) { setError(err.message); }
  };

  return (
    <section className="card">
      <div className="row between">
        <h2>Рахунки</h2>
        <button className="ghost" onClick={() => setOpen(!open)}>{open ? "Скасувати" : "+ Додати рахунок"}</button>
      </div>
      {open && (
        <form className="inline" onSubmit={submit} noValidate>
          <Field label="Назва" error={errors.name}>
            <input value={form.name} onChange={set("name")} maxLength={50} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Тип">
            <select value={form.type} onChange={set("type")}>
              {Object.entries(ACCOUNT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Початковий баланс" error={errors.balance}>
            <input type="number" step="0.01" value={form.balance} onChange={set("balance")} aria-invalid={!!errors.balance} />
          </Field>
          <button>Створити</button>
          {error && <p className="error">{error}</p>}
        </form>
      )}
      {accounts.length === 0 ? <p className="muted">Рахунків ще немає. Додайте перший.</p> : (
        <ul className="accounts">
          {accounts.map((a) => (
            <li key={a.id}><span>{a.name}<small>{ACCOUNT_TYPES[a.type] || a.type}</small></span><strong>{money(a.balance, a.currency)}</strong></li>
          ))}
        </ul>
      )}
    </section>
  );
}
