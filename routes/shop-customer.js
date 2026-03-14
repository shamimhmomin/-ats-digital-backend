const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db_shop: db } = require('../db/shop'); // Shop database instance

// --- Signup Route ---
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existing = await db('shop_customers').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert customer
    const [inserted_id] = await db('shop_customers').insert({
      name,
      email,
      password: hashedPassword
    }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;

    res.status(201).json({ message: 'Account created successfully', userId: id });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// --- Login Route ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await db('shop_customers').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT Token (using unique secret for shop)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'customer' },
      process.env.JWT_SECRET || 'ats_shop_secret_2026',
      { expiresIn: '24h' }
    );

    // Return user info (except password)
    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
