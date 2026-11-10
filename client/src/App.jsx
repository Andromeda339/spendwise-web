import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { api } from "./api";
import { isTransfer, money, num } from "./format";
import LoginPage from "./components/LoginPage.jsx";
import AccountList from "./components/AccountList.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import TransactionFilters from "./components/TransactionFilters.jsx";
import TransactionTable from "./components/TransactionTable.jsx";

const emptyFilters = { from: "", to: "", accountId: "", type: "", categoryId: "", search: "" };

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = ще перевіряємо сесію
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return <p className="center">Завантаження…</p>;
  return user ? <Dashboard user={user} /> : <LoginPage />;
}

function Dashboard({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [tx, setTx] = useState({ data: [], meta: null });
  const [status, setStatus] = useState({ loading: true, error: "" });

  // Період і рахунок фільтрує сервер, решту (тип, категорія, пошук) — клієнт.
  const reload = useCallback(async () => {
    setStatus((s) => ({ ...s, loading: true, error: "" }));
    const range = {
      accountId: filters.accountId,
      startDate: filters.from && `${filters.from}T00:00:00.000Z`,
      endDate: filters.to && `${filters.to}T23:59:59.999Z`,
    };
    try {
      const [a, c, list] = await Promise.all([
        api.accounts(), api.categories(), api.transactions({ ...range, limit: 500 }),
      ]);
      setAccounts(a); setCategories(c); setTx(list);
      setStatus({ loading: false, error: "" });
    } catch (e) {
      setStatus({ loading: false, error: e.message });
    }
  }, [filters.accountId, filters.from, filters.to]);

  useEffect(() => { reload(); }, [reload]);

  const q = filters.search.trim().toLowerCase();
  const visible = tx.data.filter((t) =>
    (!filters.type || t.type === filters.type) &&
    (!filters.categoryId || String(t.categoryId) === filters.categoryId) &&
    (!q || (t.description || "").toLowerCase().includes(q) || (t.category?.name || "").toLowerCase().includes(q)));

  // Перекази між рахунками не є доходами чи витратами, тому в підсумки не входять.
  const real = tx.data.filter((t) => !isTransfer(t));
  const sumOf = (type) => real.filter((t) => t.type === type).reduce((s, t) => s + num(t.amount), 0);
  const summary = { totalIncome: sumOf("INCOME"), totalExpense: sumOf("EXPENSE") };
  summary.netBalance = summary.totalIncome - summary.totalExpense;

  const remove = async (id) => {
    if (!window.confirm("Видалити транзакцію? Баланс рахунку буде скориговано.")) return;
    try { await api.deleteTransaction(id); await reload(); }
    catch (e) { setStatus((s) => ({ ...s, error: e.message })); }
  };

  const balance = accounts.filter((a) => a.currency === "UAH").reduce((s, a) => s + num(a.balance), 0);

  return (
    <div className="page">
      <header className="top">
        <h1>SpendWise</h1>
        <div className="user"><span>{user.email}</span><button className="ghost" onClick={() => signOut(auth)}>Вийти</button></div>
      </header>

      {status.error && <p className="error banner" role="alert">{status.error} <button className="ghost" onClick={reload}>Повторити</button></p>}

      <section className="stats">
        <div><span>Загальний баланс</span><strong>{money(balance)}</strong></div>
        <div><span>Доходи</span><strong className="plus">{money(summary.totalIncome)}</strong></div>
        <div><span>Витрати</span><strong className="minus">{money(summary.totalExpense)}</strong></div>
        <div><span>Різниця за період</span><strong>{money(summary.netBalance)}</strong></div>
      </section>

      <AccountList accounts={accounts} onChanged={reload} />

      <div className="grid">
        <TransactionForm accounts={accounts} categories={categories} onCreated={reload} />
        <section className="card">
          <h2>Транзакції</h2>
          <TransactionFilters filters={filters} setFilters={setFilters} accounts={accounts} categories={categories} />
          <TransactionTable items={visible} total={tx.meta?.totalItems ?? 0} loading={status.loading} onDelete={remove} />
        </section>
      </div>
    </div>
  );
}
