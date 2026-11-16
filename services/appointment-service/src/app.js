import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import { generalRateLimit } from './middleware/rateLimiter.js';
import cardRoutes from './routes/card.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';

/**
 * The Express application (no DB connection, no listen) so tests can import it directly.
 * Startup lives in index.js.
 */
const app = express();

app.set('trust proxy', 1); // Render / Docker sit behind one proxy hop (correct client IPs for rate limiting)

// Security headers. CSP is disabled because this is a JSON API.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Appointment Service is alive and healthy!' });
});

// Per-IP limit on every API request (the limiter itself is built at startup, after Redis connects)
app.use('/api', generalRateLimit);

app.use('/api/cards', cardRoutes);
app.use('/api/appointments', appointmentRoutes);

// JSON 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler: any error thrown/rejected in a route ends here as JSON
// (Express 5 forwards rejected async handlers automatically) instead of crashing the process.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body.' });
  }
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error('❌ Unhandled route error:', err);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal Server Error' : err.message
  });
});

export default app;
