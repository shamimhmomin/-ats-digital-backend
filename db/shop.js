const knex = require('knex');
const bcrypt = require('bcrypt');
const config = require('../knexfile');

// Use the same postgres connection as the main db
const db_shop = knex(config.development);

const initializeShopDatabase = async () => {
  try {
    // Check if default admin exists
    const admin = await db_shop('shop_admins').where({ username: 'admin_ats' }).first();
    if (!admin) {
      const hash = await bcrypt.hash('admin123', 10);
      await db_shop('shop_admins').insert({
        username: 'admin_ats',
        password: hash,
        full_name: 'ATS Manager',
        role: 'SuperAdmin'
      }).returning('id');
      console.log('Shop: Default admin seeded.');
    }
    console.log('Shop Database initialization complete.');
  } catch (error) {
    console.error('Error initializing Shop Database:', error);
  }
};

module.exports = { db_shop, initializeShopDatabase };
