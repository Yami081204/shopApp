import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const SupportReply = db.define('support_reply', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supportMessageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'support_messages',
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  senderRole: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'admin'
  },
  deliveryMode: {
    type: DataTypes.ENUM('demo', 'smtp'),
    allowNull: false
  }
}, {
  tableName: 'support_replies',
  timestamps: true,
  indexes: [{ fields: ['supportMessageId', 'createdAt'], name: 'idx_support_replies_message_created' }]
});

export default SupportReply;
