import express from 'express';
import { handleSepayWebhook } from '../controllers/sepayWebhookController.js';
import { createSepayWebhookAuth } from '../middleware/sepayWebhookAuth.js';

const router = express.Router();

router.post('/sepay', createSepayWebhookAuth(), handleSepayWebhook);

export default router;
