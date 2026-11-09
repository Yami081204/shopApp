import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const RevokedToken = db.define('revokedToken', {
  jti: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'revoked_tokens',
  timestamps: false,
  indexes: [{ fields: ['expiresAt'], name: 'idx_revoked_tokens_expiry' }]
});

export default RevokedToken;
