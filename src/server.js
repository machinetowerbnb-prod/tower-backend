import 'dotenv/config';
import app from './app.js';
import { initDb } from './db.js';

const port = Number(process.env.PORT || 8080);

initDb()
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch((e) => { console.error('DB init failed:', e); process.exit(1); });