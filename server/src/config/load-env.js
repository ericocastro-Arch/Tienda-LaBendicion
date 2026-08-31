import dotenv from 'dotenv';
import { resolve } from 'node:path';

// The workspace keeps its runtime configuration at the repository root.
// Resolve it from the current working directory (server/ when running the workspace)
// so both `npm run dev --workspace server`, Jest and direct execution work.
export function loadEnv() {
  const envPath = resolve(process.cwd(), '../../../.env');
  dotenv.config({ path: envPath });
}
