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

