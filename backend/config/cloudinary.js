const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sample',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abcdefg',
});

const { Readable } = require('stream');

// Stream buffer directly to Cloudinary using upload_stream
const streamUpload = (buffer, folder = 'tipped_tickets') => {
  return new Promise((resolve, reject) => {
    // If running in development without valid Cloudinary credentials, provide a safe simulated secure_url
    const isConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'sample' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== '123456789';

    if (!isConfigured) {
      const mockId = Math.random().toString(36).substring(2, 9);
      return resolve({
        secure_url: `https://res.cloudinary.com/demo/image/upload/v1/tipped_tickets/${mockId}.jpg`,
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

// Upload base64 or url directly to Cloudinary
const uploadDirect = async (fileStr, folder = 'tipped_tickets') => {
  const isConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'sample' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== '123456789';

  if (!isConfigured) {
    const mockId = Math.random().toString(36).substring(2, 9);
    return {
      secure_url: `https://res.cloudinary.com/demo/image/upload/v1/tipped_tickets/${mockId}.jpg`,
    };
  }

  return cloudinary.uploader.upload(fileStr, {
    folder,
    resource_type: 'image',
  });
};

module.exports = {
  cloudinary,
  streamUpload,
  uploadDirect,
};
