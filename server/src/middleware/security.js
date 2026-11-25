import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Дозволені адреси вебклієнта (через кому в .env). Власну адресу сервера додаємо для Swagger UI:
// локально це localhost, на Render платформа сама задає RENDER_EXTERNAL_URL (публічна адреса сервісу).
const allowedOrigins = [
  ...(process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  `http://localhost:${process.env.PORT || 5000}`,
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

// Захисні HTTP-заголовки (X-Content-Type-Options, Strict-Transport-Security тощо, прибирає X-Powered-By)
export const securityHeaders = helmet();

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Запити без Origin (Postman, мобільний застосунок) не належать браузеру, політика CORS до них не застосовується
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const err = new Error('Джерело запиту не дозволене політикою CORS');
    err.status = 403;
    err.expose = true;
    callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

const limiter = (limit, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-6', // заголовки RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset
  legacyHeaders: false,
  message: { error: message },
});

export const apiLimiter = limiter(Number(process.env.RATE_LIMIT_MAX) || 600, 'Забагато запитів. Спробуйте пізніше.');
export const authLimiter = limiter(60, 'Забагато спроб входу. Спробуйте пізніше.');
export const scanLimiter = limiter(20, 'Забагато спроб сканування чеків. Спробуйте пізніше.');
// Квота безкоштовного Gemini обмежена, тому запити до AI-помічника лімітуємо суворіше (змінна AI_RATE_LIMIT)
export const aiLimiter = limiter(Number(process.env.AI_RATE_LIMIT) || 30, 'Забагато запитів до AI-помічника. Спробуйте за кілька хвилин.');
