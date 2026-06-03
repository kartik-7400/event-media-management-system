import dotenv from 'dotenv';
import path from 'path';

// Load env variables from the backend directory explicitly
dotenv.config({ path: path.resolve(path.dirname(''), '.env') });
// Fallback: also load from standard dotenv search path
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-jwt-key';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event-media-hub';
export const PORT = parseInt(process.env.PORT || '5001', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const AWS_REGION = process.env.AWS_REGION;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'mock-bucket';
export const AWS_REKOGNITION_COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'event-media-hub-faces';
export const AWS_MOCK = process.env.AWS_MOCK === 'true';
