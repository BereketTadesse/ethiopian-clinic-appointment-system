import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try multiple candidate paths for .env
const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../.env')
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// Fail-fast: Prevent starting up without cryptographic keys configured
const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (process.env.NODE_ENV !== 'test' && !jwtSecret) {
  console.error('❌ FATAL: JWT_ACCESS_SECRET or JWT_SECRET is required to verify authentication tokens. Refusing to boot.');
  process.exit(1);
}

