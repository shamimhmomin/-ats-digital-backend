const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth'); // Import hasPermission

router.get('/customers', authenticateToken, hasPermission('can_view_customers'), async (req, res) => { // Added permission
    try {
        const customers = await db('customers').orderBy('name');
        res.json({ data: customers || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/customers/:id', authenticateToken, hasPermission('can_view_customers'), async (req, res) => { // Added permission
    const customerId = req.params.id;
    try {
        const customer = await db('customers').where({ id: customerId }).first();
        if (!customer) {
            return res.status(404).json({ error: "Customer not found." });
        }
        res.json({ data: customer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/customers/search', authenticateToken, hasPermission('can_view_customers'), async (req, res) => { // Added permission
    const { term } = req.query;
    if (!term) {
        return res.status(400).json({ error: "Search term is required." });
    }
    try {
        const customers = await db('customers')
            .where('name', 'like', `%${term}%`)
            .orWhere('phone', 'like', `%${term}%`);
        res.json({ data: customers || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/customers', authenticateToken, hasPermission('can_add_customers'), async (req, res) => {
    let { name, phone, vehicle_number, bike_model } = req.body;
    
    // --- Validation ---
    const errors = [];
    if (!vehicle_number || vehicle_number.trim() === '') errors.push("Vehicle number is required.");
    if (!bike_model || bike_model.trim() === '') errors.push("Bike model is required.");

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }

    // Defaults for optional fields
    if (!name || name.trim() === '') name = "None";
    if (!phone || phone.trim() === '' || phone.toLowerCase() === 'none') phone = null; // NULL allows multiple "no-phone" entries in SQLite UNIQUE columns
    // --- End Validation ---

    try {
        const [inserted_id] = await db('customers').insert({ name, phone, vehicle_number, bike_model }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.status(201).json({ message: "Customer added successfully.", id });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            const existing = await db('customers').where({ phone }).first();
            return res.status(400).json({ 
                error: `This phone number is already registered to "${existing?.name || 'another customer'}".`,
                existingId: existing?.id 
            });
        }
        return res.status(500).json({ error: err.message });
    }
});

router.put('/customers/:id', authenticateToken, hasPermission('can_edit_customers'), async (req, res) => {
    let { name, phone, vehicle_number, bike_model } = req.body;

    // --- Validation ---
    const errors = [];
    if (vehicle_number !== undefined && vehicle_number.trim() === '') errors.push("Vehicle number cannot be empty.");
    if (bike_model !== undefined && bike_model.trim() === '') errors.push("Bike model cannot be empty.");

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }
    // --- End Validation ---

    const customerData = {};
    if (name !== undefined) customerData.name = name.trim() === '' ? "None" : name;
    if (phone !== undefined) customerData.phone = (phone.trim() === '' || phone.toLowerCase() === 'none') ? null : phone;
    if (vehicle_number) customerData.vehicle_number = vehicle_number;
    if (bike_model) customerData.bike_model = bike_model;

    try {
        const changes = await db('customers').where({ id: req.params.id }).update(customerData);
        res.json({ message: "Customer updated successfully.", changes });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: "This phone number is already registered." });
        }
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/customers/:id', authenticateToken, hasPermission('can_delete_customers'), async (req, res) => { // Changed isAdmin
    const customerId = req.params.id;

    try {
        const count = await db('service_jobs').where({ customer_id: customerId }).count('id as count').first();

        if (count.count > 0) {
            return res.status(400).json({ error: "Cannot delete customer: associated service jobs exist. Please delete them first." });
        }

        const numDeleted = await db('customers').where({ id: customerId }).del();

        if (numDeleted === 0) {
            return res.status(404).json({ error: "Customer not found." });
        }

        res.json({ message: "Customer deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete customer.", details: err.message });
    }
});

router.get('/customers/:id/history', authenticateToken, hasPermission('can_view_customers'), async (req, res) => { // Added permission
    const customerId = req.params.id;
    try {
        const history = await db('service_jobs')
            .select('id', 'job_date', 'status', 'total_cost', 'payment_method')
            .where({ customer_id: customerId })
            .orderBy('job_date', 'desc');
        res.json({ data: history || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
