import dotenv from 'dotenv';
import path from 'path';

// Load env variables from the backend directory explicitly
dotenv.config({ path: path.resolve(path.dirname(''), '.env') });
// Fallback: also load from standard dotenv search path
dotenv.config();
