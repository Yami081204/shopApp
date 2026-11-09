const createSupportRepository = ({ SupportMessage, SupportReply }) => ({
  create: async (message) => (await SupportMessage.create(message)).toJSON(),

  list: async ({ status, limit, offset }) => {
    const result = await SupportMessage.findAndCountAll({
      where: status ? { status } : undefined,
      include: [{
        model: SupportReply,
        as: 'replies',
        attributes: ['id', 'message', 'senderRole', 'deliveryMode', 'createdAt'],
        required: false
      }],
      order: [
        ['createdAt', 'DESC'],
        [{ model: SupportReply, as: 'replies' }, 'createdAt', 'ASC']
      ],
      limit,
      offset,
      distinct: true
    });
    return {
      rows: result.rows.map((message) => message.toJSON()),
      count: result.count
    };
  },

  findById: async (id) => {
    const message = await SupportMessage.findByPk(id);
    return message?.toJSON() ?? null;
  },

  createReply: async (reply) => (await SupportReply.create(reply)).toJSON(),

  listByEmail: async (email) => {
    const messages = await SupportMessage.findAll({
      where: { email },
      include: [{
        model: SupportReply,
        as: 'replies',
        attributes: ['id', 'message', 'senderRole', 'deliveryMode', 'createdAt'],
        required: false
      }],
      order: [['createdAt', 'DESC'], [{ model: SupportReply, as: 'replies' }, 'createdAt', 'ASC']]
    });
    return messages.map((message) => message.toJSON());
  },

  updateStatus: async (id, status) => {
    const message = await SupportMessage.findByPk(id);
    if (!message) return null;
    await message.update({ status });
    return message.toJSON();
  }
});

export { createSupportRepository };
