import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import User from './User.js';

const Order = db.define('order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNumber: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  idempotencyKey: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.0
  },
  shippingAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  shippingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.0
  },
  discountPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  voucherCode: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paidAt: {
    type: DataTypes.DATE
  },
  isDelivered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deliveredAt: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  orderStatus: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PENDING'
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
  tableName: 'orders',
  timestamps: true
});

// Define associations
Order.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Order, { foreignKey: 'userId' });

export default Order;