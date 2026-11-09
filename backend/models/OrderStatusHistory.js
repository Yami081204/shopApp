import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Order from './Order.js';
import User from './User.js';

const OrderStatusHistory = db.define('orderStatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'orders', key: 'id' }
  },
  fromStatus: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  toStatus: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  note: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'order_status_histories',
  updatedAt: false,
  indexes: [{ fields: ['orderId', 'createdAt'], name: 'idx_order_status_history_order' }]
});

OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'orderId' });
OrderStatusHistory.belongsTo(User, { foreignKey: 'changedBy', as: 'actor' });

export default OrderStatusHistory;
