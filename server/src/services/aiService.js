// Виклик Google Gemini через REST. SDK не потрібен: достатньо fetch (є у Node 20+).
// Ключ береться лише зі змінної оточення на сервері й ніколи не потрапляє до клієнта.

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const getModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;
// GEMINI_API_BASE потрібна лише для автоматичних тестів із підміною сервера
const apiBase = () => process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta/models';

// Помилка, повідомлення якої безпечно показати користувачу (її обробляє errorHandler)
const fail = (status, message) => Object.assign(new Error(message), { status, expose: true });

// Повертає { text, tokens }. Усі збої перетворюються на зрозумілі повідомлення українською,
// а технічні подробиці (відповідь Google) потрапляють лише в журнал сервера.
export async function generate({ system, contents, temperature = 0.3, maxOutputTokens = 1500 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail(503, 'AI-помічник не налаштований на сервері.');

  const model = getModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 60000);

  let res;
  try {
    res = await fetch(`${apiBase()}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw fail(504, 'AI-сервіс не відповів вчасно. Спробуйте ще раз.');
    }
    console.error('Gemini network error:', err?.message || err);
    throw fail(502, 'Не вдалося з’єднатися з AI-сервісом. Спробуйте пізніше.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`Gemini API ${res.status} ${data?.error?.status || ''}: ${String(data?.error?.message || '').slice(0, 200)}`);
    if (res.status === 429) throw fail(429, 'AI-помічник тимчасово перевантажений (вичерпано ліміт запитів). Спробуйте за хвилину.');
    if (res.status === 404) throw fail(502, 'Модель AI недоступна на сервері.');
    if ([400, 401, 403].includes(res.status)) throw fail(502, 'AI-сервіс відхилив запит. Перевірте ключ і налаштування на сервері.');
    throw fail(502, 'AI-сервіс тимчасово недоступний. Спробуйте пізніше.');
  }

  if (data.promptFeedback?.blockReason) throw fail(422, 'AI-помічник не може відповісти на цей запит.');

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();

  if (!text) {
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
      throw fail(422, 'AI-помічник не може відповісти на цей запит.');
    }
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw fail(502, 'AI-помічник не встиг сформувати відповідь. Спробуйте коротше запитання.');
    }
    throw fail(502, 'AI-сервіс повернув порожню відповідь. Спробуйте ще раз.');
  }

  return { text, tokens: data.usageMetadata?.totalTokenCount ?? null };
}
