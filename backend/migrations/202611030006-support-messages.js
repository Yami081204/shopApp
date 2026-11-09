import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

export async function up(queryInterface) {
  if (!(await tableExists(queryInterface, 'support_messages'))) {
    await queryInterface.createTable('support_messages', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED'),
        allowNull: false,
        defaultValue: 'OPEN'
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  const indexes = await queryInterface.showIndex('support_messages');
  if (!indexes.some((index) => index.name === 'idx_support_messages_status_created')) {
    await queryInterface.addIndex('support_messages', ['status', 'createdAt'], {
      name: 'idx_support_messages_status_created'
    });
  }
}
