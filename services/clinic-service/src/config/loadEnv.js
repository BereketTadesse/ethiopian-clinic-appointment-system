import dotenv from 'dotenv';
import path from 'path';

// 1. Try loading from monorepo root ../../.env (for local dev started inside services/clinic-service)
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
const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (process.env.NODE_ENV !== 'test' && !jwtSecret) {
  console.error('❌ FATAL: JWT_ACCESS_SECRET or JWT_SECRET is required to verify authentication tokens. Refusing to boot.');
  process.exit(1);
}

