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
    const server = app.listen(port, () => {
      console.log(`[SERVER] Running on http://localhost:${port} (${env.NODE_ENV})`);
    });

    // ── Socket timeout configuration for large file uploads ───────────────────
    //
    // Node.js < 18 defaults the server socket timeout to 120 s. A 200 MB video
    // upload on a slow connection easily exceeds 2 minutes, causing Node to close
    // the TCP socket mid-stream. Multer then writes only the bytes received so
    // far, producing a truncated file on disk.
    //
    // We disable the Node-level socket timeout entirely (0 = no timeout) because
    // the Nginx reverse proxy already enforces a 300 s proxy_read_timeout — Nginx
    // will always close the connection first on a genuinely hung request.
    server.setTimeout(0);

    // keepAliveTimeout must be slightly longer than Nginx's proxy_read_timeout
    // (300 s) so that Nginx — not Node — closes idle keep-alive connections.
    // headersTimeout must be > keepAliveTimeout to avoid a race where Node closes
    // the socket before the client finishes sending the request headers.
    server.keepAliveTimeout = 310_000; // 310 s > Nginx 300 s
    server.headersTimeout   = 320_000; // 320 s > keepAliveTimeout

  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();
