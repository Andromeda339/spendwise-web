import express from 'express';
import { setBudget, getBudgets, deleteBudget } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { budgetSet, budgetsQuery } from '../validation/schemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(budgetSet), setBudget);
router.get('/', validate(budgetsQuery, 'query'), getBudgets);
router.delete('/:id', deleteBudget);

export default router;
