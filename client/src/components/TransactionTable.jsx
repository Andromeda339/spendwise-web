import { cleanDesc, day, isTransfer, money } from "../format";

export default function TransactionTable({ items, total, loading, onDelete }) {
  if (loading && items.length === 0) return <p className="muted">Завантаження…</p>;
  if (items.length === 0) return <p className="muted">Транзакцій за цими умовами немає.</p>;
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Дата</th><th>Опис</th><th>Категорія</th><th>Рахунок</th><th className="num">Сума</th><th></th></tr></thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>{day(t.transactionDate)}</td>
                <td>{cleanDesc(t.description) || "—"}</td>
                <td>{isTransfer(t) ? "Переказ" : t.category?.name || "—"}</td>
                <td>{t.account?.name}</td>
                <td className={"num " + (t.type === "INCOME" ? "plus" : "minus")}>
                  {t.type === "INCOME" ? "+" : "−"}{money(t.amount, t.account?.currency)}
                </td>
                <td><button className="ghost danger" onClick={() => onDelete(t.id)} aria-label="Видалити транзакцію">Видалити</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Показано {items.length} із {total} (завантажується до 500 останніх за вибраний період).</p>
    </>
  );
}
