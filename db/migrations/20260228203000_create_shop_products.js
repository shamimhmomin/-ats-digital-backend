/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('shop_products', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('category');
    table.string('sub_category');
    table.decimal('price', 10, 2);
    table.decimal('mrp_price', 10, 2);
    table.string('image_url');
    table.string('product_type').defaultTo('physical');
    table.integer('stock_quantity').defaultTo(0);
    table.string('sku').unique();
    table.decimal('weight_kg', 8, 2);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('shop_products');
};
