import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_S3_BUCKET_NAME,
  AWS_REKOGNITION_COLLECTION_ID,
  AWS_MOCK
} from './env.js';

const isAwsConfigured = !!(
  AWS_ACCESS_KEY_ID &&
  AWS_SECRET_ACCESS_KEY &&
  AWS_REGION &&
  AWS_S3_BUCKET_NAME
);

export let IS_MOCK = !isAwsConfigured || AWS_MOCK;

export function setMockMode(val) {
  IS_MOCK = val;
}

if (IS_MOCK) {
  console.warn('⚠️ AWS credentials or S3 bucket configuration missing. Running in AWS MOCK mode.');
} else {
  console.log('✅ AWS configuration loaded successfully. AWS S3 & Rekognition active.');
}

const awsCredentials = !IS_MOCK ? {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  }
} : null;

export const s3Client = !IS_MOCK ? new S3Client(awsCredentials) : null;
export const rekognitionClient = !IS_MOCK ? new RekognitionClient(awsCredentials) : null;
export const BUCKET_NAME = AWS_S3_BUCKET_NAME;
export const REKOGNITION_COLLECTION_ID = AWS_REKOGNITION_COLLECTION_ID;
