import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
} from '../controllers/messageController.js';

const router = Router();

router.use(authenticate);

router.post('/', sendMessage);
router.patch('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/reactions', addReaction);
router.delete('/:messageId/reactions/:emoji', removeReaction);

export default router;
