export default function TransactionFilters({ filters, setFilters, accounts, categories }) {
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  return (
    <div className="filters">
      <input type="search" placeholder="Пошук за описом чи категорією" value={filters.search} onChange={set("search")} />
      <input type="date" value={filters.from} onChange={set("from")} aria-label="Від" />
      <input type="date" value={filters.to} onChange={set("to")} aria-label="До" />
      <select value={filters.accountId} onChange={set("accountId")} aria-label="Рахунок">
        <option value="">Усі рахунки</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={filters.type} onChange={set("type")} aria-label="Тип">
        <option value="">Усі типи</option><option value="EXPENSE">Витрати</option><option value="INCOME">Доходи</option>
      </select>
      <select value={filters.categoryId} onChange={set("categoryId")} aria-label="Категорія">
        <option value="">Усі категорії</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="ghost" onClick={() => setFilters({ from: "", to: "", accountId: "", type: "", categoryId: "", search: "" })}>Скинути</button>
    </div>
  );
}
