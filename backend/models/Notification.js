import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Order from './Order.js';
import User from './User.js';

const Notification = db.define('notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'orders', key: 'id' }
  },
  type: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(191),
    allowNull: false
  },
  message: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [{ fields: ['userId', 'readAt'], name: 'idx_notifications_user_read' }]
});

Notification.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(Notification, { foreignKey: 'orderId' });

export default Notification;
