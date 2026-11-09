import { DataTypes } from 'sequelize';
import db from '../config/database.js';
import { up as expandDomain } from './202611030001-domain-expansion.js';
import { up as addOrderDomain } from './202611030002-order-domain.js';
import { up as addBusinessPatterns } from './202611030003-business-patterns.js';
import { up as refactorPayments } from './202611030004-payment-refactor.js';
import { up as addProductVariants } from './202611030005-product-variants.js';
import { up as addSupportMessages } from './202611030006-support-messages.js';
import { up as addSupportReplies } from './202611040007-support-replies.js';
import { up as addSupportReplySenders } from './202611040008-support-reply-senders.js';
import { up as addUserAvatar } from './202611040009-user-avatar.js';

const migrationTable = 'schema_migrations';
const migrations = [
  ['202611030001-domain-expansion', expandDomain],
  ['202611030002-order-domain', addOrderDomain],
  ['202611030003-business-patterns', addBusinessPatterns],
  ['202611030004-payment-refactor', refactorPayments],
  ['202611030005-product-variants', addProductVariants],
  ['202611030006-support-messages', addSupportMessages],
  ['202611040007-support-replies', addSupportReplies],
  ['202611040008-support-reply-senders', addSupportReplySenders],
  ['202611040009-user-avatar', addUserAvatar]
];

const run = async () => {
  const queryInterface = db.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((table) => {
    const name = typeof table === 'string' ? table : table.tableName;
    return String(name).toLowerCase();
  });
  const requiredTables = ['users', 'products', 'orders'];
  const missingTables = requiredTables.filter((name) => !tableNames.includes(name));

  if (missingTables.length > 0) {
    throw new Error(`Base schema is incomplete; missing tables: ${missingTables.join(', ')}`);
  }

  if (!tableNames.includes(migrationTable)) {
    await queryInterface.createTable(migrationTable, {
      name: { type: DataTypes.STRING(191), primaryKey: true, allowNull: false },
      executedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }

  for (const [name, migration] of migrations) {
    const [rows] = await db.query(
      `SELECT name FROM ${migrationTable} WHERE name = :name`,
      { replacements: { name } }
    );

    if (rows.length > 0) {
      console.log(`Migration ${name} is already applied.`);
      continue;
    }

    await migration(queryInterface, db);
    await queryInterface.bulkInsert(migrationTable, [{
      name,
      executedAt: new Date()
    }]);
    console.log(`Migration ${name} completed.`);
  }
};

try {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== '1') {
    throw new Error(
      'Confirm a database backup first, then set ALLOW_SCHEMA_MIGRATION=1 to run migrations.'
    );
  }

  await db.authenticate();
  await run();
} catch (error) {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
} finally {
  await db.close();
}
