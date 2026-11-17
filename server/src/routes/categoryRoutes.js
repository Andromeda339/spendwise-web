import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { categoryCreate, categoryUpdate } from '../validation/schemas.js';

const router = express.Router();

router.use(protect);

router.get('/', getCategories);
router.post('/', validate(categoryCreate), createCategory);
router.put('/:id', validate(categoryUpdate), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
