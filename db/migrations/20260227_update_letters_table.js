exports.up = function(knex) {
  return knex.schema.table('letters', table => {
    table.text('full_data'); // Stores the entire JSON configuration
    table.string('place');
  });
};

exports.down = function(knex) {
  return knex.schema.table('letters', table => {
    table.dropColumn('full_data');
    table.dropColumn('place');
  });
};
