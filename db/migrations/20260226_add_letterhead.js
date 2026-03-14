exports.up = function(knex) {
  return knex.schema.createTable('letters', table => {
    table.increments('id').primary();
    table.string('ref_no').unique().notNullable(); // Auto-generated
    table.string('recipient_name').notNullable();
    table.string('subject').notNullable();
    table.text('content').notNullable();
    table.string('type').defaultTo('General'); // NOC, Experience, etc.
    table.timestamp('issued_at').defaultTo(knex.fn.now());
    table.integer('created_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('letters');
};
