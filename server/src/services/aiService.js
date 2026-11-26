// Виклик Google Gemini через REST. SDK не потрібен: достатньо fetch (є у Node 20+).
// Ключ береться лише зі змінної оточення на сервері й ніколи не потрапляє до клієнта.
//
// Стійкість до збоїв Google (503 «high demand», таймаути, вичерпана квота окремої моделі):
//  - тимчасові збої (5xx, мережа, таймаут, порожня відповідь) повторюємо один раз;
//  - якщо модель не відповіла, переходимо на запасні (GEMINI_FALLBACK_MODELS);
//  - сумарний час обмежено (AI_DEADLINE_MS), щоб користувач не чекав хвилинами.

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_FALLBACKS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
export const getModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

// Ланцюжок моделей: основна, далі запасні (порожній GEMINI_FALLBACK_MODELS вимикає запасні)
export const getModelChain = () => {
  const raw = process.env.GEMINI_FALLBACK_MODELS;
  const fallbacks = raw === undefined ? DEFAULT_FALLBACKS : raw.split(',');
  return [...new Set([getModel(), ...fallbacks.map((m) => m.trim()).filter(Boolean)])];
};

// GEMINI_API_BASE потрібна лише для автоматичних тестів із підміною сервера
const apiBase = () => process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta/models';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Помилка, повідомлення якої безпечно показати користувачу (її обробляє errorHandler)
const fail = (status, message) => Object.assign(new Error(message), { status, expose: true });

// Результат однієї спроби: ok, або збій одного з трьох видів:
//  fatal — далі пробувати марно (недійсний ключ, заблокований запит);
//  next  — ця модель не підходить зараз (квота, немає такої моделі), одразу пробуємо наступну;
//  retry — тимчасовий збій: один повтор тієї самої моделі, потім наступна.
const fatal = (error) => ({ ok: false, kind: 'fatal', error });
const next = (error) => ({ ok: false, kind: 'next', error });
const retry = (error) => ({ ok: false, kind: 'retry', error });

const buildBody = ({ model, system, contents, temperature, maxOutputTokens }) => ({
  contents,
  systemInstruction: { parts: [{ text: system }] },
  generationConfig: {
    temperature,
    maxOutputTokens,
    // Моделі 2.5 за замовчуванням «думають», і ці токени з'їли б ліміт відповіді
    ...(/^gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  },
});

async function callOnce(model, key, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  let data;
  try {
    res = await fetch(`${apiBase()}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    data = await res.json().catch((err) => { if (err.name === 'AbortError') throw err; return {}; });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`Gemini [${model}]: немає відповіді за ${timeoutMs} мс`);
      return retry(fail(504, 'AI-сервіс не відповів вчасно. Спробуйте ще раз.'));
    }
    console.error(`Gemini [${model}]: помилка мережі: ${err.message}`);
    return retry(fail(502, 'Не вдалося звернутися до AI-сервісу. Спробуйте пізніше.'));
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const message = String(data?.error?.message || '');
    console.error(`Gemini API [${model}] ${res.status} ${data?.error?.status || ''}: ${message.slice(0, 200)}`);
    if (res.status === 401 || (res.status === 400 && /api key/i.test(message))) {
      return fatal(fail(502, 'AI-сервіс відхилив запит. Перевірте ключ і налаштування на сервері.'));
    }
    if (res.status === 429) return next(fail(429, 'AI-помічник тимчасово перевантажений (вичерпано ліміт запитів). Спробуйте за хвилину.'));
    if (res.status === 404) return next(fail(502, 'Модель AI недоступна на сервері.'));
    if (res.status === 400 || res.status === 403) return next(fail(502, 'AI-сервіс відхилив запит. Перевірте ключ і налаштування на сервері.'));
    return retry(fail(502, 'AI-сервіс тимчасово недоступний. Спробуйте пізніше.'));
  }

  if (data.promptFeedback?.blockReason) return fatal(fail(422, 'AI-помічник не може відповісти на цей запит.'));

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();

  if (!text) {
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
      return fatal(fail(422, 'AI-помічник не може відповісти на цей запит.'));
    }
    if (candidate?.finishReason === 'MAX_TOKENS') return next(fail(502, 'AI-помічник не встиг сформувати відповідь. Спробуйте коротше запитання.'));
    return retry(fail(502, 'AI-сервіс повернув порожню відповідь. Спробуйте ще раз.'));
  }

  return { ok: true, text, tokens: data.usageMetadata?.totalTokenCount ?? null };
}

// Повертає { text, tokens, model }, де model — модель, яка справді відповіла.
// Усі збої перетворюються на зрозумілі повідомлення українською, а технічні подробиці
// (відповіді Google) потрапляють лише в журнал сервера.
export async function generate({ system, contents, temperature = 0.3, maxOutputTokens = 1500 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail(503, 'AI-помічник не налаштований на сервері.');

  const deadline = Date.now() + (Number(process.env.AI_DEADLINE_MS) || 45000);
  const attemptTimeout = Number(process.env.AI_TIMEOUT_MS) || 15000;
  const retryDelay = process.env.AI_RETRY_DELAY_MS === undefined ? 700 : Number(process.env.AI_RETRY_DELAY_MS);
  const chain = getModelChain();

  let lastError = fail(504, 'AI-сервіс не відповів вчасно. Спробуйте ще раз.');
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 1500) throw lastError;

      const result = await callOnce(
        model, key,
        buildBody({ model, system, contents, temperature, maxOutputTokens }),
        Math.min(attemptTimeout, remaining),
      );
      if (result.ok) {
        if (i > 0 || attempt > 1) console.warn(`Gemini: відповідь отримано від ${model} (спроба ${attempt}, запасна модель: ${i > 0 ? 'так' : 'ні'})`);
        return { text: result.text, tokens: result.tokens, model };
      }

      lastError = result.error;
      if (result.kind === 'fatal') throw result.error;
      if (result.kind === 'retry' && attempt === 1) { await sleep(retryDelay); continue; }
      break; // ця модель не відповіла: переходимо до наступної
    }
    if (i < chain.length - 1) console.warn(`Gemini: модель ${model} недоступна, пробую ${chain[i + 1]}`);
  }
  throw lastError;
}
