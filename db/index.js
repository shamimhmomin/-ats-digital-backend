const knex = require('knex');
const config = require('../knexfile');

const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = isProduction || (!!process.env.DATABASE_URL && process.env.USE_POSTGRES === 'true');

const db = knex(usePostgres ? config.production : config.development);

const initializeDatabase = async () => {
  try {
    if (!usePostgres) {
      // Local SQLite fixes
      const hasMechanics = await db.schema.hasTable('mechanics');
      if (hasMechanics) {
        const hasPhone = await db.schema.hasColumn('mechanics', 'phone');
        if (!hasPhone) await db.schema.alterTable('mechanics', t => t.string('phone').nullable());
      }
    }
    console.log(`Main Database connection established (${usePostgres ? 'Postgres' : 'SQLite'}).`);
  } catch (error) {
    console.error('Error establishing database connection', error);
  }
};

module.exports = { db, initializeDatabase };
