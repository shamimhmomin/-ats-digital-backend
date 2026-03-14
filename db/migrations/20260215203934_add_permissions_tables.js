/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('permissions', function(table) {
    table.string('key').primary().notNullable();
    table.string('description').notNullable();
    table.string('category').notNullable(); // e.g., 'Parts Management'
  });

  await knex.schema.createTable('role_permissions', function(table) {
    table.string('role_name').notNullable(); // e.g., 'Admin', 'User', 'Guest'
    table.string('permission_key').notNullable();
    table.foreign('permission_key').references('key').inTable('permissions').onDelete('CASCADE');
    table.primary(['role_name', 'permission_key']);
  });

  const allPermissions = [
    // Parts Management
    { key: 'can_view_parts', description: 'Parts list dekh sakta hai', category: 'Parts Management' },
    { key: 'can_add_parts', description: 'Naye parts add kar sakta hai', category: 'Parts Management' },
    { key: 'can_edit_parts', description: 'Existing parts edit kar sakta hai', category: 'Parts Management' },
    { key: 'can_delete_parts', description: 'Parts delete kar sakta hai', category: 'Parts Management' },
    { key: 'can_set_reorder_flag', description: 'Reorder flag set kar sakta hai', category: 'Parts Management' },
    // Customer Management
    { key: 'can_view_customers', description: 'Customers list dekh sakta hai', category: 'Customer Management' },
    { key: 'can_add_customers', description: 'Naye customers add kar sakta hai', category: 'Customer Management' },
    { key: 'can_edit_customers', description: 'Existing customers edit kar sakta hai', category: 'Customer Management' },
    { key: 'can_delete_customers', description: 'Customers delete kar sakta hai', category: 'Customer Management' },
    // Service Job Management
    { key: 'can_view_service_jobs', description: 'Service jobs dekh sakta hai', category: 'Service Job Management' },
    { key: 'can_create_service_jobs', description: 'Naye service jobs bana sakta hai', category: 'Service Job Management' },
    { key: 'can_add_parts_to_service_job', description: 'Service job mein parts add kar sakta hai', category: 'Service Job Management' },
    { key: 'can_remove_parts_from_service_job', description: 'Service job se parts remove kar sakta hai', category: 'Service Job Management' },
    { key: 'can_update_service_job_summary', description: 'Service job summary (discount/mechanic charge) update kar sakta hai', category: 'Service Job Management' },
    { key: 'can_close_service_jobs', description: 'Service jobs close kar sakta hai', category: 'Service Job Management' },
    { key: 'can_reopen_service_jobs', description: 'Service jobs reopen kar sakta hai', category: 'Service Job Management' },
    { key: 'can_delete_service_jobs', description: 'Service jobs delete kar sakta hai', category: 'Service Job Management' },
    // Sales Reports
    { key: 'can_view_sales_report', description: 'Sales report dekh sakta hai', category: 'Sales Reports' },
    { key: 'can_create_direct_sales', description: 'Direct sales record kar sakta hai', category: 'Sales Reports' },
    // Mechanic Management
    { key: 'can_view_mechanics', description: 'Mechanics list dekh sakta hai', category: 'Mechanic Management' },
    { key: 'can_add_mechanics', description: 'Naye mechanics add kar sakta hai', category: 'Mechanic Management' },
    { key: 'can_delete_mechanics', description: 'Mechanics delete kar sakta hai', category: 'Mechanic Management' },
    // Dashboard
    { key: 'can_view_dashboard_summary', description: 'Dashboard summary dekh sakta hai', category: 'Dashboard' },
    { key: 'can_view_revenue_summary', description: 'Revenue summary dekh sakta hai', category: 'Dashboard' },
    // User & Settings Management
    { key: 'can_manage_users', description: 'Users ko manage kar sakta hai - add/edit/delete', category: 'User & Settings Management' },
    { key: 'can_manage_settings', description: 'Application settings change kar sakta hai - inactivity timeout', category: 'User & Settings Management' },
    { key: 'can_backup_database', description: 'Database backup kar sakta hai', category: 'User & Settings Management' },
  ];

  await knex('permissions').insert(allPermissions);

  // Define default role permissions
  const adminPermissions = allPermissions.map(p => ({ role_name: 'Admin', permission_key: p.key }));

  const userPermissionsKeys = [
    'can_view_parts', 'can_add_parts', 'can_edit_parts',
    'can_view_customers', 'can_add_customers', 'can_edit_customers',
    'can_view_service_jobs', 'can_create_service_jobs', 'can_add_parts_to_service_job', 'can_remove_parts_from_service_job', 'can_update_service_job_summary', 'can_close_service_jobs', 'can_reopen_service_jobs',
    'can_view_sales_report', 'can_create_direct_sales',
    'can_view_mechanics', 'can_add_mechanics',
    'can_view_dashboard_summary',
  ];
  const userPermissions = userPermissionsKeys.map(key => ({ role_name: 'User', permission_key: key }));

  const guestPermissionsKeys = [
    'can_view_parts',
    'can_view_customers',
    'can_view_service_jobs',
    'can_view_dashboard_summary',
  ];
  const guestPermissions = guestPermissionsKeys.map(key => ({ role_name: 'Guest', permission_key: key }));

  await knex('role_permissions').insert([...adminPermissions, ...userPermissions, ...guestPermissions]);
};

exports.down = async function(knex) {
  await knex.schema.dropTable('role_permissions');
  await knex.schema.dropTable('permissions');
};
