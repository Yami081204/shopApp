import db from '../config/database.js';

// Register every Sequelize model before sync so Sequelize can create all base tables.
import '../models/User.js';
import '../models/Category.js';
import '../models/Product.js';
import '../models/ProductVariant.js';
import '../models/Cart.js';
import '../models/CartItem.js';
import '../models/Order.js';
import '../models/OrderItem.js';
import '../models/Address.js';
import '../models/Payment.js';
import '../models/PaymentTransaction.js';
import '../models/OrderStatusHistory.js';
import '../models/RevokedToken.js';
import '../models/Voucher.js';
import '../models/Notification.js';

const initializeDatabase = async () => {
  try {
    await db.authenticate();
    console.log('MySQL connection established.');

    // Creates missing tables/columns without dropping existing data.
    await db.sync();

    console.log('Base tables created. Applying project migrations...');
    process.env.ALLOW_SCHEMA_MIGRATION = '1';
    await import('./run-migrations.js');

    console.log('Database initialization completed.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
    try { await db.close(); } catch {}
  }
};

await initializeDatabase();
