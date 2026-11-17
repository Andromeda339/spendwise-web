import express from 'express';
import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount
} from '../controllers/accountController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { accountCreate, accountUpdate } from '../validation/schemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(accountCreate), createAccount);
router.get('/', getAccounts);
router.get('/:id', getAccountById);
router.put('/:id', validate(accountUpdate), updateAccount);
router.delete('/:id', deleteAccount);

export default router;
