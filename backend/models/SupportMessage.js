import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import SupportReply from './SupportReply.js';

const SupportMessage = db.define('support_message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    validate: { isEmail: true }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED'),
    allowNull: false,
    defaultValue: 'OPEN'
  }
}, {
  tableName: 'support_messages',
  timestamps: true,
  indexes: [{ fields: ['status', 'createdAt'], name: 'idx_support_messages_status_created' }]
});

SupportMessage.hasMany(SupportReply, { as: 'replies', foreignKey: 'supportMessageId' });
SupportReply.belongsTo(SupportMessage, { as: 'supportMessage', foreignKey: 'supportMessageId' });

export default SupportMessage;
