import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Category from './Category.js';
import ProductVariant from './ProductVariant.js';

const Product = db.define('product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  salePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  countInStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0
  },
  numReviews: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'categories',
      key: 'id'
    }
  }
});

// Define associations
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

export default Product;