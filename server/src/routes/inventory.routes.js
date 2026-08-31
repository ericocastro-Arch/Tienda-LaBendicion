import { Router } from 'express';
import {
  getInventoryOverview,
  getLowStockProducts,
  registerStockEntry,
  registerStockAdjustment,
  getProductStockHistory,
} from '../controllers/inventory.controller.js';
import { authRequired } from '../middlewares/auth.js';

const router = Router();

router.use(authRequired);

router.get('/', getInventoryOverview);
router.get('/stock-low', getLowStockProducts);
router.get('/history', getProductStockHistory);
router.get('/:productId/history', getProductStockHistory);
router.post('/entries', registerStockEntry);
router.post('/adjustments', registerStockAdjustment);

export default router;