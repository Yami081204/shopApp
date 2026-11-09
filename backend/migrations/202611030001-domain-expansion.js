import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

const ensureIndex = async (queryInterface, tableName, fields, options) => {
  const indexes = await queryInterface.showIndex(tableName);
  const fieldKey = fields.join(',');
  const exists = indexes.some((index) =>
    index.fields.map((field) => field.attribute).join(',') === fieldKey &&
    (!options.unique || index.unique)
  );

  if (!exists) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

export async function up(queryInterface, sequelize) {
  if (!(await tableExists(queryInterface, 'addresses'))) {
    await queryInterface.createTable('addresses', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipientName: { type: DataTypes.STRING(255), allowNull: false },
      phone: { type: DataTypes.STRING(50), allowNull: true },
      addressLine: { type: DataTypes.STRING(500), allowNull: false },
      ward: { type: DataTypes.STRING(120), allowNull: true },
      district: { type: DataTypes.STRING(120), allowNull: true },
      city: { type: DataTypes.STRING(120), allowNull: true },
      province: { type: DataTypes.STRING(120), allowNull: true },
      postalCode: { type: DataTypes.STRING(30), allowNull: true },
      country: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Vietnam' },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  await ensureIndex(queryInterface, 'addresses', ['userId'], { name: 'idx_addresses_user' });

  if (await tableExists(queryInterface, 'products')) {
    const productColumns = await queryInterface.describeTable('products');
    if (!productColumns.isActive) {
      await queryInterface.addColumn('products', 'isActive', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
  }

  if (!(await tableExists(queryInterface, 'payments'))) {
    await queryInterface.createTable('payments', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paymentMethod: { type: DataTypes.STRING(50), allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      legacyImported: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      confirmedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  await ensureIndex(queryInterface, 'payments', ['orderId'], {
    name: 'uq_payments_order',
    unique: true
  });

  if (!(await tableExists(queryInterface, 'payment_transactions'))) {
    await queryInterface.createTable('payment_transactions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      paymentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'payments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      transactionReference: { type: DataTypes.STRING(191), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paymentMethod: { type: DataTypes.STRING(50), allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'REVERSED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      confirmedAt: { type: DataTypes.DATE, allowNull: true },
      confirmedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  if (await tableExists(queryInterface, 'payment_transactions')) {
    const transactionColumns = await queryInterface.describeTable('payment_transactions');
    if (!transactionColumns.confirmedBy) {
      await queryInterface.addColumn('payment_transactions', 'confirmedBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  }

  await ensureIndex(queryInterface, 'payment_transactions', ['transactionReference'], {
    name: 'uq_payment_transactions_reference',
    unique: true
  });
  await ensureIndex(queryInterface, 'payment_transactions', ['orderId'], {
    name: 'idx_payment_transactions_order'
  });

  if (await tableExists(queryInterface, 'orders')) {
    const orderColumns = await queryInterface.describeTable('orders');
    const cancelledStatus = orderColumns.status
      ? "WHEN o.status = 'cancelled' THEN 'CANCELLED'"
      : '';
    await sequelize.query(`
      INSERT INTO payments
        (orderId, amount, paymentMethod, status, legacyImported, confirmedAt, createdAt, updatedAt)
      SELECT
        o.id,
        o.totalPrice,
        o.paymentMethod,
        CASE
          WHEN o.isPaid = 1 THEN 'PAID'
          ${cancelledStatus}
          ELSE 'PENDING'
        END,
        1,
        o.paidAt,
        o.createdAt,
        o.updatedAt
      FROM orders AS o
      LEFT JOIN payments AS p ON p.orderId = o.id
      WHERE p.id IS NULL
    `);

    await sequelize.query(`
      INSERT INTO addresses
        (userId, recipientName, phone, addressLine, country, isDefault, createdAt, updatedAt)
      SELECT
        u.id,
        u.name,
        u.phone,
        u.address,
        'Vietnam',
        1,
        u.createdAt,
        u.updatedAt
      FROM users AS u
      LEFT JOIN addresses AS a
        ON a.userId = u.id AND a.isDefault = 1 AND a.addressLine = u.address
      WHERE u.address IS NOT NULL AND TRIM(u.address) <> '' AND a.id IS NULL
    `);
  }
}
