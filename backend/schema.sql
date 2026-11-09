-- ECOM LIPSTICK - BASE DATABASE SCHEMA
-- MySQL 8+, InnoDB, utf8mb4
--
-- Fresh database setup:
--   1. Run this file once in MySQL.
--   2. Configure backend/.env to use DB_NAME=ecom_lipstick.
--   3. Back up the database, then run backend migrations:
--        PowerShell: $env:ALLOW_SCHEMA_MIGRATION='1'; npm run db:migrate
--      The migrations create the remaining domain tables and columns.
--
-- This script does not drop tables or delete existing data. Do not use it to
-- reset a database. Take a backup before applying migrations to an existing DB.

CREATE DATABASE IF NOT EXISTS ecom_lipstick
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecom_lipstick;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  isAdmin TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image VARCHAR(255) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(255) NULL,
  countInStock INT NOT NULL DEFAULT 0,
  color VARCHAR(100) NULL,
  brand VARCHAR(100) NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  numReviews INT NOT NULL DEFAULT 0,
  categoryId INT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_category (categoryId),
  CONSTRAINT fk_products_category
    FOREIGN KEY (categoryId) REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carts (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_carts_user (userId),
  CONSTRAINT fk_carts_user
    FOREIGN KEY (userId) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id INT NOT NULL AUTO_INCREMENT,
  cartId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cartitem_cart (cartId),
  KEY idx_cartitem_product (productId),
  CONSTRAINT fk_cart_items_cart
    FOREIGN KEY (cartId) REFERENCES carts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product
    FOREIGN KEY (productId) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT NOT NULL AUTO_INCREMENT,
  orderNumber VARCHAR(100) NOT NULL,
  userId INT NOT NULL,
  totalPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shippingAddress VARCHAR(255) NOT NULL,
  shippingPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  paymentMethod VARCHAR(100) NOT NULL,
  isPaid TINYINT(1) NOT NULL DEFAULT 0,
  paidAt DATETIME NULL,
  isDelivered TINYINT(1) NOT NULL DEFAULT 0,
  deliveredAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_number (orderNumber),
  KEY idx_order_user (userId),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (userId) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id INT NOT NULL AUTO_INCREMENT,
  orderId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orderitem_order (orderId),
  KEY idx_orderitem_product (productId),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (orderId) REFERENCES orders(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (productId) REFERENCES products(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Optional demo accounts. INSERT IGNORE preserves an account if its email
-- already exists; this script intentionally does not overwrite existing names.
INSERT IGNORE INTO users (name, email, password, isAdmin)
VALUES
  ('YamiAdmin', 'admin@gmail.com',
   '$2a$12$SrM.IrylZl83IL2dW6lKu.BtnJbtECjRPPbVguR3PFR/NWMrcnxtG', 1),
  ('YamiUser', 'user@gmail.com',
   '$2a$12$iKmSYKLOPK0l57v4BONU6.XScXqYnyPpL1s2/c7Cg2YpxwabyKc4m', 0);

-- Base schema verification
SHOW TABLES;

SELECT id, name, email, isAdmin
FROM users
WHERE email IN ('admin@gmail.com', 'user@gmail.com');
