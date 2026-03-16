const express = require('express');
const router = express.Router();
const { db } = require('../db');

// --- USER & AUTH (Hisaab Specific) ---
router.post('/hisaab/login', async (req, res) => {
    try {
        const { mobile, pin } = req.body;
        const user = await db('hisaab_users').where({ mobile, pin }).first();
        if (user) {
            res.json(user);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hisaab/register', async (req, res) => {
    try {
        const { name, mobile, pin, role } = req.body;
        const [inserted] = await db('hisaab_users').insert({ name, mobile, pin, role: role || 'Staff' }).returning('id');
        const id = inserted?.id || inserted;
        res.json({ id, message: 'User registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/hisaab/users', async (req, res) => {
    try {
        const users = await db('hisaab_users').select('*');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ---
router.get('/hisaab/settings', async (req, res) => {
    try {
        const settings = await db('hisaab_settings').select('*');
        const map = {};
        settings.forEach(s => map[s.key] = s.value);
        res.json(map);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hisaab/settings', async (req, res) => {
    try {
        const { key, value } = req.body;
        const exists = await db('hisaab_settings').where({ key }).first();
        if (exists) {
            await db('hisaab_settings').where({ key }).update({ value });
        } else {
            await db('hisaab_settings').insert({ key, value });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CUSTOMERS ---
router.get('/hisaab/customers', async (req, res) => {
    try {
        const customers = await db('hisaab_customers').orderBy('name', 'asc');
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hisaab/customers', async (req, res) => {
    try {
        const { user_id, name, phone, address, shop_name } = req.body;
        const [inserted] = await db('hisaab_customers').insert({ user_id, name, phone, address, shop_name }).returning('id');
        const id = inserted?.id || inserted;
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/hisaab/customers/:id', async (req, res) => {
    try {
        await db('hisaab_customers').where({ id: req.params.id }).update(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/hisaab/customers/:id', async (req, res) => {
    try {
        await db('hisaab_customers').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS ---
router.get('/hisaab/transactions/:customerId', async (req, res) => {
    try {
        const transactions = await db('hisaab_transactions')
            .where({ customer_id: req.params.customerId })
            .orderBy('date', 'desc');
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hisaab/transactions', async (req, res) => {
    try {
        const { customer_id, type, amount, profit, note, date, due_date } = req.body;
        const [inserted] = await db('hisaab_transactions').insert({
            customer_id, type, amount, profit, note, 
            date: date || db.fn.now(),
            due_date
        }).returning('id');
        
        // Update customer balance (Simple sum logic)
        const entries = await db('hisaab_transactions').where({ customer_id });
        let bal = 0;
        entries.forEach(e => {
            bal += (e.type === 'Credit' ? Number(e.amount) : -Number(e.amount));
        });
        await db('hisaab_customers').where({ id: customer_id }).update({ total_balance: bal });

        res.json({ id: inserted?.id || inserted, balance: bal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/hisaab/transactions/:id/:customerId', async (req, res) => {
    try {
        await db('hisaab_transactions').where({ id: req.params.id }).del();
        // Re-calculate balance
        const entries = await db('hisaab_transactions').where({ customer_id: req.params.customerId });
        let bal = 0;
        entries.forEach(e => { bal += (e.type === 'Credit' ? Number(e.amount) : -Number(e.amount)); });
        await db('hisaab_customers').where({ id: req.params.customerId }).update({ total_balance: bal });
        res.json({ success: true, balance: bal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
