const knex = require('knex');
const config = require('../knexfile');

const db = knex(config.development);

const initializeDatabase = async () => {
  try {
    console.log('Main Database connection has been established (Postgres).');
  } catch (error) {
    console.error('Error establishing database connection', error);
  }
};

module.exports = { db, initializeDatabase };
