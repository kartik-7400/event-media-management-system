import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { IS_MOCK } from '../config/aws.js';
import { getUploadPresignedUrl, getDownloadPresignedUrl, detectImageLabels } from '../utils/awsHelper.js';
import { applyWatermark } from '../utils/watermark.js';

dotenv.config();

const UPLOADS_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const runTests = async () => {
  console.log('🧪 Starting Backend Services Validation Tests...');
  console.log('--------------------------------------------');
  console.log(`📡 Mode: ${IS_MOCK ? 'MOCK MODE' : 'AWS S3/REKOGNITION ACTIVE'}`);
  console.log('--------------------------------------------');

  try {
    // 1. Test S3 Presigned URL Generators
    console.log('⏳ 1. Testing Presigned URL Generators...');
    const uploadUrlData = await getUploadPresignedUrl('test-key.jpg', 'image/jpeg');
    console.log('   ✅ Upload URL:', uploadUrlData.url.substring(0, 80) + '...');
    
    const downloadUrl = await getDownloadPresignedUrl('test-key.jpg');
    console.log('   ✅ Download URL:', downloadUrl.substring(0, 80) + '...');

    // 2. Test Sharp Dynamic Watermarking
    console.log('⏳ 2. Testing Sharp Image Watermarking...');
    // Create a 400x300 red image buffer
    const redSquareBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 20, g: 20, b: 30 } // Dark theme bg mock
      }
    })
    .png()
    .toBuffer();

    const watermarkedBuffer = await applyWatermark(
      redSquareBuffer,
      'CS Club',
      'Hackathon 2026',
      'Viewer',
      'Alice'
    );

    const testOutput = path.join(UPLOADS_DIR, 'test-watermarked.png');
    fs.writeFileSync(testOutput, watermarkedBuffer);
    console.log(`   ✅ Dynamic Watermarking applied successfully! Saved to: ${testOutput}`);

    // 3. Test AI Label Detection (Object/Scene auto-tagging)
    console.log('⏳ 3. Testing AI Smart Image Tagging...');
    const tags = await detectImageLabels(redSquareBuffer);
    console.log('   ✅ Detected tags:', tags);

    console.log('--------------------------------------------');
    console.log('🎉 ALL SERVICE TESTS COMPLETED SUCCESSFULLY! 🎉');
  } catch (error) {
    console.error('❌ Service test failed with error:', error);
    process.exit(1);
  }
};

runTests();
