
const bcrypt = require('bcrypt');
const { db } = require('./db'); // Using knex instance

const saltRounds = 10;
const USERNAME = 'admin';
const PASSWORD = 'password';

const cleanup = () => {
    db.destroy(); // Close knex connection pool
};

const run = async () => {
    try {
        const adminUser = await db('users').where({ role: 'Admin' }).first();

        if (adminUser) {
            console.log(`An admin user already exists (username: '${adminUser.username}'). If you need to reset the password, please do so via the application's user management page.`);
            cleanup();
            return;
        }

        console.log("No admin user found. Creating a default admin user.");

        try {
            const hash = await bcrypt.hash(PASSWORD, saltRounds);
            const [id] = await db('users').insert({ username: USERNAME, password: hash, role: 'Admin' });
            console.log(`Admin user '${USERNAME}' created successfully with ID: ${id}`);
            console.log("You can now log in with:");
            console.log(`Username: ${USERNAME}`);
            console.log(`Password: ${PASSWORD}`);
        } catch (err) {
            console.error("Error creating admin user:", err.message);
        } finally {
            cleanup();
        }
    } catch (err) {
        console.error("Error checking for existing admin user:", err.message);
        cleanup();
    }
};

run();
