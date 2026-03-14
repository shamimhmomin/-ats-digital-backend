const express = require('express');
const router = express.Router();
const { db_shop } = require('../db/shop');

// PUBLIC: Get all active products for the shop
router.get('/shop/products', async (req, res) => {
    try {
        const products = await db_shop('shop_products').where({ is_active: true }).orderBy('id', 'desc');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products: " + err.message });
    }
});

// PUBLIC: Get single product details
router.get('/shop/products/:id', async (req, res) => {
    try {
        const product = await db_shop('shop_products').where({ id: req.params.id }).first();
        if (!product) return res.status(404).json({ error: "Product not found" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

// ADMIN: Add new digital product
router.post('/shop/products', async (req, res) => {
    try {
        const { title, description, category, sub_category, price, mrp_price, image_url, file_path, product_type, stock_quantity, sku, weight_kg } = req.body;
        const [inserted_id] = await db_shop('shop_products').insert({
            title, description, category, sub_category, price, mrp_price, image_url, file_path,
            product_type, stock_quantity, sku, weight_kg,
            is_active: true
        }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.status(201).json({ id, message: "Product added successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add product: " + err.message });
    }
});

// ADMIN: Update existing product
router.put('/shop/products/:id', async (req, res) => {
    try {
        const { title, description, category, sub_category, price, mrp_price, image_url, file_path, product_type, stock_quantity, sku, weight_kg, is_active } = req.body;
        await db_shop('shop_products').where({ id: req.params.id }).update({
            title, description, category, sub_category, price, mrp_price, image_url, file_path,
            product_type, stock_quantity, sku, weight_kg, is_active,
            updated_at: new Date().toISOString()
        });
        res.json({ message: "Product updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update product: " + err.message });
    }
});

// ADMIN: Delete product
router.delete('/shop/products/:id', async (req, res) => {
    try {
        await db_shop('shop_products').where({ id: req.params.id }).del();
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete product: " + err.message });
    }
});

module.exports = router;
