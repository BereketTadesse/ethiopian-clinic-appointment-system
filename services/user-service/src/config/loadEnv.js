import dotenv from 'dotenv';
import path from 'path';

// 1. Try loading from monorepo root ../../.env (for local dev started inside services/user-service)
try {
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
} catch (e) {}

// 2. Try loading from service local directory ./.env
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {}

// 3. Default fallback
dotenv.config();

// Fail-fast: Prevent starting up without cryptographic keys configured
const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

if (process.env.NODE_ENV !== 'test' && (!accessSecret || !refreshSecret)) {
  console.error('❌ FATAL: JWT secrets (JWT_ACCESS_SECRET / JWT_SECRET / JWT_REFRESH_SECRET) are missing. Refusing to boot.');
  process.exit(1);
}

