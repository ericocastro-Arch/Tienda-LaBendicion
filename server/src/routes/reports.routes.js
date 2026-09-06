import { Router } from 'express';
import {
  getSummaryReport,
  getDailySalesReport,
  getMonthlySalesReport,
  getTopSellingProducts,
  getInventoryReport,
  getForecastReport,
} from '../controllers/reports.controller.js';
import { authRequired, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authRequired, requireRole('ADMIN'));

router.get('/summary', getSummaryReport);
router.get('/sales/daily', getDailySalesReport);
router.get('/sales/monthly', getMonthlySalesReport);
router.get('/products/top', getTopSellingProducts);
router.get('/inventory', getInventoryReport);
router.get('/forecast', getForecastReport);

export default router;