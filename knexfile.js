require('dotenv').config();

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

module.exports = {
  development: {
    client: 'pg',
    connection: connectionConfig,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './db/migrations'
    }
  },

  staging: {
    client: 'pg',
    connection: connectionConfig,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'pg',
    connection: connectionConfig,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
