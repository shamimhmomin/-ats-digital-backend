/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('orders', (table) => {
      table.increments('id').primary();
      table.integer('customer_id').unsigned().references('id').inTable('shop_customers').onDelete('SET NULL');
      table.string('order_number').unique().notNullable();
      table.decimal('total_amount', 10, 2).notNullable();
      table.string('status').defaultTo('Pending'); // Pending, Processing, Shipped, Delivered, Cancelled
      table.string('payment_status').defaultTo('Unpaid');
      table.string('payment_method').defaultTo('COD');
      // Shipping Address Info
      table.string('shipping_name').notNullable();
      table.string('shipping_phone').notNullable();
      table.text('shipping_address').notNullable();
      table.string('shipping_city').notNullable();
      table.string('shipping_state').notNullable();
      table.string('shipping_pincode').notNullable();
      
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('order_items', (table) => {
      table.increments('id').primary();
      table.integer('order_id').unsigned().references('id').inTable('orders').onDelete('CASCADE');
      table.integer('product_id').unsigned().references('id').inTable('shop_products').onDelete('SET NULL');
      table.string('product_name').notNullable();
      table.integer('quantity').notNullable();
      table.decimal('price', 10, 2).notNullable(); // Snapshot price at time of order
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('order_items')
    .dropTable('orders');
};
