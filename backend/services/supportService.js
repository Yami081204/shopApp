import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';

const validStatuses = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

const createSupportService = ({ supportRepository, emailService }) => ({
  submit: async (input = {}) => {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const message = typeof input.message === 'string' ? input.message.trim() : '';
    if (!name || name.length > 120) {
      throw new AppError('Name is required and must be at most 120 characters', 400, 'VALIDATION_ERROR');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new AppError('A valid email address is required', 400, 'VALIDATION_ERROR');
    }
    if (!message || message.length > 10000) {
      throw new AppError('Message is required and must be at most 10000 characters', 400, 'VALIDATION_ERROR');
    }
    return supportRepository.create({ name, email, message, status: 'OPEN' });
  },

  list: async (query = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const status = typeof query.status === 'string' && query.status !== 'ALL'
      ? query.status.toUpperCase()
      : undefined;
    if (status && !validStatuses.has(status)) {
      throw new AppError('Support status must be OPEN, IN_PROGRESS, or RESOLVED', 400, 'VALIDATION_ERROR');
    }
    const result = await supportRepository.list({ status, limit, offset: (page - 1) * limit });
    return { rows: result.rows, count: result.count, page, limit };
  },

  listMine: async (email) => {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      throw new AppError('Authenticated account email is required', 401, 'UNAUTHENTICATED');
    }
    return supportRepository.listByEmail(normalizedEmail);
  },

  updateStatus: async (id, status) => {
    const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!validStatuses.has(normalizedStatus)) {
      throw new AppError('Support status must be OPEN, IN_PROGRESS, or RESOLVED', 400, 'VALIDATION_ERROR');
    }
    const messageId = parsePositiveInteger(id, 'id');
    const supportMessage = await supportRepository.updateStatus(messageId, normalizedStatus);
    if (!supportMessage) throw new AppError('Support message not found', 404, 'NOT_FOUND');
    return supportMessage;
  },

  reply: async (id, input = {}) => {
    const messageId = parsePositiveInteger(id, 'id');
    const supportMessage = await supportRepository.findById(messageId);
    if (!supportMessage) throw new AppError('Support message not found', 404, 'NOT_FOUND');
    if (!emailService) {
      throw new AppError('Email delivery is not configured', 503, 'EMAIL_CONFIGURATION_ERROR');
    }

    const replyMessage = typeof input.message === 'string' ? input.message.trim() : '';
    if (!replyMessage || replyMessage.length > 10000) {
      throw new AppError('Reply must contain 1 to 10000 characters', 400, 'VALIDATION_ERROR');
    }

    const delivery = await emailService.sendSupportReply({
      to: supportMessage.email,
      name: supportMessage.name,
      originalMessage: supportMessage.message,
      replyMessage
    });
    await supportRepository.createReply({
      supportMessageId: messageId,
      message: replyMessage,
      senderRole: 'admin',
      deliveryMode: delivery.simulated === true ? 'demo' : 'smtp'
    });
    return { messageId: delivery.messageId, simulated: delivery.simulated === true };
  },

  replyAsUser: async (id, email, input = {}) => {
    const messageId = parsePositiveInteger(id, 'id');
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      throw new AppError('Authenticated account email is required', 401, 'UNAUTHENTICATED');
    }

    const supportMessage = await supportRepository.findById(messageId);
    if (!supportMessage || supportMessage.email.toLowerCase() !== normalizedEmail) {
      throw new AppError('Support message not found', 404, 'NOT_FOUND');
    }

    const message = typeof input.message === 'string' ? input.message.trim() : '';
    if (!message || message.length > 10000) {
      throw new AppError('Reply must contain 1 to 10000 characters', 400, 'VALIDATION_ERROR');
    }

    const reply = await supportRepository.createReply({
      supportMessageId: messageId,
      message,
      senderRole: 'user',
      deliveryMode: 'demo'
    });
    await supportRepository.updateStatus(messageId, 'OPEN');
    return reply;
  },

  getEmailConfigurationStatus: () => {
    if (!emailService) {
      throw new AppError('Email delivery is not configured', 503, 'EMAIL_CONFIGURATION_ERROR');
    }
    return emailService.getConfigurationStatus();
  }
});

export { createSupportService };
