import asyncHandler from '../utils/asyncHandler.js';
import { supportService } from '../container.js';

const submitSupportMessage = asyncHandler(async (req, res) => {
  const supportMessage = await supportService.submit(req.body || {});
  res.status(201).json({
    message: 'Support request received.',
    supportMessage
  });
});

const getSupportMessages = asyncHandler(async (req, res) => {
  const result = await supportService.list(req.query);
  res.json({
    data: result.rows,
    count: result.count,
    page: result.page,
    limit: result.limit
  });
});

const getMySupportMessages = asyncHandler(async (req, res) => {
  res.json({ data: await supportService.listMine(req.user.email) });
});

const updateSupportStatus = asyncHandler(async (req, res) => {
  const supportMessage = await supportService.updateStatus(req.params.id, req.body?.status);
  res.json({ supportMessage });
});

const replyToSupportMessage = asyncHandler(async (req, res) => {
  const result = await supportService.reply(req.params.id, req.body || {});
  res.json({
    message: result.simulated ? 'Support reply email simulated.' : 'Support reply email sent.',
    messageId: result.messageId,
    simulated: result.simulated
  });
});

const replyToMySupportMessage = asyncHandler(async (req, res) => {
  const reply = await supportService.replyAsUser(req.params.id, req.user.email, req.body || {});
  res.status(201).json({ reply });
});

const getSupportEmailStatus = asyncHandler(async (req, res) => {
  res.json(supportService.getEmailConfigurationStatus());
});

export {
  submitSupportMessage,
  getSupportMessages,
  getMySupportMessages,
  updateSupportStatus,
  replyToSupportMessage,
  replyToMySupportMessage,
  getSupportEmailStatus
};
