const knex = require('knex');
const bcrypt = require('bcrypt');
const path = require('path');
const config = require('../knexfile');

const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = isProduction || (!!process.env.DATABASE_URL && process.env.USE_POSTGRES === 'true');

// Use the correct knex instance
const db_shop = usePostgres 
  ? knex(config.production)
  : knex({
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, '../shop.db')
      },
      useNullAsDefault: true
    });

const initializeShopDatabase = async () => {
  try {
    if (usePostgres) {
      // Check if default admin exists in Postgres
      const admin = await db_shop('shop_admins').where({ username: 'admin_ats' }).first();
      if (!admin) {
        const hash = await bcrypt.hash('admin123', 10);
        await db_shop('shop_admins').insert({
          username: 'admin_ats',
          password: hash,
          full_name: 'ATS Manager',
          role: 'SuperAdmin'
        }).returning('id');
        console.log('Shop: Default admin seeded (Production).');
      }
    } else {
      // Local SQLite Initialization
      const hasAdmins = await db_shop.schema.hasTable('shop_admins');
      if (!hasAdmins) {
        await db_shop.schema.createTable('shop_admins', (table) => {
          table.increments('id').primary();
          table.string('username').unique().notNullable();
          table.string('password').notNullable();
          table.string('full_name');
          table.string('role').defaultTo('Manager');
          table.timestamps(true, true);
        });
        const hash = await bcrypt.hash('admin123', 10);
        await db_shop('shop_admins').insert({ username: 'admin_ats', password: hash, full_name: 'ATS Manager', role: 'SuperAdmin' });
      }
    }
    console.log(`Shop Database initialization complete (${usePostgres ? 'Postgres' : 'SQLite'}).`);
  } catch (error) {
    console.error('Error initializing Shop Database:', error);
  }
};

module.exports = { db_shop, initializeShopDatabase };
