
exports.up = function(knex) {
  return knex.schema
    .createTable('hr_staff', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('phone').unique();
      table.string('role'); 
      table.string('salary_type').defaultTo('monthly'); 
      table.decimal('salary_amount', 10, 2).notNullable();
      table.decimal('overtime_rate', 10, 2).defaultTo(0);
      table.string('joining_date');
      table.decimal('advance_balance', 10, 2).defaultTo(0);
      table.boolean('is_active').defaultTo(true);
    })
    .createTable('hr_attendance', function (table) {
      table.increments('id').primary();
      table.integer('staff_id').unsigned().notNullable().references('id').inTable('hr_staff').onDelete('CASCADE');
      table.string('date').notNullable(); 
      table.string('status').notNullable(); 
      table.decimal('overtime_hours', 5, 2).defaultTo(0);
      table.string('note');
      table.unique(['staff_id', 'date']);
    })
    .createTable('hr_advances', function (table) {
      table.increments('id').primary();
      table.integer('staff_id').unsigned().notNullable().references('id').inTable('hr_staff').onDelete('CASCADE');
      table.decimal('amount', 10, 2).notNullable();
      table.string('date').notNullable();
      table.string('note');
      table.string('payment_mode').defaultTo('Cash');
    })
    .createTable('hr_salary_payments', function (table) {
      table.increments('id').primary();
      table.integer('staff_id').unsigned().notNullable().references('id').inTable('hr_staff').onDelete('CASCADE');
      table.string('month').notNullable(); 
      table.decimal('gross_salary', 10, 2).notNullable();
      table.decimal('attendance_deduction', 10, 2).defaultTo(0);
      table.decimal('advance_deduction', 10, 2).defaultTo(0);
      table.decimal('bonus', 10, 2).defaultTo(0);
      table.decimal('net_salary', 10, 2).notNullable(); 
      table.decimal('paid_amount', 10, 2).defaultTo(0);
      table.string('payment_date');
      table.string('payment_mode').defaultTo('Cash');
      table.string('status').defaultTo('pending');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('hr_salary_payments')
    .dropTable('hr_advances')
    .dropTable('hr_attendance')
    .dropTable('hr_staff');
};
