import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import User from './User.js';

const Address = db.define('address', {
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
  recipientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addressLine: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  ward: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(120),
    allowNull: false,
    defaultValue: 'Vietnam'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'addresses',
  timestamps: true,
  indexes: [{ fields: ['userId'], name: 'idx_addresses_user' }]
});

Address.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Address, { foreignKey: 'userId' });

export default Address;
