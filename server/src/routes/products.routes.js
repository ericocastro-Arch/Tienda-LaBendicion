import { Router } from 'express';
import {
  getProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  toggleProductStatus,
  getCategories,
  createCategory,
} from '../controllers/products.controller.js';
import { authRequired, requireRole } from '../middlewares/auth.js';
import { productValidators, categoryValidators, handleValidationErrors } from '../middlewares/validate.js';

const router = Router();

router.use(authRequired);

// Categorías
router.get('/categories', getCategories);
router.post('/categories', requireRole('ADMIN'), categoryValidators, handleValidationErrors, createCategory);

// Consulta de productos (Cajeros y Administradores)
router.get('/', getProducts);
router.get('/barcode/:code', getProductByBarcode);

// Modificación de productos (Solo Administradores)
router.post('/', requireRole('ADMIN'), productValidators, handleValidationErrors, createProduct);
router.patch('/:id/toggle', requireRole('ADMIN'), toggleProductStatus);
router.patch('/:id', requireRole('ADMIN'), updateProduct);

export default router;