import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

export async function up(queryInterface) {
  if (!(await tableExists(queryInterface, 'support_replies'))) {
    await queryInterface.createTable('support_replies', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      supportMessageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'support_messages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      deliveryMode: {
        type: DataTypes.ENUM('demo', 'smtp'),
        allowNull: false
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  const indexes = await queryInterface.showIndex('support_replies');
  if (!indexes.some((index) => index.name === 'idx_support_replies_message_created')) {
    await queryInterface.addIndex('support_replies', ['supportMessageId', 'createdAt'], {
      name: 'idx_support_replies_message_created'
    });
  }
}
