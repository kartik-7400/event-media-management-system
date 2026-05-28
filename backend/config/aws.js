import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import dotenv from 'dotenv';

dotenv.config();

const isAwsConfigured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION &&
  process.env.AWS_S3_BUCKET_NAME
);

export const IS_MOCK = !isAwsConfigured;

if (IS_MOCK) {
  console.warn('⚠️ AWS credentials or S3 bucket configuration missing. Running in AWS MOCK mode.');
} else {
  console.log('✅ AWS configuration loaded successfully. AWS S3 & Rekognition active.');
}

const awsCredentials = !IS_MOCK ? {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
} : null;

export const s3Client = !IS_MOCK ? new S3Client(awsCredentials) : null;
export const rekognitionClient = !IS_MOCK ? new RekognitionClient(awsCredentials) : null;
export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'mock-bucket';
export const REKOGNITION_COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'event-media-hub-faces';
