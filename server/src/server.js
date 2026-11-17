import fs from 'node:fs';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'js-yaml';
import './config/firebase.js';
import { corsMiddleware, securityHeaders, apiLimiter, authLimiter } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errors.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import householdRoutes from './routes/householdRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// За reverse-proxy (наприклад, на Render) потрібно довіряти заголовку X-Forwarded-For: TRUST_PROXY=1
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

const openApiSpec = yaml.load(fs.readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));

// 1. CORS: лише дозволені адреси клієнта
app.use(corsMiddleware);

// 2. Документація підключена до helmet: Swagger UI використовує вбудовані скрипти, які блокує його CSP
app.get('/api-docs.json', (req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// 3. Захисні заголовки, обмеження розміру JSON і частоти запитів
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api', apiLimiter);

// 4. Маршрути
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/households', householdRoutes);

// 5. Невідомі маршрути та єдиний обробник помилок (завжди останніми)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер SpendWise запущено на порту ${PORT}`);
  console.log(`Документація API: http://localhost:${PORT}/api-docs`);
});
