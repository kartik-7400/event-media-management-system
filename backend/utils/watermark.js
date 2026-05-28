import sharp from 'sharp';

/**
 * Dynamically overlays a text watermark on an image buffer.
 * 
 * @param {Buffer} imageBuffer - Input image buffer
 * @param {string} clubName - Name of the club hosting the event
 * @param {string} eventName - Name of the event
 * @param {string} userRole - Role of the downloading user
 * @param {string} userName - Name of the downloading user
 * @returns {Promise<Buffer>} Watermarked image buffer
 */
export const applyWatermark = async (imageBuffer, clubName = 'EventMediaHub', eventName = 'Event', userRole = 'Viewer', userName = 'Guest') => {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Create a dynamic SVG overlay text
    const watermarkText = `${clubName.toUpperCase()} - ${eventName} | User: ${userName} (${userRole})`;
    const fontSize = Math.max(14, Math.floor(width / 30));
    
    // An SVG containing repeated diagonal texts or a main central diagonal watermark
    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <style>
          .watermark-main {
            fill: rgba(255, 255, 255, 0.3);
            stroke: rgba(0, 0, 0, 0.2);
            stroke-width: 1px;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: ${fontSize}px;
            font-weight: bold;
            text-anchor: middle;
          }
          .watermark-sub {
            fill: rgba(255, 255, 255, 0.15);
            font-family: Arial;
            font-size: ${Math.floor(fontSize * 0.6)}px;
            text-anchor: middle;
          }
        </style>
        
        <!-- Center Diagonal Watermark -->
        <text x="${width / 2}" y="${height / 2}" class="watermark-main" transform="rotate(-25, ${width / 2}, ${height / 2})">
          ${watermarkText}
        </text>

        <!-- Dynamic Grid of subtle watermarks in corners -->
        <text x="${width * 0.15}" y="${height * 0.15}" class="watermark-sub">PROTECTED MEDIA</text>
        <text x="${width * 0.85}" y="${height * 0.15}" class="watermark-sub">PROTECTED MEDIA</text>
        <text x="${width * 0.15}" y="${height * 0.85}" class="watermark-sub">PROTECTED MEDIA</text>
        <text x="${width * 0.85}" y="${height * 0.85}" class="watermark-sub">PROTECTED MEDIA</text>
      </svg>
    `;

    return await image
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      }])
      .toBuffer();
  } catch (error) {
    console.error('Error applying watermark:', error);
    // Return original buffer as fallback in case of error
    return imageBuffer;
  }
};
