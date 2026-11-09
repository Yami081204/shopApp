import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Order from './Order.js';
import User from './User.js';

const Payment = db.define('payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'orders', key: 'id' }
  },
  paymentReference: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  legacyImported: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'payments',
  timestamps: true
});

Payment.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasOne(Payment, { foreignKey: 'orderId' });
Payment.belongsTo(User, { foreignKey: 'confirmedBy', as: 'confirmer' });

export default Payment;
