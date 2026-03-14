require('dotenv').config();
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const hasDbUrl = !!process.env.DATABASE_URL;
const usePostgres = isProduction || (hasDbUrl && process.env.USE_POSTGRES === 'true');

module.exports = {
  development: {
    client: usePostgres ? 'pg' : 'sqlite3',
    connection: usePostgres 
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        }
      : {
          filename: path.join(__dirname, 'inventory.db')
        },
    useNullAsDefault: !usePostgres,
    pool: isProduction 
      ? { min: 0, max: 15, acquireTimeoutMillis: 30000 }
      : { min: 1, max: 1 },
    migrations: {
      directory: './db/migrations'
    }
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    pool: { min: 0, max: 15, acquireTimeoutMillis: 30000 },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
