import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import User from './User.js';

const Cart = db.define('cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    },
    unique: true // Each user can have only one cart
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define associations
Cart.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Cart, { foreignKey: 'userId' });

export default Cart;