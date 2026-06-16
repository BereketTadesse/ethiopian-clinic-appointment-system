import dotenv from 'dotenv';
import path from 'path';

// Resolve project root relative to the current working directory (services/user-service)
// This makes loading .env robust whether nodemon/node is started from the service folder.
const envPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });
