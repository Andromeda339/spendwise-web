import express from 'express';
import {
  createHousehold,
  joinHousehold,
  getHousehold,
  getStats,
  leaveHousehold
} from '../controllers/householdController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { householdCreate, householdJoin } from '../validation/schemas.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(householdCreate), createHousehold);
router.post('/join', validate(householdJoin), joinHousehold);
router.get('/me', getHousehold);
router.get('/stats', getStats);
router.post('/leave', leaveHousehold);

export default router;
