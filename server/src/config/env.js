import { loadEnv } from './load-env.js';

loadEnv();

export const config = {
  port: Number(process.env.PORT || 4000),
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'labendicion',
    password: process.env.DB_PASSWORD || 'labendicion',
    database: process.env.DB_NAME || 'labendicion_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-no-usar-en-produccion',
    ttl: process.env.JWT_TTL || '8h',
  },
  bcryptRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
};
