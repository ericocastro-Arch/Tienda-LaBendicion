import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { routes } from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.js';
import { sanitizeRequest } from './middlewares/xss.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente de nuevo más tarde.' },
});

export function createApp() {
  const app = express();

  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizeRequest);
  app.use(globalLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', servicio: 'labendicion-pos-api' });
  });

  app.use('/api/auth/login', authLimiter);

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}