import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiRouter, ensureInitialSync, isCloudConfigured } from './server/api';

// Entry point for a traditional, long-running process: local `npm run dev`,
// and any host that runs `npm start` as a persistent container (this is what
// the AI Studio hosting for this app does). Vercel does NOT use this file —
// its serverless functions run api/index.ts instead, which reuses the exact
// same router from ./server/api so both hosting modes share one set of routes
// and one set of bug fixes.
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use('/api', createApiRouter());

  // Vite middleware for development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Wait for the initial Supabase pull to finish before accepting requests,
  // so the very first login/data request isn't served against a database
  // that hasn't been reconciled with the cloud yet.
  await ensureInitialSync();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MEVAM Kids Server running on http://0.0.0.0:${PORT}`);
    if (!isCloudConfigured()) {
      console.log('Aviso: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados — sincronização em nuvem desativada (dados ficam apenas no servidor local).');
    }
  });
}

startServer();
