import { Router } from 'express';
import { uploadAttachment, getAttachment, deleteAttachment } from '../controllers/attachmentController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/upload', authenticate, upload.single('file'), uploadAttachment);
router.get('/:attachmentId', optionalAuthenticate, getAttachment);
router.delete('/:attachmentId', authenticate, deleteAttachment);

export default router;
