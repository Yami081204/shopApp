import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const Voucher = db.define('voucher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  minimumOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  maximumDiscount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'vouchers',
  timestamps: true
});

export default Voucher;
