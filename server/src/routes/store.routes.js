import { Router } from 'express';
import {
  getStoreSettings,
  updateStoreSettings,
  exportDatabaseBackup,
  getSystemInfo,
} from '../controllers/store.controller.js';
import { authRequired, requireRole } from '../middlewares/auth.js';
import { storeValidators, handleValidationErrors } from '../middlewares/validate.js';

const router = Router();

router.use(authRequired);

router.get('/', getStoreSettings);
router.get('/info', getSystemInfo);
router.put('/', requireRole('ADMIN'), storeValidators, handleValidationErrors, updateStoreSettings);
router.get('/backup', requireRole('ADMIN'), exportDatabaseBackup);

export default router;