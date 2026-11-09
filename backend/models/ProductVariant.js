import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const ProductVariant = db.define('productVariant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' }
  },
  sku: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  size: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'product_variants',
  indexes: [
    { unique: true, fields: ['productId', 'size', 'color'], name: 'uq_product_variant_size_color' },
    { fields: ['productId', 'isActive'], name: 'idx_product_variants_active' }
  ]
});

export default ProductVariant;
