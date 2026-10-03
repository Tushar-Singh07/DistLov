import multer from 'multer';

// Use memoryStorage so we can validate, compute SHA-256, sanitize name, and control disk save safely in attachmentService
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Global upper max 100MB; specific category limits enforced in service
  },
});
