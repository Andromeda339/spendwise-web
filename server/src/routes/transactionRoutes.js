import express from 'express';
import {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getStats,
  getSummary,
  exportTransactionsCsv,
  transferFunds,
  uploadReceipt,
  scanReceipt
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload, uploadScan } from '../middleware/uploadMiddleware.js';
import { validate } from '../middleware/validate.js';
import { scanLimiter } from '../middleware/security.js';
import {
  transactionCreate, transactionUpdate, transfer,
  transactionsQuery, summaryQuery, statsQuery
} from '../validation/schemas.js';

const router = express.Router();

// Усі маршрути нижче захищені токеном
router.use(protect);

router.post('/', validate(transactionCreate), createTransaction);
router.get('/', validate(transactionsQuery, 'query'), getTransactions);

// Перекази
router.post('/transfer', validate(transfer), transferFunds);

// Статистика та експорт (перед маршрутами з /:id)
router.get('/stats', validate(statsQuery, 'query'), getStats);
router.get('/summary', validate(summaryQuery, 'query'), getSummary);
router.get('/export', validate(summaryQuery, 'query'), exportTransactionsCsv);

// Сканер чеків: суворіший ліміт запитів, лише зображення до 5 МБ
router.post('/scan', scanLimiter, uploadScan.single('receipt'), scanReceipt);

// Фото чека для транзакції (помилки завантаження обробляє errorHandler)
router.post('/:id/receipt', upload.single('receipt'), uploadReceipt);

router.put('/:id', validate(transactionUpdate), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
