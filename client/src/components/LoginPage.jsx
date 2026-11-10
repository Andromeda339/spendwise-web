import { useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

const ERRORS = {
  "auth/invalid-credential": "Невірна пошта або пароль.",
  "auth/email-already-in-use": "Користувач з такою поштою вже існує.",
  "auth/weak-password": "Пароль має містити щонайменше 6 символів.",
  "auth/invalid-email": "Некоректна адреса пошти.",
};

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); }
    catch (e) { setError(ERRORS[e.code] || "Не вдалося увійти. Спробуйте ще раз."); }
    finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    const fn = mode === "login" ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    run(() => fn(auth, email.trim(), password));
  };

  return (
    <main className="login card">
      <h1>SpendWise</h1>
      <p className="muted">{mode === "login" ? "Увійдіть до свого акаунта" : "Створення акаунта"}</p>
      <form onSubmit={submit}>
        <label>Пошта<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{mode === "login" ? "Увійти" : "Зареєструватися"}</button>
      </form>
      <button className="ghost" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>Увійти через Google</button>
      <button className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Немає акаунта? Зареєструватися" : "Вже є акаунт? Увійти"}
      </button>
    </main>
  );
}
