import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import Cart from './Cart.js';
import Product from './Product.js';
import ProductVariant from './ProductVariant.js';

const CartItem = db.define('cartItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cartId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'carts',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  variantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'product_variants',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'cart_items'
});

// Define associations
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
CartItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' });
Cart.hasMany(CartItem, { foreignKey: 'cartId' });
Product.hasMany(CartItem, { foreignKey: 'productId' });

export default CartItem;