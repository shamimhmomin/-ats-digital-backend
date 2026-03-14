const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth'); // Import hasPermission

router.get('/settings/company', authenticateToken, hasPermission('can_manage_settings'), async (req, res) => { // Added permission
    try {
        const settings = await db('settings').where('key', 'like', 'company_%');
        const settingsObj = settings.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json({ data: settingsObj });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings/company', authenticateToken, hasPermission('can_manage_settings'), async (req, res) => { // Changed isAdmin
    const settings = req.body;
    try {
        await db.transaction(async (trx) => {
            for (const [key, value] of Object.entries(settings)) {
                if (key.startsWith('company_')) {
                    await trx('settings').where({ key }).update({ value });
                }
            }
        });
        res.json({ message: "Company settings updated successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to update some settings.", details: err.message });
    }
});

router.get('/settings/inactivity-timeout', authenticateToken, hasPermission('can_manage_settings'), async (req, res) => {
    try {
        const setting = await db('settings').where({ key: 'inactivity_timeout' }).first();
        res.json({ timeout: parseInt(setting ? setting.value : '3600', 10) }); // Default to 1 hour if not set
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings/inactivity-timeout', authenticateToken, hasPermission('can_manage_settings'), async (req, res) => { // Changed isAdmin
    const { timeout } = req.body;
    if (typeof timeout !== 'number' || timeout < 60) { // Minimum 60 seconds
        return res.status(400).json({ error: "Timeout must be a number and at least 60 seconds." });
    }
    try {
        await db('settings').where({ key: 'inactivity_timeout' }).update({ value: timeout.toString() });
        res.json({ message: "Inactivity timeout updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/settings/notices', authenticateToken, async (req, res) => {
    try {
        const notices = await db('system_notices')
            .orderBy('id', 'desc')
            .limit(20);
        res.json({ data: notices });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
