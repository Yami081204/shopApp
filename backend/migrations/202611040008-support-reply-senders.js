import { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  const columns = await queryInterface.describeTable('support_replies');
  if (!columns.senderRole) {
    await queryInterface.addColumn('support_replies', 'senderRole', {
      type: DataTypes.ENUM('admin', 'user'),
      allowNull: false,
      defaultValue: 'admin'
    });
  }
}
