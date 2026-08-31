import { Router } from 'express';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employees.routes.js';
import productRoutes from './products.routes.js';
import inventoryRoutes from './inventory.routes.js';
import salesRoutes from './sales.routes.js';
import receiptRoutes from './receipts.routes.js';
import reportRoutes from './reports.routes.js';
import storeRoutes from './store.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/employees', employeeRoutes);
routes.use('/products', productRoutes);
routes.use('/inventory', inventoryRoutes);
routes.use('/sales', salesRoutes);
routes.use('/receipts', receiptRoutes);
routes.use('/reports', reportRoutes);
routes.use('/store', storeRoutes);