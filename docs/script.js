"use strict";

// Дані живуть лише в пам'яті сторінки (у л/р 2-3 їх замінить запит до API).
let expenses = [
  { id: 1, title: "Продукти в супермаркеті", amount: 842.5, category: "Продукти", date: "2026-06-24" },
  { id: 2, title: "Проїзд", amount: 120, category: "Транспорт", date: "2026-06-25" },
  { id: 3, title: "Кінотеатр", amount: 260, category: "Дозвілля", date: "2026-06-26" },
];
let nextId = 4;

const form = document.getElementById("expense-form");
const rowsEl = document.getElementById("rows");
const emptyEl = document.getElementById("empty");
const totalEl = document.getElementById("total");
const barsEl = document.getElementById("bars");
const errorEl = document.getElementById("form-error");
const dateInput = document.getElementById("date");

const money = new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH" });
const dateFmt = new Intl.DateTimeFormat("uk-UA");

dateInput.value = new Date().toISOString().slice(0, 10);

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text; // textContent: захист від XSS
  if (className) node.className = className;
  return node;
}

function render() {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  rowsEl.replaceChildren(...sorted.map((e) => {
    const tr = document.createElement("tr");
    const del = el("button", "Видалити");
    del.type = "button";
    del.setAttribute("aria-label", `Видалити витрату «${e.title}»`);
    del.addEventListener("click", () => removeExpense(e.id));
    const last = document.createElement("td");
    last.append(del);
    tr.append(
      el("td", dateFmt.format(new Date(e.date))),
      el("td", e.title),
      el("td", e.category),
      el("td", money.format(e.amount), "num"),
      last
    );
    return tr;
  }));
  emptyEl.hidden = expenses.length > 0;

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  totalEl.textContent = money.format(total);

  const byCat = {};
  expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  barsEl.replaceChildren(...Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, sum]) => {
      const li = document.createElement("li");
      const track = el("span", undefined, "track");
      const fill = el("span", undefined, "fill");
      fill.style.width = `${total ? (sum / total) * 100 : 0}%`;
      track.append(fill);
      li.append(el("span", cat), el("span", money.format(sum), "sum"), track);
      return li;
    }));
}

function removeExpense(id) {
  expenses = expenses.filter((e) => e.id !== id);
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = form.title.value.trim();
  const amount = parseFloat(form.amount.value);
  const date = form.date.value;

  if (!title) return showError("Введіть назву витрати.", form.title);
  if (!(amount > 0)) return showError("Сума має бути більшою за нуль.", form.amount);
  if (!date) return showError("Оберіть дату.", form.date);

  errorEl.hidden = true;
  expenses.push({ id: nextId++, title, amount, category: form.category.value, date });
  form.title.value = "";
  form.amount.value = "";
  form.title.focus();
  render();
});

function showError(message, field) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  field.focus();
}

render();
