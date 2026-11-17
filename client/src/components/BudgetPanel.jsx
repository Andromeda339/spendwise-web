import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { money, num } from "../format";
import { validateBudget } from "../validators";
import Field from "./Field.jsx";

const currentMonth = () => new Date().toLocaleDateString("sv-SE").slice(0, 7); // YYYY-MM

export default function BudgetPanel({ categories }) {
  const [period, setPeriod] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState({ categoryId: "", maxAmount: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  const [year, month] = period.split("-").map(Number);
  const options = categories.filter((c) => c.type === "EXPENSE" && !c.isStorage);

  const load = useCallback(async () => {
    try { setBudgets(await api.budgets({ month, year })); setError(""); }
    catch (e) { setError(e.message); }
  }, [month, year]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const found = validateBudget(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await api.setBudget({ categoryId: Number(form.categoryId), maxAmount: Number(form.maxAmount), month, year, isPersonal: true });
      setForm({ categoryId: "", maxAmount: "" });
      await load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    try { await api.deleteBudget(id); await load(); } catch (err) { setError(err.message); }
  };

  return (
    <section className="card">
      <div className="row between">
        <h2>Бюджети на місяць</h2>
        <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} aria-label="Місяць" style={{ width: "auto" }} />
      </div>
      <form className="inline budget-form" onSubmit={submit} noValidate>
        <Field label="Категорія" error={errors.categoryId}>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} aria-invalid={!!errors.categoryId}>
            <option value="">Оберіть…</option>
            {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Ліміт, грн" error={errors.maxAmount}>
          <input type="number" step="0.01" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} aria-invalid={!!errors.maxAmount} />
        </Field>
        <button>Зберегти ліміт</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {budgets.length === 0 ? <p className="muted">На цей місяць лімітів немає.</p> : (
        <ul className="budgets">
          {budgets.map((b) => (
            <li key={b.id}>
              <div className="row between">
                <span>{b.category?.name}</span>
                <span>{money(b.spentAmount)} із {money(b.maxAmount)}
                  <button className="ghost danger" onClick={() => remove(b.id)} aria-label={`Видалити ліміт ${b.category?.name}`}>Видалити</button>
                </span>
              </div>
              <div className="bar"><span className={num(b.spentPercentage) > 100 ? "over" : ""} style={{ width: `${Math.min(num(b.spentPercentage), 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
