import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { loginValidators, handleValidationErrors } from '../middlewares/validate.js';

const router = Router();

router.post('/login', loginValidators, handleValidationErrors, login);
router.get('/me', authRequired, me);

export default router;