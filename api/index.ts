import 'dotenv/config';
import express from 'express';
import { createApiRouter } from '../server/api';

// Vercel serverless entry point. Vercel's zero-config convention treats any
// file under api/ that default-exports an Express app (or a (req,res) handler)
// as a serverless function — this one handles every /api/* route via the same
// router used by the traditional server (see ../server.ts and ../server/api.ts),
// so both hosting targets share one set of routes and bug fixes.
//
// Static assets and the SPA's index.html are NOT served from here: Vercel's
// own static hosting handles those directly (see ../vercel.json), which is
// both simpler and faster than routing them through a function.
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/api', createApiRouter());

export default app;
