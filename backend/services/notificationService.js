import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';

const createNotificationService = ({ notificationRepository }) => ({
  listForUser: async (userId, query = {}) => {
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 50));
    return notificationRepository.listForUser(userId, limit);
  },

  markRead: async (userId, notificationId) => {
    const notification = await notificationRepository.markRead(
      userId,
      parsePositiveInteger(notificationId, 'id')
    );
    if (!notification) throw new AppError('Notification not found', 404, 'NOT_FOUND');
    return notification;
  }
});

export { createNotificationService };
