import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import * as yaml from 'js-yaml';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import householdRoutes from './routes/householdRoutes.js';
import './config/firebase.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Специфікація OpenAPI (файл openapi.yaml у корені серверу)
const openApiSpec = yaml.load(fs.readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));

// Мідлвари
app.use(express.json());
app.use(cors({
  origin: '*', // для розробки; у лабораторній №4 обмежимо адресами клієнта
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Перевірка стану сервера та документація API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get('/api-docs.json', (req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Маршрути
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/households', householdRoutes);

app.listen(PORT, () => {
  console.log(`Сервер SpendWise запущено на порту ${PORT}`);
  console.log(`Документація API: http://localhost:${PORT}/api-docs`);
});
