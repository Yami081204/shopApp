import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

const addColumnIfMissing = async (queryInterface, tableName, columns, name, definition) => {
  if (!columns[name]) await queryInterface.addColumn(tableName, name, definition);
};

export async function up(queryInterface) {
  if (await tableExists(queryInterface, 'orders')) {
    const columns = await queryInterface.describeTable('orders');
    await addColumnIfMissing(queryInterface, 'orders', columns, 'discountPrice', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, 'orders', columns, 'voucherCode', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
  }

  if (!(await tableExists(queryInterface, 'vouchers'))) {
    await queryInterface.createTable('vouchers', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      type: { type: DataTypes.ENUM('PERCENTAGE', 'FIXED'), allowNull: false },
      value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      minimumOrderAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      maximumDiscount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      usageLimit: { type: DataTypes.INTEGER, allowNull: true },
      usageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      startsAt: { type: DataTypes.DATE, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  if (!(await tableExists(queryInterface, 'notifications'))) {
    await queryInterface.createTable('notifications', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: { type: DataTypes.STRING(64), allowNull: false },
      title: { type: DataTypes.STRING(191), allowNull: false },
      message: { type: DataTypes.STRING(500), allowNull: false },
      readAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await queryInterface.addIndex('notifications', ['userId', 'readAt'], {
      name: 'idx_notifications_user_read'
    });
  }
}
