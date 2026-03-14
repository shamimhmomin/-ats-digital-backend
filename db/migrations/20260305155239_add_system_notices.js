/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('system_notices', (table) => {
    table.increments('id').primary();
    table.text('message').notNullable();
    table.string('level').defaultTo('info'); // info, success, warning, danger
    table.string('category').defaultTo('general'); // deletion, security, update
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('system_notices');
};
