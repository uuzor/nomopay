import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import usersRouter from './routes/users.js';
import connectRouter from './routes/connect.js';
import productsRouter from './routes/products.js';
import affiliateLinksRouter from './routes/affiliateLinks.js';
import checkoutRouter from './routes/checkout.js';
import webhooksRouter from './routes/webhooks.js';
import analyticsRouter from './routes/analytics.js';
import uploadsRouter from './routes/uploads.js';

const app = express();
const PORT = process.env.PORT ?? 8080;

// Stripe webhooks need raw body — mount before JSON middleware
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

// Global middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// Public routes (no auth required)
app.use('/api/users', usersRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/products', productsRouter); // has both public and protected endpoints

// Protected routes
app.use('/api/connect', requireAuth, connectRouter);
app.use('/api/uploads', requireAuth, uploadsRouter);
app.use('/api/affiliate-links', requireAuth, affiliateLinksRouter);
app.use('/api/analytics', analyticsRouter); // mixed public (click) + protected

// 404 + error handler — must be last
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] SplitLink API running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
});

export default app;
