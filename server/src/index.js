import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] API de La Bendición en http://localhost:${config.port}`);
});
