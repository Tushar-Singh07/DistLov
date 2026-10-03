import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All user routes require authenticated access
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

router.get('/me/privacy', userController.getPrivacy);
router.patch('/me/privacy', userController.updatePrivacy);

router.get('/search', userController.searchUsers);
router.get('/:username', userController.getPublicProfile);

router.post('/:userId/block', userController.blockUser);
router.delete('/:userId/block', userController.unblockUser);

export default router;
