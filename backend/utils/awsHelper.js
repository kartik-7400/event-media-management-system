import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  IndexFacesCommand, 
  SearchFacesByImageCommand, 
  DetectLabelsCommand,
  CreateCollectionCommand,
  DescribeCollectionCommand
} from '@aws-sdk/client-rekognition';
import { s3Client, rekognitionClient, BUCKET_NAME, REKOGNITION_COLLECTION_ID, IS_MOCK } from '../config/aws.js';
import fs from 'fs';
import path from 'path';

// Self-initializing Rekognition Collection if AWS is active
if (!IS_MOCK) {
  (async () => {
    try {
      await rekognitionClient.send(new DescribeCollectionCommand({ CollectionId: REKOGNITION_COLLECTION_ID }));
      console.log(`AWS Rekognition: Face collection '${REKOGNITION_COLLECTION_ID}' exists.`);
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        try {
          await rekognitionClient.send(new CreateCollectionCommand({ CollectionId: REKOGNITION_COLLECTION_ID }));
          console.log(`AWS Rekognition: Created Face Collection '${REKOGNITION_COLLECTION_ID}'.`);
        } catch (createErr) {
          console.error('AWS Rekognition: Failed to create Face Collection', createErr);
        }
      } else {
        console.error('AWS Rekognition: Error checking Face Collection', err);
      }
    }
  })();
}

// Ensure mock uploads directory exists
const UPLOADS_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Generates a presigned URL for S3 upload, or a mock backend route.
 */
export const getUploadPresignedUrl = async (key, contentType) => {
  if (IS_MOCK) {
    // Return mock endpoint path. The client will POST form-data to this endpoint.
    return {
      url: `http://localhost:5001/api/media/mock-upload`,
      key,
      isMock: true,
      fields: { key, 'Content-Type': contentType }
    };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  return { url, key, isMock: false };
};

/**
 * Generates a presigned URL for file download, or a mock public route.
 */
export const getDownloadPresignedUrl = async (key) => {
  if (IS_MOCK) {
    // Return local mock static path
    return `http://localhost:5001/api/media/mock-files/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
};

/**
 * Indexes a profile selfie image in AWS Rekognition.
 * 
 * @param {Buffer} imageBuffer - Face image buffer
 * @param {string} key - Unique key identifier
 */
export const indexFaceSelfie = async (imageBuffer, key) => {
  if (IS_MOCK) {
    const mockFaceId = `mock-face-id-${Math.floor(Math.random() * 10000000)}`;
    console.log(`[MOCK AWS] Indexed face selfie: ${key} -> FaceId: ${mockFaceId}`);
    return mockFaceId;
  }

  try {
    const command = new IndexFacesCommand({
      CollectionId: REKOGNITION_COLLECTION_ID,
      Image: { Bytes: imageBuffer },
      ExternalImageId: key.replace(/[^a-zA-Z0-9_.:=@-]/g, '_'), // Clean characters for external ID
      MaxFaces: 1,
      DetectionAttributes: ['DEFAULT'],
    });

    const response = await rekognitionClient.send(command);
    if (response.FaceRecords && response.FaceRecords.length > 0) {
      return response.FaceRecords[0].Face.FaceId;
    }
    throw new Error('No face detected in selfie');
  } catch (error) {
    console.error('AWS Rekognition IndexFace Error:', error);
    throw error;
  }
};

/**
 * Detects smart category tags (labels) in an image.
 */
export const detectImageLabels = async (imageBuffer) => {
  if (IS_MOCK) {
    const mockLabels = ['crowd', 'sports', 'outdoor', 'people', 'celebration', 'party', 'smile', 'campus'];
    // Randomly select 3 to 5 tags
    const count = 3 + Math.floor(Math.random() * 3);
    const selected = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * mockLabels.length);
      if (!selected.includes(mockLabels[idx])) {
        selected.push(mockLabels[idx]);
      }
    }
    return selected;
  }

  try {
    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 10,
      MinConfidence: 75,
    });

    const response = await rekognitionClient.send(command);
    return response.Labels.map(label => label.Name.toLowerCase());
  } catch (error) {
    console.error('AWS Rekognition DetectLabels Error:', error);
    return ['event']; // Safe fallback
  }
};

/**
 * Searches the faces collection for matching faces in the uploaded image.
 */
export const searchFaces = async (imageBuffer) => {
  if (IS_MOCK) {
    // In mock mode, we return an empty array by default.
    // The media confirm-upload router will map matched user faceIds based on simulated matches.
    return [];
  }

  try {
    // Note: SearchFacesByImage queries the face collection using the image.
    // Returns faces matching faces in the collection.
    const command = new SearchFacesByImageCommand({
      CollectionId: REKOGNITION_COLLECTION_ID,
      Image: { Bytes: imageBuffer },
      MaxFaces: 10,
      FaceMatchThreshold: 85,
    });

    const response = await rekognitionClient.send(command);
    return response.FaceMatches.map(match => match.Face.FaceId);
  } catch (error) {
    console.error('AWS Rekognition SearchFaces Error:', error);
    return [];
  }
};
