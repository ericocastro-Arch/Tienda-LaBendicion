import { Router } from 'express';
import {
  getAllEmployees,
  getRoles,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
} from '../controllers/employees.controller.js';
import { authRequired, requireRole } from '../middlewares/auth.js';
import { employeeValidators, handleValidationErrors } from '../middlewares/validate.js';

const router = Router();

// Todas las rutas de empleados requieren autenticación y rol de ADMINISTRADOR
router.use(authRequired, requireRole('ADMIN'));

router.get('/roles', getRoles);
router.get('/', getAllEmployees);
router.post('/', employeeValidators, handleValidationErrors, createEmployee);
router.patch('/:id/toggle', toggleEmployeeStatus);
router.patch('/:id', updateEmployee);

export default router;