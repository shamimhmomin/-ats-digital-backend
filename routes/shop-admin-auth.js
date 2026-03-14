const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db_shop } = require('../db/shop');

const JWT_SECRET = process.env.JWT_SECRET || 'ats_shop_admin_secret_2026';

// --- Shop Admin Login ---
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await db_shop('shop_admins').where({ username }).first();
    if (!admin) {
      return res.status(401).json({ error: "Invalid Shop Admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Shop Admin credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, panel: 'shop_admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ 
      token, 
      user: { 
        id: admin.id, 
        username: admin.username, 
        role: admin.role, 
        full_name: admin.full_name 
      } 
    });
  } catch (err) {
    console.error('Shop Admin login error:', err);
    res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;
