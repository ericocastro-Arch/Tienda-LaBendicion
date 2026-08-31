import { Router } from 'express';
import { createSale, getSales, getSaleById } from '../controllers/sales.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { saleValidators, handleValidationErrors } from '../middlewares/validate.js';

const router = Router();

router.use(authRequired);

router.get('/', getSales);
router.post('/', saleValidators, handleValidationErrors, createSale);
router.get('/:id', getSaleById);

export default router;