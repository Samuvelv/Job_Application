// src/server.ts
import app from './app';
import { env } from './config/env';
import { db } from './config/db';

async function bootstrap(): Promise<void> {
  try {
    // Verify DB connection
    await db.raw('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');

    const port = Number(env.PORT);
    app.listen(port, () => {
      console.log(`[SERVER] Running on http://localhost:${port} (${env.NODE_ENV})`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();
