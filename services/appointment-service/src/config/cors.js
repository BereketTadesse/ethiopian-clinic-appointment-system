// Strict CORS allow-list.
// FRONTEND_URL may hold one or more origins, comma-separated (e.g. "https://app.example.com,https://admin.example.com").
// Localhost origins are only added outside production. Requests with no Origin header
// (curl, Postman, server-to-server) are not affected by CORS and are allowed through.
const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const getAllowedOrigins = () => {
  const origins = parseOrigins(process.env.FRONTEND_URL);
  const defaultLocalOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  for (const local of defaultLocalOrigins) {
    if (!origins.includes(local)) {
      origins.push(local);
    }
  }
  return origins;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (getAllowedOrigins().includes(origin)) return callback(null, true);
    return callback(null, false); // No CORS headers -> the browser blocks the response
  },
  credentials: true
};
