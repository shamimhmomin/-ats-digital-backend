const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth');

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;

// --- User Management & Auth ---

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db('users').where({ username }).first();
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const result = await bcrypt.compare(password, user.password);
        if (!result) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        const login_timestamp = new Date().toISOString();

        const [inserted_loginId] = await db('login_logs').insert({
            user_id: user.id,
            login_date: new Date().toLocaleDateString(),
            login_time: login_timestamp,
        }).returning('id');
    const loginId = typeof inserted_loginId === 'object' ? inserted_loginId.id : inserted_loginId;

        res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role }, loginId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', async (req, res) => {
    // ... (logout logic)
});

// Admin can create new users
router.post('/users', authenticateToken, hasPermission('can_manage_users'), async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: "Username, password, and role are required." });
    }

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const [inserted_id] = await db('users').insert({ username, password: hash, role }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.status(201).json({ id, username, role });
    } catch (err) {
        res.status(400).json({ error: "Username likely already exists." });
    }
});

router.get('/users', authenticateToken, hasPermission('can_manage_users'), async (req, res) => {
    try {
        const rows = await db.select('id', 'username', 'role').from('users');
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin can view login logs
router.get('/login-logs', authenticateToken, hasPermission('can_manage_users'), async (req, res) => {
    try {
        const rows = await db('login_logs')
            .join('users', 'login_logs.user_id', 'users.id')
            .select(
                'login_logs.id',
                'users.username',
                'login_logs.login_date',
                'login_logs.login_time',
                'login_logs.logout_date',
                'login_logs.duration'
            )
            .orderBy('login_logs.id', 'desc')
            .limit(100);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all login logs
router.delete('/login-logs', authenticateToken, hasPermission('can_manage_users'), async (req, res) => {
    try {
        await db('login_logs').del();
        res.json({ message: "Login logs cleared successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin can change other users' passwords
router.put('/users/:id/password', authenticateToken, hasPermission('can_manage_users'), async (req, res) => {
    const userId = req.params.id;
    const { password } = req.body;

    if (!password || password.trim().length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long." });
    }

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const numUpdated = await db('users')
            .where({ id: userId })
            .update({ password: hash });

        if (numUpdated === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ message: "Password updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin can delete users
router.delete('/users/:id', authenticateToken, hasPermission('can_manage_users'), async (req, res) => {
    const userId = req.params.id;
    if (userId == 1) { // Protect the main admin
        return res.status(400).json({ error: "Cannot delete the primary administrator." });
    }
    try {
        await db('users').where({ id: userId }).del();
        res.json({ message: "User deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
