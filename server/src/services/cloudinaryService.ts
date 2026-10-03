import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';

const ensureConfigured = (): boolean => {
  const cloudName = (env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (env.CLOUDINARY_API_SECRET || '').trim();

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return true;
  }
  return false;
};

export interface CloudinaryUploadResult {
  fileUrl: string;
  publicId: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string | null;
  durationSeconds?: number;
}

export const cloudinaryService = {
  isConfigured(): boolean {
    return ensureConfigured();
  },

  async ping(): Promise<{ success: boolean; message: string }> {
    if (!ensureConfigured()) {
      return { success: false, message: 'Cloudinary credentials missing in env' };
    }
    try {
      const res = await cloudinary.api.ping();
      return { success: true, message: res.status || 'OK' };
    } catch (err: any) {
      console.error('[Cloudinary Ping Error]:', err?.message || err);
      return { success: false, message: err?.message || 'Ping failed' };
    }
  },

  async uploadFileBuffer(
    buffer: Buffer,
    options: { filename: string; mimeType: string; folder?: string }
  ): Promise<CloudinaryUploadResult> {
    if (!ensureConfigured()) {
      throw new Error('Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET.');
    }

    const { filename, mimeType, folder } = options;
    const isImage = (mimeType || '').toLowerCase().startsWith('image/');
    const isVideo = (mimeType || '').toLowerCase().startsWith('video/');

    const uploadFolder = folder || env.CLOUDINARY_FOLDER;
    const uploadOptions: Record<string, any> = {
      folder: uploadFolder,
      resource_type: 'auto',
    };

    if (env.CLOUDINARY_UPLOAD_PRESET && env.CLOUDINARY_UPLOAD_PRESET.trim()) {
      uploadOptions.upload_preset = env.CLOUDINARY_UPLOAD_PRESET.trim();
    }

    return new Promise((resolve, reject) => {
      const handleResult = (error: any, result?: UploadApiResponse) => {
        if (error || !result) {
          console.error('[Cloudinary Upload Error Details]:', error);
          if (error?.http_code === 403 || error?.message?.includes('403') || error?.message?.includes('permissions')) {
            console.error(
              '[Cloudinary 403 Forbidden]: The API Key/Secret lacks "create" write permissions in Cloudinary Console, or requires an Unsigned Upload Preset. Create an Unsigned Upload Preset in Cloudinary Console -> Settings -> Upload -> Add upload preset (Mode: Unsigned) and set CLOUDINARY_UPLOAD_PRESET in server/.env.'
            );
          }
          return reject(new Error(error?.message || 'Failed to upload file to Cloudinary'));
        }

        console.log('[Cloudinary Upload Success]:', result.secure_url);

        let thumbnailUrl: string | null = null;
        if (isImage || result.resource_type === 'image') {
          thumbnailUrl = cloudinary.url(result.public_id, {
            width: 400,
            height: 400,
            crop: 'limit',
            secure: true,
          });
        } else if (isVideo || result.resource_type === 'video') {
          thumbnailUrl = cloudinary.url(result.public_id, {
            resource_type: 'video',
            format: 'jpg',
            start_offset: '0',
            width: 400,
            height: 400,
            crop: 'limit',
            secure: true,
          });
        }

        resolve({
          fileUrl: result.secure_url,
          publicId: result.public_id,
          mimeType: mimeType || result.format || 'application/octet-stream',
          fileSize: result.bytes,
          thumbnailUrl: thumbnailUrl || result.secure_url,
          durationSeconds: Math.round(result.duration || 0),
        });
      };

      const preset = (env.CLOUDINARY_UPLOAD_PRESET || '').trim();
      const uploadStream = preset
        ? cloudinary.uploader.unsigned_upload_stream(preset, uploadOptions, handleResult)
        : cloudinary.uploader.upload_stream(uploadOptions, handleResult);

      uploadStream.end(buffer);
    });
  },

  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
    if (!ensureConfigured() || !publicId) return false;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return true;
    } catch (err) {
      console.warn('[Cloudinary Delete Error]:', err);
      return false;
    }
  },
};
