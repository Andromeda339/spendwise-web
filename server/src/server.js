import fs from 'node:fs';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'js-yaml';
import './config/firebase.js';
import { prisma } from './config/db.js';
import { corsMiddleware, securityHeaders, apiLimiter, authLimiter } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errors.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import householdRoutes from './routes/householdRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// За reverse-proxy (наприклад, на Render) потрібно довіряти заголовку X-Forwarded-For: TRUST_PROXY=1
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// Логування запитів: метод, шлях, статус і час відповіді (видно у вкладці Logs на Render).
// /health і Swagger UI не логуємо: Render опитує /health кожні кілька секунд, і він засмічував би журнал.
app.use((req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/api-docs')) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(1)} мс`);
  });
  next();
});

const openApiSpec = yaml.load(fs.readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));

// 1. CORS: лише дозволені адреси клієнта
app.use(corsMiddleware);

// 2. Документація підключена до helmet: Swagger UI використовує вбудовані скрипти, які блокує його CSP
app.get('/api-docs.json', (req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// 3. Захисні заголовки, обмеження розміру JSON і частоти запитів
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));

// Легка перевірка «процес живий». Саме її опитує Render (Health Check Path), тому БД тут не чіпаємо:
// відповідь має приходити швидко (ліміт Render — 5 секунд), інакше сервіс буде перезапущено.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Глибша перевірка готовності для власного моніторингу: пінг БД, пам'ять, час роботи.
// Повертає 503, якщо база недоступна або не відповіла за 5 секунд.
app.get('/ready', async (req, res) => {
  const started = process.hrtime.bigint();
  let dbOk = true;
  let timer;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 5000); }),
    ]);
  } catch (err) {
    dbOk = false;
    console.error('Помилка перевірки БД у /ready:', err.message);
  } finally {
    clearTimeout(timer);
  }
  const dbMs = Number(process.hrtime.bigint() - started) / 1e6;
  const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;
  const mem = process.memoryUsage();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ready' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
    database: { status: dbOk ? 'ok' : 'error', responseMs: Math.round(dbMs * 10) / 10 },
    memory: { rssMb: mb(mem.rss), heapUsedMb: mb(mem.heapUsed) },
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiLimiter);

// 4. Маршрути
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/ai', aiRoutes);

// 5. Невідомі маршрути та єдиний обробник помилок (завжди останніми)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер SpendWise запущено на порту ${PORT}`);
  console.log(`Документація API: http://localhost:${PORT}/api-docs`);
});
