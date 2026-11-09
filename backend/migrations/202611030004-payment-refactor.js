import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

const ensureUniqueIndex = async (queryInterface, tableName, field, name) => {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) =>
    index.unique && index.fields.some((item) => item.attribute === field)
  )) return;

  const [duplicates] = await queryInterface.sequelize.query(`
    SELECT \`${field}\`
    FROM \`${tableName}\`
    GROUP BY \`${field}\`
    HAVING COUNT(*) > 1
    LIMIT 1
  `);
  if (duplicates.length > 0) {
    throw new Error(`Cannot add unique ${tableName}.${field} constraint: duplicate values exist.`);
  }
  await queryInterface.addIndex(tableName, [field], { name, unique: true });
};

export async function up(queryInterface) {
  if (await tableExists(queryInterface, 'payments')) {
    let columns = await queryInterface.describeTable('payments');
    if (!columns.paymentReference) {
      await queryInterface.addColumn('payments', 'paymentReference', {
        type: DataTypes.STRING(64),
        allowNull: true
      });
    }
    columns = await queryInterface.describeTable('payments');
    if (!columns.confirmedBy) {
      await queryInterface.addColumn('payments', 'confirmedBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    await queryInterface.sequelize.query(`
      UPDATE payments
      SET paymentReference = CONCAT('PAY-LEGACY-', id)
      WHERE paymentReference IS NULL OR paymentReference = ''
    `);
    await queryInterface.changeColumn('payments', 'paymentReference', {
      type: DataTypes.STRING(64),
      allowNull: false
    });
    await ensureUniqueIndex(queryInterface, 'payments', 'paymentReference', 'uq_payments_reference');
  }

  if (await tableExists(queryInterface, 'payment_transactions')) {
    let columns = await queryInterface.describeTable('payment_transactions');
    if (!columns.reportedBy) {
      await queryInterface.addColumn('payment_transactions', 'reportedBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    columns = await queryInterface.describeTable('payment_transactions');
    if (!columns.reportedAt) {
      await queryInterface.addColumn('payment_transactions', 'reportedAt', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }
    await ensureUniqueIndex(
      queryInterface,
      'payment_transactions',
      'transactionReference',
      'uq_payment_transactions_reference'
    );
  }
}
