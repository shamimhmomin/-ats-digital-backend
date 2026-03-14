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
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createTimeoutMillis: 30000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false
    },
    migrations: {
      directory: './db/migrations'
    },
    acquireConnectionTimeout: 60000
  },

  staging: {
    client: 'pg',
    connection: connectionConfig,
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    acquireConnectionTimeout: 60000
  },

  production: {
    client: 'pg',
    connection: connectionConfig,
    pool: {
      min: 0,
      max: 15,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    acquireConnectionTimeout: 60000
  }
};
