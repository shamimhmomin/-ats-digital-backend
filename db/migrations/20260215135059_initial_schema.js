
exports.up = function(knex) {
  return knex.schema
    .createTable('brands', function (table) {
      table.increments('id').primary();
      table.string('name').unique().notNullable();
    })
    .createTable('major_categories', function (table) {
      table.increments('id').primary();
      table.string('name').unique().notNullable();
    })
    .createTable('sub_categories', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('major_category_id').unsigned().notNullable().references('id').inTable('major_categories').onDelete('CASCADE');
      table.unique(['name', 'major_category_id']);
    })
    .createTable('parts', function (table) {
      table.increments('id').primary();
      table.string('entry_date');
      table.integer('major_category_id').unsigned().references('id').inTable('major_categories');
      table.integer('sub_category_id').unsigned().references('id').inTable('sub_categories');
      table.integer('brand_id').unsigned().references('id').inTable('brands');
      table.string('applicable_model');
      table.string('parts_details_name');
      table.string('packaging_brand');
      table.decimal('mrp');
      table.decimal('purchase_price');
      table.decimal('sale_price');
      table.integer('current_qty');
      table.string('shelf_rack_no');
      table.string('remark');
      table.boolean('reorder_flag').defaultTo(false);
    })
    .createTable('customers', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('phone').unique();
      table.string('vehicle_number');
      table.string('bike_model');
    })
    .createTable('mechanics', function (table) {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
    })
    .createTable('service_jobs', function (table) {
      table.increments('id').primary();
      table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
      table.string('job_date');
      table.string('status');
      table.decimal('total_cost');
      table.string('payment_method').defaultTo('Cash');
      table.decimal('discount_amount').defaultTo(0.0);
      table.decimal('mechanic_service_charge').defaultTo(0.0);
      table.integer('mechanic_id').unsigned().references('id').inTable('mechanics');
    })
    .createTable('service_job_parts', function (table) {
        table.increments('id').primary();
        table.integer('service_job_id').unsigned().notNullable().references('id').inTable('service_jobs').onDelete('CASCADE');
        table.integer('part_id').unsigned().notNullable().references('id').inTable('parts');
        table.integer('quantity_used');
        table.decimal('sale_price_at_time');
    })
    .createTable('users', function (table) {
        table.increments('id').primary();
        table.string('username').unique();
        table.string('password');
        table.string('role');
    })
    .createTable('login_logs', function (table) {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users');
        table.string('login_date');
        table.string('login_time');
        table.string('logout_date');
        table.string('duration');
    })
    .createTable('settings', function (table) {
        table.string('key').primary();
        table.string('value');
    })
    .then(() => {
        return knex('settings').insert({key: 'inactivity_timeout', value: '3600'});
    })
    .then(() => {
        return knex('customers').insert({name: 'Walk-in Customer', phone: 'N/A', vehicle_number: 'N/A', bike_model: 'N/A'});
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('settings')
    .dropTable('login_logs')
    .dropTable('users')
    .dropTable('service_job_parts')
    .dropTable('service_jobs')
    .dropTable('mechanics')
    .dropTable('customers')
    .dropTable('parts')
    .dropTable('sub_categories')
    .dropTable('major_categories')
    .dropTable('brands');
};
