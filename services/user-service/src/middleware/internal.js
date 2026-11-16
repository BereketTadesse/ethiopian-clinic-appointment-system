import crypto from 'crypto';

/**
 * Service-to-service only routes: requires the shared INTERNAL_SERVICE_SECRET in the
 * x-internal-service-secret header (constant-time comparison). User tokens are not accepted.
 */
export const requireInternalService = (req, res, next) => {
  const expected = process.env.INTERNAL_SERVICE_SECRET;
  const provided = req.headers['x-internal-service-secret'];
  if (expected && typeof provided === 'string') {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: internal services only.' });
};
