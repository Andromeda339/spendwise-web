import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { validateAiText, validateTransaction } from "../validators";
import Field from "./Field.jsx";

const CHAT_MAX = 500;
const PARSE_MAX = 300;
const SLOW_MS = 8000;
const SUGGESTIONS = [
  "На що я витратив найбільше цього місяця?",
  "Чи вкладаюсь я у свої бюджети?",
  "Порівняй витрати з минулим місяцем",
  "Де мені можна заощадити?",
];

// Якщо запит триває довго, безкоштовний сервер, імовірно, «прокидається» після простою
function useSlowHint(busy) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) { setSlow(false); return undefined; }
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [busy]);
  return slow;
}

function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slow = useSlowHint(busy);
  const boxRef = useRef(null);

  // Прокручуємо лише саме вікно чату, а не всю сторінку
  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, busy]);

  const send = async (text, base = messages) => {
    if (busy) return;
    const content = text.trim();
    const problem = validateAiText(content, CHAT_MAX);
    if (problem) { setError(problem); return; }
    const next = [...base, { role: "user", content }];
    setMessages(next); setInput(""); setError(""); setBusy(true);
    try {
      // Серверу йде останні 10 повідомлень, історія має починатися з повідомлення користувача
      const history = next.slice(-10);
      while (history[0]?.role === "assistant") history.shift();
      const { reply } = await api.aiChat(history);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const lastIsUser = messages.at(-1)?.role === "user";
  const retry = () => send(messages.at(-1).content, messages.slice(0, -1));
  const clear = () => { setMessages([]); setError(""); };

  return (
    <div className="form">
      <div className="chat" ref={boxRef} role="log" aria-live="polite" aria-label="Діалог з асистентом">
        {messages.length === 0 && <p className="muted">Запитайте про свої витрати, бюджети чи заощадження.</p>}
        {messages.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
        {busy && <div className="bubble assistant typing">Асистент друкує…</div>}
      </div>
      {slow && <p className="hint" role="status">Сервер може відповідати до хвилини після простою. Зачекайте, будь ласка.</p>}
      {error && (
        <p className="error" role="alert">
          {error} {lastIsUser && !busy && <button type="button" className="ghost" onClick={retry}>Повторити</button>}
        </p>
      )}
      <div className="chips">
        {SUGGESTIONS.map((s) => <button type="button" className="ghost" key={s} disabled={busy} onClick={() => send(s)}>{s}</button>)}
      </div>
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }} noValidate>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={CHAT_MAX} placeholder="Ваше запитання…" aria-label="Повідомлення асистенту" />
        <button disabled={busy || !input.trim()}>Надіслати</button>
      </form>
      <div className="row between">
        <span className="hint">{input.length}/{CHAT_MAX}</span>
        <button type="button" className="link" onClick={clear} disabled={busy || messages.length === 0}>Очистити чат</button>
      </div>
    </div>
  );
}

function ParseTab({ accounts, categories, onCreated }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null); // розпізнана транзакція, яку користувач може виправити
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useSlowHint(busy);

  const recognize = async (e) => {
    e.preventDefault();
    setSaved(""); setError("");
    const problem = validateAiText(text, PARSE_MAX);
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      const { parsed, note: aiNote } = await api.aiParse(text.trim());
      setDraft({
        type: parsed.type,
        accountId: parsed.accountId ? String(parsed.accountId) : "",
        categoryId: parsed.categoryId ? String(parsed.categoryId) : "",
        amount: String(parsed.amount),
        date: parsed.date,
        description: parsed.description || "",
      });
      setNote(aiNote || ""); setErrors({});
    } catch (err) { setError(err.message); setDraft(null); }
    finally { setBusy(false); }
  };

  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value, ...(k === "type" ? { categoryId: "" } : {}) });
  const options = draft ? categories.filter((c) => c.type === draft.type && !c.isStorage) : [];

  const save = async () => {
    const found = validateTransaction(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true); setError("");
    try {
      await api.createTransaction({
        accountId: Number(draft.accountId), categoryId: Number(draft.categoryId), type: draft.type,
        amount: Number(draft.amount), transactionDate: draft.date, description: draft.description.trim(),
      });
      setSaved("Транзакцію додано."); setDraft(null); setText(""); setNote("");
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const cancel = () => { setDraft(null); setErrors({}); setNote(""); };

  return (
    <div className="form">
      <form onSubmit={recognize} noValidate>
        <Field label="Опишіть витрату або дохід своїми словами">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={PARSE_MAX} placeholder="Наприклад: вчора купив каву 85 грн з Privat_24" />
        </Field>
        <div className="row between">
          <button disabled={busy || !text.trim()}>{busy && !draft ? "Розпізнаю…" : "Розпізнати"}</button>
          <span className="hint">{text.length}/{PARSE_MAX}</span>
        </div>
      </form>
      {slow && <p className="hint" role="status">Сервер може відповідати до хвилини після простою. Зачекайте, будь ласка.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="success" role="status">{saved}</p>}

      {draft && (
        <div className="draft">
          <h3>Перевірте перед збереженням</h3>
          {note && <p className="hint">Зауваження асистента: {note}</p>}
          <div className="seg">
            {[["EXPENSE", "Витрата"], ["INCOME", "Дохід"]].map(([v, l]) => (
              <button type="button" key={v} className={draft.type === v ? "on" : ""} onClick={() => set("type")({ target: { value: v } })}>{l}</button>
            ))}
          </div>
          <Field label="Рахунок" error={errors.accountId}>
            <select value={draft.accountId} onChange={set("accountId")} aria-invalid={!!errors.accountId}>
              <option value="">Оберіть…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Категорія" error={errors.categoryId}>
            <select value={draft.categoryId} onChange={set("categoryId")} aria-invalid={!!errors.categoryId}>
              <option value="">Оберіть…</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="two">
            <Field label="Сума, грн" error={errors.amount}>
              <input type="number" step="0.01" value={draft.amount} onChange={set("amount")} aria-invalid={!!errors.amount} />
            </Field>
            <Field label="Дата" error={errors.date}>
              <input type="date" value={draft.date} onChange={set("date")} aria-invalid={!!errors.date} />
            </Field>
          </div>
          <Field label="Опис" error={errors.description}>
            <input value={draft.description} onChange={set("description")} maxLength={255} aria-invalid={!!errors.description} />
          </Field>
          <div className="actions">
            <button type="button" onClick={save} disabled={busy}>{busy ? "Збереження…" : "Зберегти"}</button>
            <button type="button" className="ghost" onClick={cancel} disabled={busy}>Скасувати</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiAssistant({ accounts, categories, onCreated }) {
  const [tab, setTab] = useState("chat");
  return (
    <section className="card">
      <div className="row between">
        <h2>AI-асистент</h2>
      </div>
      <div className="seg ai-tabs" role="tablist" aria-label="Режим асистента">
        {[["chat", "Чат"], ["parse", "Додати текстом"]].map(([v, l]) => (
          <button type="button" role="tab" key={v} aria-selected={tab === v} className={tab === v ? "on" : ""} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      <p className="hint">Відповіді формує Google Gemini за зведеними даними ваших витрат. Важливі цифри перевіряйте самі.</p>
      <div role="tabpanel" hidden={tab !== "chat"}><ChatTab /></div>
      <div role="tabpanel" hidden={tab !== "parse"}><ParseTab accounts={accounts} categories={categories} onCreated={onCreated} /></div>
    </section>
  );
}
