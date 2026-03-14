require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initializeDatabase } = require('./db');
const { initializeShopDatabase } = require('./db/shop'); // New Shop DB
const authRoutes = require('./routes/auth');
const partsRoutes = require('./routes/parts');
const customersRoutes = require('./routes/customers');
const mechanicsRoutes = require('./routes/mechanics');
const serviceRoutes = require('./routes/service');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const databaseRoutes = require('./routes/database');
const permissionsRoutes = require('./routes/permissions');
const ownerRoutes = require('./routes/owner');
const shopRoutes = require('./routes/shop'); // New Shop Routes
const shopCustomerRoutes = require('./routes/shop-customer'); // New Customer Auth
const shopOrderRoutes = require('./routes/shop-orders'); // New Orders
const shopAdminAuthRoutes = require('./routes/shop-admin-auth'); // New Shop Admin Auth

const app = express();
const port = process.env.PORT || 3002;

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined. Please create a .env file.");
    process.exit(1);
}

// --- Middleware ---
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for local dev
app.use(cors()); // Permissive CORS for debugging

// Set limit to 50MB for PDF uploads and Product Imagery
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Databases ---
initializeDatabase(); // Falak Workshop DB
initializeShopDatabase(); // ATS Digital DB

// --- API ROUTES (Integrated Ecosystem) ---

// 1. Falak Workshop & Inventory APIs
app.use('/api', authRoutes);
app.use('/api', partsRoutes);
app.use('/api', customersRoutes);
app.use('/api', mechanicsRoutes);
app.use('/api', serviceRoutes);
app.use('/api', salesRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', settingsRoutes);
app.use('/api', databaseRoutes);
app.use('/api', permissionsRoutes);
app.use('/api', ownerRoutes);

// 2. ATS Digital Shop APIs
app.use('/api/shop', shopRoutes); 
app.use('/api/shop/customer', shopCustomerRoutes);
app.use('/api/shop/orders', shopOrderRoutes); 
app.use('/api/shop/admin', shopAdminAuthRoutes); 

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));
app.get('/', (req, res) => res.send('ATS-Digital Ecosystem API is running. (Workshop + Shop)'));

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`ATS-Digital Ecosystem Server running at http://localhost:${port}`);
    console.log(`Modules: Falak Workshop + Owner Panel + ATS Storefront Hub`);
});

// --- Global Error Handling ---
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'File is too large for the server.' });
    }
    console.error('Unhandled Server Error:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
});
