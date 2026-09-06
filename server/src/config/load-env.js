import dotenv from 'dotenv';
import { resolve } from 'node:path';

// La configuración de ejecución vive en la raíz del monorepo.  Se resuelve
// desde el workspace `server`, que es el directorio usado por npm, Jest y los
// comandos de Prisma del proyecto.
export function loadEnv() {
  const envPath = resolve(process.cwd(), '../.env');
  dotenv.config({ path: envPath });
}
