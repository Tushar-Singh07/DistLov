import { Router } from 'express';
import * as chatRequestController from '../controllers/chatRequestController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', chatRequestController.sendChatRequest);
router.get('/pending', chatRequestController.getPendingRequests);
router.post('/:requestId/accept', chatRequestController.acceptChatRequest);
router.post('/:requestId/decline', chatRequestController.declineChatRequest);
router.post('/:requestId/cancel', chatRequestController.cancelChatRequest);
router.get('/status/:targetUserId', chatRequestController.getChatStatusWithUser);

export default router;
