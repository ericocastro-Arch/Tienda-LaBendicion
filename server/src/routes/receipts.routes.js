import { Router } from 'express';
import { getReceiptPdf, getReceiptDetails, getReceiptEscPos } from '../controllers/receipts.controller.js';
import { authRequired } from '../middlewares/auth.js';

const router = Router();

router.use(authRequired);

router.get('/:saleId', getReceiptDetails);
router.get('/:saleId/print', getReceiptDetails);
router.get('/:saleId/pdf', getReceiptPdf);
router.get('/:saleId/escpos', getReceiptEscPos);

export default router;