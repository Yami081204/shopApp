import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from './config/database.js';
import { avatarDirectory } from './adapters/avatarStorageAdapter.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Import routes
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import voucherRoutes from './routes/voucherRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/avatars', express.static(avatarDirectory, {
  fallthrough: false,
  immutable: true,
  maxAge: '1y'
}));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/webhooks', webhookRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ecom-lipstick API' });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await db.authenticate();
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server because the database is unavailable:', error);
    process.exitCode = 1;
  }
};

startServer();