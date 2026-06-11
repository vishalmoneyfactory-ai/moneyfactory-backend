require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDb = require('./src/config/db');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const webhookRoutes = require('./src/routes/webhook');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
  credentials: true,
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'moneyfactory-backend', timestamp: new Date().toISOString() });
});

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookRoutes);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/api', apiLimiter);

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/courses', require('./src/routes/courses'));
app.use('/api/videos', require('./src/routes/videos'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/coupons', require('./src/routes/coupons'));
app.use('/api/progress', require('./src/routes/progress'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/banners', require('./src/routes/banners'));
app.use('/api/legal', require('./src/routes/legal'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/media', require('./src/routes/media'));

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const port = process.env.PORT || 5000;

connectDb().then(() => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
