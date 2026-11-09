import express from 'express';
import {
  getSupportMessages,
  getMySupportMessages,
  submitSupportMessage,
  updateSupportStatus,
  replyToSupportMessage,
  replyToMySupportMessage,
  getSupportEmailStatus
} from '../controllers/supportController.js';
import { admin, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', submitSupportMessage);
router.get('/mine', protect, getMySupportMessages);
router.post('/mine/:id/replies', protect, replyToMySupportMessage);
router.get('/', protect, admin, getSupportMessages);
router.get('/email-status', protect, admin, getSupportEmailStatus);
router.patch('/:id/status', protect, admin, updateSupportStatus);
router.post('/:id/reply', protect, admin, replyToSupportMessage);

export default router;
