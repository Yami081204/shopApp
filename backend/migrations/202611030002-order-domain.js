import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

export async function up(queryInterface) {
  if (await tableExists(queryInterface, 'orders')) {
    const orderColumns = await queryInterface.describeTable('orders');
    if (orderColumns.orderNumber) {
      const indexes = await queryInterface.showIndex('orders');
      if (!indexes.some((index) =>
        index.unique && index.fields.some((field) => field.attribute === 'orderNumber')
      )) {
        const [duplicates] = await queryInterface.sequelize.query(`
          SELECT orderNumber
          FROM orders
          GROUP BY orderNumber
          HAVING COUNT(*) > 1
          LIMIT 1
        `);
        if (duplicates.length > 0) {
          throw new Error('Cannot add unique orderNumber constraint: duplicate legacy values exist.');
        }
        await queryInterface.addIndex('orders', ['orderNumber'], {
          name: 'uq_orders_order_number',
          unique: true
        });
      }
    }

    if (!orderColumns.orderStatus) {
      await queryInterface.addColumn('orders', 'orderStatus', {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING'
      });
    }

    if (orderColumns.status) {
      await queryInterface.sequelize.query(`
        UPDATE orders
        SET orderStatus = CASE
          WHEN status = 'cancelled' THEN 'CANCELLED'
          WHEN status = 'delivered' THEN 'DELIVERED'
          WHEN status = 'shipped' THEN 'SHIPPING'
          WHEN status = 'processing' THEN 'PROCESSING'
          WHEN status = 'paid' THEN 'CONFIRMED'
          ELSE 'PENDING'
        END
        WHERE orderStatus = 'PENDING'
      `);
    }
  }

  if (await tableExists(queryInterface, 'order_items') && await tableExists(queryInterface, 'products')) {
    const itemColumns = await queryInterface.describeTable('order_items');
    if (!itemColumns.productName) {
      await queryInterface.addColumn('order_items', 'productName', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
    }
    if (!itemColumns.productImage) {
      await queryInterface.addColumn('order_items', 'productImage', {
        type: DataTypes.STRING(2048),
        allowNull: true
      });
    }
    await queryInterface.sequelize.query(`
      UPDATE order_items AS oi
      LEFT JOIN products AS p ON p.id = oi.productId
      SET oi.productName = COALESCE(oi.productName, p.name),
          oi.productImage = COALESCE(oi.productImage, p.image)
      WHERE oi.productName IS NULL OR oi.productImage IS NULL
    `);
  }

  if (!(await tableExists(queryInterface, 'order_status_histories'))) {
    await queryInterface.createTable('order_status_histories', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fromStatus: { type: DataTypes.STRING(32), allowNull: true },
      toStatus: { type: DataTypes.STRING(32), allowNull: false },
      changedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      note: { type: DataTypes.STRING(500), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await queryInterface.addIndex('order_status_histories', ['orderId', 'createdAt'], {
      name: 'idx_order_status_history_order'
    });
  }

  if (!(await tableExists(queryInterface, 'revoked_tokens'))) {
    await queryInterface.createTable('revoked_tokens', {
      jti: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex('revoked_tokens', ['expiresAt'], {
      name: 'idx_revoked_tokens_expiry'
    });
  }
}
