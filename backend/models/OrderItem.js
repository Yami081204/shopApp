import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Order from './Order.js';
import Product from './Product.js';
import ProductVariant from './ProductVariant.js';

const OrderItem = db.define('orderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  productImage: {
    type: DataTypes.STRING(2048),
    allowNull: true
  },
  variantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'product_variants',
      key: 'id'
    }
  },
  variantSku: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  variantSize: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  variantColor: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'order_items',
  timestamps: true
});

// Define associations
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
OrderItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' });
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

export default OrderItem;