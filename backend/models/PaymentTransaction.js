import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Order from './Order.js';
import Payment from './Payment.js';
import User from './User.js';

const PaymentTransaction = db.define('paymentTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payments', key: 'id' }
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'orders', key: 'id' }
  },
  transactionReference: {
    type: DataTypes.STRING(191),
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
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'REVERSED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reportedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reportedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  confirmedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'payment_transactions',
  timestamps: true,
  indexes: [{ fields: ['orderId'], name: 'idx_payment_transactions_order' }]
});

PaymentTransaction.belongsTo(Payment, { foreignKey: 'paymentId' });
Payment.hasMany(PaymentTransaction, { foreignKey: 'paymentId' });
PaymentTransaction.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(PaymentTransaction, { foreignKey: 'orderId' });
PaymentTransaction.belongsTo(User, { foreignKey: 'confirmedBy', as: 'confirmer' });
PaymentTransaction.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });

export default PaymentTransaction;
