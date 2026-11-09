const createNotificationRepository = ({ Notification }) => ({
  create: async (data) => (await Notification.create(data)).toJSON(),

  listForUser: async (userId, limit = 50) => (await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit
  })).map((notification) => notification.toJSON()),

  markRead: async (userId, id) => {
    const notification = await Notification.findOne({ where: { id, userId } });
    if (!notification) return null;
    if (!notification.readAt) await notification.update({ readAt: new Date() });
    return notification.toJSON();
  }
});

export { createNotificationRepository };
