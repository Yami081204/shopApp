import { literal } from 'sequelize';

const createVoucherRepository = ({ Voucher }) => ({
  findByCodeForUpdate: async (code, transaction) => {
    const voucher = await Voucher.findOne({
      where: { code },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    return voucher?.toJSON() ?? null;
  },

  consume: async (voucher, transaction) => {
    const [updated] = await Voucher.update(
      { usageCount: literal('usageCount + 1') },
      {
        where: {
          id: voucher.id,
          isActive: true,
          usageCount: voucher.usageCount
        },
        transaction
      }
    );
    return updated === 1;
  },

  list: async () => (await Voucher.findAll({ order: [['createdAt', 'DESC']] }))
    .map((voucher) => voucher.toJSON()),
  findById: async (id) => {
    const voucher = await Voucher.findByPk(id);
    return voucher?.toJSON() ?? null;
  },
  create: async (data) => (await Voucher.create(data)).toJSON(),
  update: async (id, data) => {
    const voucher = await Voucher.findByPk(id);
    if (!voucher) return null;
    await voucher.update(data);
    return voucher.toJSON();
  }
});

export { createVoucherRepository };
