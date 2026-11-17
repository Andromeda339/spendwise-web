import { useState } from "react";
import {
  GoogleAuthProvider, browserLocalPersistence, browserSessionPersistence,
  createUserWithEmailAndPassword, setPersistence, signInWithEmailAndPassword, signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { loadJSON, removeKey, saveJSON } from "../storage";
import { validateLogin } from "../validators";
import Field from "./Field.jsx";

const ERRORS = {
  "auth/invalid-credential": "Невірна пошта або пароль.",
  "auth/email-already-in-use": "Користувач з такою поштою вже існує.",
  "auth/weak-password": "Пароль має містити щонайменше 6 символів.",
  "auth/invalid-email": "Некоректна адреса пошти.",
  "auth/too-many-requests": "Забагато спроб. Зачекайте й спробуйте ще раз.",
};

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(() => loadJSON("sw.email", ""));
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => loadJSON("sw.remember", true));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleRemember = (e) => {
    setRemember(e.target.checked);
    saveJSON("sw.remember", e.target.checked);
  };

  const run = async (action) => {
    setBusy(true); setError("");
    try {
      // «Запам’ятати мене»: сесія зберігається між запусками браузера або діє лише до закриття вкладки
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await action();
      // У сховище потрапляє лише пошта, пароль не зберігається ніколи
      if (remember && email.trim()) saveJSON("sw.email", email.trim()); else removeKey("sw.email");
    } catch (e) {
      setError(ERRORS[e.code] || "Не вдалося увійти. Спробуйте ще раз.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const found = validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length) return;
    const fn = mode === "login" ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    run(() => fn(auth, email.trim(), password));
  };

  return (
    <main className="login card">
      <h1>SpendWise</h1>
      <p className="muted">{mode === "login" ? "Увійдіть до свого акаунта" : "Створення акаунта"}</p>
      <form onSubmit={submit} noValidate>
        <Field label="Пошта" error={errors.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
        </Field>
        <Field label="Пароль" error={errors.password}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={!!errors.password} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={remember} onChange={toggleRemember} /> Запам’ятати мене на цьому пристрої
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{mode === "login" ? "Увійти" : "Зареєструватися"}</button>
      </form>
      <button className="ghost" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>Увійти через Google</button>
      <button className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); }}>
        {mode === "login" ? "Немає акаунта? Зареєструватися" : "Вже є акаунт? Увійти"}
      </button>
    </main>
  );
}
