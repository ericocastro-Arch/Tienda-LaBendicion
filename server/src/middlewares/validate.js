import { body, validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return res.status(400).json({ error: messages[0], errors: messages });
  }
  return next();
}

export const loginValidators = [
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ max: 30 }).withMessage('El usuario no puede exceder 30 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ max: 72 }).withMessage('La contraseña no puede exceder 72 caracteres'),
];

export const saleValidators = [
  body('items')
    .isArray({ min: 1 }).withMessage('El carrito debe contener al menos un producto'),
  body('items.*.product_id')
    .isInt({ min: 1 }).withMessage('Cada producto debe tener un id válido'),
  body('items.*.cantidad')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero positivo'),
  body('descuento')
    .optional()
    .isFloat({ min: 0 }).withMessage('El descuento no puede ser negativo'),
  body('metodo_pago')
    .optional()
    .isIn(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']).withMessage('Método de pago no válido'),
  body('monto_recibido')
    .optional()
    .isFloat({ min: 0 }).withMessage('El monto recibido debe ser un número válido'),
];

export const productValidators = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del producto es obligatorio')
    .isLength({ max: 80 }).withMessage('El nombre no puede exceder 80 caracteres'),
  body('precio_costo')
    .isFloat({ min: 0 }).withMessage('El precio de costo debe ser un número válido mayor o igual a 0'),
  body('precio_venta')
    .isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número válido mayor o igual a 0'),
  body('stock_minimo')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un entero no negativo'),
  body('stock_actual')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock actual debe ser un entero no negativo'),
];

export const employeeValidators = [
  body('rol_id')
    .isInt({ min: 1 }).withMessage('El rol es obligatorio'),
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres'),
  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es obligatorio')
    .isLength({ max: 50 }).withMessage('El apellido no puede exceder 50 caracteres'),
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ max: 30 }).withMessage('El usuario no puede exceder 30 caracteres'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6, max: 72 }).withMessage('La contraseña debe tener entre 6 y 72 caracteres'),
];

export const categoryValidators = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre de la categoría es obligatorio')
    .isLength({ max: 80 }).withMessage('El nombre no puede exceder 80 caracteres'),
];

export const storeValidators = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre de la tienda es obligatorio')
    .isLength({ max: 80 }).withMessage('El nombre no puede exceder 80 caracteres'),
];
