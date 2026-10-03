import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getMyConversations,
  createOrGetDirectConversation,
  getConversationById,
  getConversationMessages,
  markConversationRead,
  clearConversationMessages,
} from '../controllers/conversationController.js';
import { searchMessages } from '../controllers/messageController.js';

const router = Router();

router.use(authenticate);

router.get('/', getMyConversations);
router.post('/direct', createOrGetDirectConversation);
router.get('/:conversationId', getConversationById);
router.get('/:conversationId/messages', getConversationMessages);
router.delete('/:conversationId/messages', clearConversationMessages);
router.post('/:conversationId/clear', clearConversationMessages);
router.get('/:conversationId/messages/search', searchMessages);
router.post('/:conversationId/read', markConversationRead);

export default router;
