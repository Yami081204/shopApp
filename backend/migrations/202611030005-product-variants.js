import { DataTypes } from 'sequelize';

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
};

const addColumnIfMissing = async (queryInterface, tableName, name, definition) => {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[name]) await queryInterface.addColumn(tableName, name, definition);
};

export async function up(queryInterface) {
  if (await tableExists(queryInterface, 'orders')) {
    await addColumnIfMissing(queryInterface, 'orders', 'idempotencyKey', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
    const indexes = await queryInterface.showIndex('orders');
    if (!indexes.some((index) =>
      index.unique && index.fields.some((field) => field.attribute === 'idempotencyKey')
    )) {
      await queryInterface.addIndex('orders', ['idempotencyKey'], {
        name: 'uq_orders_idempotency_key',
        unique: true
      });
    }
  }

  if (await tableExists(queryInterface, 'products')) {
    await addColumnIfMissing(queryInterface, 'products', 'salePrice', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });
  }

  if (!(await tableExists(queryInterface, 'product_variants'))) {
    await queryInterface.createTable('product_variants', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sku: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      size: { type: DataTypes.STRING(32), allowNull: false },
      color: { type: DataTypes.STRING(64), allowNull: false },
      stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
    await queryInterface.addIndex('product_variants', ['productId', 'size', 'color'], {
      name: 'uq_product_variant_size_color',
      unique: true
    });
    await queryInterface.addIndex('product_variants', ['productId', 'isActive'], {
      name: 'idx_product_variants_active'
    });
  }

  for (const tableName of ['cart_items', 'order_items']) {
    if (!(await tableExists(queryInterface, tableName))) continue;
    await addColumnIfMissing(queryInterface, tableName, 'variantId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }

  if (await tableExists(queryInterface, 'order_items')) {
    await addColumnIfMissing(queryInterface, 'order_items', 'variantSku', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'order_items', 'variantSize', {
      type: DataTypes.STRING(32),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'order_items', 'variantColor', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
  }
}
