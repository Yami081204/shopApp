import { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  const columns = await queryInterface.describeTable('users');
  if (!columns.avatarUrl) {
    await queryInterface.addColumn('users', 'avatarUrl', {
      type: DataTypes.STRING(255),
      allowNull: true
    });
  }
}
