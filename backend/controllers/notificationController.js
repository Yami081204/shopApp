import { notificationService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const getNotifications = asyncHandler(async (req, res) => {
  res.json(await notificationService.listForUser(req.user.id, req.query));
});

const markNotificationRead = asyncHandler(async (req, res) => {
  res.json(await notificationService.markRead(req.user.id, req.params.id));
});

export { getNotifications, markNotificationRead };
