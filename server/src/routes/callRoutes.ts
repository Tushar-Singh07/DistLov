import { Router } from 'express';
import { getUserCalls } from '../controllers/callController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/history', getUserCalls);

export default router;
