import { paymentService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const handleSepayWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.processSepayWebhook(req.body || {});
  if (result.status === 'ignored') {
    console.warn('SePay webhook ignored:', result.reason);
  }
  res.json({ success: true, status: result.status });
});

export { handleSepayWebhook };
