const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth');

// --- Brands ---
router.post('/brands', authenticateToken, hasPermission('can_add_parts'), async (req, res) => {
    try {
        const [inserted_id] = await db('brands').insert({ name: req.body.name }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.json({ id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/brands', authenticateToken, hasPermission('can_view_parts'), async (req, res) => {
    try {
        const brands = await db('brands as b')
            .leftJoin('parts as p', 'b.id', 'p.brand_id')
            .select('b.*')
            .count('p.id as part_count')
            .sum('p.current_qty as total_qty')
            .groupBy('b.id')
            .orderBy('b.name');
        res.json({ data: brands || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/brands/:id', authenticateToken, hasPermission('can_edit_parts'), async (req, res) => {
    try {
        await db('brands').where({ id: req.params.id }).update({ name: req.body.name });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete('/brands/:id', authenticateToken, hasPermission('can_delete_parts'), async (req, res) => {
    try {
        const brand = await db('brands').where({ id: req.params.id }).first();
        const usage = await db('parts').where({ brand_id: req.params.id }).count('id as count').first();
        if (usage.count > 0) {
            const msg = `Deletion Blocked: Brand "${brand?.name}" is currently being used by ${usage.count} parts.`;
            await db('system_notices').insert({ message: msg, level: 'warning', category: 'deletion' });
            return res.status(400).json({ error: msg });
        }
        await db('brands').where({ id: req.params.id }).del();
        await db('system_notices').insert({ message: `Brand "${brand?.name}" was successfully deleted.`, level: 'success', category: 'deletion' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Major Categories ---
router.post('/major-categories', authenticateToken, hasPermission('can_add_parts'), async (req, res) => {
    try {
        const [inserted_id] = await db('major_categories').insert({ name: req.body.name }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.json({ id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/major-categories', authenticateToken, hasPermission('can_view_parts'), async (req, res) => {
    try {
        const majorCategories = await db('major_categories as mc')
            .leftJoin('parts as p', 'mc.id', 'p.major_category_id')
            .select('mc.*')
            .count('p.id as part_count')
            .sum('p.current_qty as total_qty')
            .groupBy('mc.id')
            .orderBy('mc.name');
        res.json({ data: majorCategories || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/major-categories/:id', authenticateToken, hasPermission('can_edit_parts'), async (req, res) => {
    try {
        await db('major_categories').where({ id: req.params.id }).update({ name: req.body.name });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete('/major-categories/:id', authenticateToken, hasPermission('can_delete_parts'), async (req, res) => {
    try {
        const cat = await db('major_categories').where({ id: req.params.id }).first();
        const partUsage = await db('parts').where({ major_category_id: req.params.id }).count('id as count').first();
        if (partUsage.count > 0) {
            const msg = `Deletion Blocked: Major Category "${cat?.name}" is being used by ${partUsage.count} parts.`;
            await db('system_notices').insert({ message: msg, level: 'warning', category: 'deletion' });
            return res.status(400).json({ error: msg });
        }
        const subCategories = await db('sub_categories').where({ major_category_id: req.params.id }).select('id');
        const subIds = subCategories.map(s => s.id);
        if (subIds.length > 0) {
            const subUsage = await db('parts').whereIn('sub_category_id', subIds).count('id as count').first();
            if (subUsage.count > 0) {
                const msg = `Deletion Blocked: Sub-categories of "${cat?.name}" are being used by ${subUsage.count} parts.`;
                await db('system_notices').insert({ message: msg, level: 'warning', category: 'deletion' });
                return res.status(400).json({ error: msg });
            }
        }
        await db('major_categories').where({ id: req.params.id }).del();
        await db('system_notices').insert({ message: `Major Category "${cat?.name}" and its sub-categories were deleted.`, level: 'success', category: 'deletion' });
        res.json({ success: true });
    }  catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Sub Categories ---
router.post('/sub-categories', authenticateToken, hasPermission('can_add_parts'), async (req, res) => {
    try {
        const [inserted_id] = await db('sub_categories').insert({ name: req.body.name, major_category_id: req.body.major_category_id }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.json({ id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/sub-categories/:major_category_id', authenticateToken, hasPermission('can_view_parts'), async (req, res) => {
    try {
        const subCategories = await db('sub_categories as sc')
            .leftJoin('parts as p', 'sc.id', 'p.sub_category_id')
            .select('sc.*')
            .count('p.id as part_count')
            .sum('p.current_qty as total_qty')
            .where('sc.major_category_id', req.params.major_category_id)
            .groupBy('sc.id')
            .orderBy('sc.name');
        res.json({ data: subCategories || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/sub-categories/:id', authenticateToken, hasPermission('can_edit_parts'), async (req, res) => {
    try {
        await db('sub_categories').where({ id: req.params.id }).update({ name: req.body.name });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete('/sub-categories/:id', authenticateToken, hasPermission('can_delete_parts'), async (req, res) => {
    try {
        const scat = await db('sub_categories').where({ id: req.params.id }).first();
        const usage = await db('parts').where({ sub_category_id: req.params.id }).count('id as count').first();
        if (usage.count > 0) {
            const msg = `Deletion Blocked: Sub-category "${scat?.name}" is being used by ${usage.count} parts.`;
            await db('system_notices').insert({ message: msg, level: 'warning', category: 'deletion' });
            return res.status(400).json({ error: msg });
        }
        await db('sub_categories').where({ id: req.params.id }).del();
        await db('system_notices').insert({ message: `Sub-category "${scat?.name}" was successfully deleted.`, level: 'success', category: 'deletion' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Unified Stock Management ---
router.get('/parts', authenticateToken, hasPermission('can_view_parts'), async (req, res) => {
    try {
        const parts = await db('parts as p')
            .leftJoin('major_categories as mc', 'p.major_category_id', 'mc.id')
            .leftJoin('sub_categories as sc', 'p.sub_category_id', 'sc.id')
            .leftJoin('brands as b', 'p.brand_id', 'b.id')
            .select(
                'p.id', 
                'p.entry_date', 
                'p.major_category_id',
                'p.sub_category_id',
                'p.brand_id',
                'mc.name as major_category', 
                'sc.name as sub_category', 
                'b.name as brand', 
                'p.applicable_model', 
                'p.parts_details_name', 
                'p.packaging_brand', 
                'p.mrp', 
                'p.purchase_price', 
                'p.sale_price', 
                'p.current_qty', 
                'p.shelf_rack_no', 
                'p.remark'
            )
            .orderBy('p.id', 'desc');
        res.json({ data: parts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/parts', authenticateToken, hasPermission('can_add_parts'), async (req, res) => {
    const { entry_date, major_category_id, sub_category_id, brand_id, applicable_model, parts_details_name, packaging_brand, mrp, purchase_price, sale_price, current_qty, shelf_rack_no, remark } = req.body;
    const errors = [];
    if (!entry_date) errors.push("Entry date is required.");
    if (!major_category_id) errors.push("Major category is required.");
    if (!sub_category_id) errors.push("Sub category is required.");
    if (!brand_id) errors.push("Brand is required.");
    if (!parts_details_name || parts_details_name.trim() === '') errors.push("Parts details name is required.");
    if (mrp === undefined || isNaN(mrp) || mrp < 0) errors.push("MRP must be a non-negative number.");
    if (purchase_price === undefined || isNaN(purchase_price) || purchase_price < 0) errors.push("Purchase price must be a non-negative number.");
    if (sale_price === undefined || isNaN(sale_price) || sale_price < 0) errors.push("Sale price must be a non-negative number.");
    if (current_qty === undefined || isNaN(current_qty) || current_qty < 0) errors.push("Current quantity must be a non-negative integer.");

    if (errors.length > 0) return res.status(400).json({ error: "Validation failed", details: errors });

    try {
        const [inserted_id] = await db('parts').insert({ entry_date, major_category_id, sub_category_id, brand_id, applicable_model, parts_details_name, packaging_brand, mrp, purchase_price, sale_price, current_qty, shelf_rack_no, remark }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.json({"message": "success", "id": id});
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

router.put('/parts/:id', authenticateToken, hasPermission('can_edit_parts'), async (req, res) => {
    const { entry_date, major_category_id, sub_category_id, brand_id, applicable_model, parts_details_name, packaging_brand, mrp, purchase_price, sale_price, current_qty, shelf_rack_no, remark } = req.body;
    const errors = [];
    if (mrp !== undefined && (isNaN(mrp) || mrp < 0)) errors.push("MRP must be a non-negative number.");
    if (purchase_price !== undefined && (isNaN(purchase_price) || purchase_price < 0)) errors.push("Purchase price must be a non-negative number.");
    if (sale_price !== undefined && (isNaN(sale_price) || sale_price < 0)) errors.push("Sale price must be a non-negative number.");
    if (current_qty !== undefined && (isNaN(current_qty) || current_qty < 0)) errors.push("Current quantity must be a non-negative integer.");
    if (parts_details_name !== undefined && parts_details_name.trim() === '') errors.push("Parts details name cannot be empty.");

    if (errors.length > 0) return res.status(400).json({ error: "Validation failed", details: errors });

    const partData = {};
    if (entry_date) partData.entry_date = entry_date;
    if (major_category_id) partData.major_category_id = major_category_id;
    if (sub_category_id) partData.sub_category_id = sub_category_id;
    if (brand_id) partData.brand_id = brand_id;
    if (applicable_model) partData.applicable_model = applicable_model;
    if (parts_details_name) partData.parts_details_name = parts_details_name;
    if (packaging_brand) partData.packaging_brand = packaging_brand;
    if (mrp) partData.mrp = mrp;
    if (purchase_price) partData.purchase_price = purchase_price;
    if (sale_price) partData.sale_price = sale_price;
    if (current_qty) partData.current_qty = current_qty;
    if (shelf_rack_no) partData.shelf_rack_no = shelf_rack_no;
    if (remark) partData.remark = remark;

    try {
        const changes = await db('parts').where({ id: req.params.id }).update(partData);
        res.json({"message": "success", "changes": changes});
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

router.post('/parts/import', authenticateToken, hasPermission('can_add_parts'), async (req, res) => {
    const partsData = req.body;
    if (!Array.isArray(partsData) || partsData.length === 0) return res.status(400).json({ error: "No data provided." });

    try {
        await db.transaction(async (trx) => {
            for (const item of partsData) {
                if (!item.parts_details_name || !item.major_category_id || !item.sub_category_id || !item.brand_id) {
                    throw new Error(`Invalid data for part: ${item.parts_details_name || 'Unknown'}.`);
                }
                await trx('parts').insert({
                    entry_date: item.entry_date || new Date().toISOString().slice(0, 10),
                    major_category_id: item.major_category_id,
                    sub_category_id: item.sub_category_id,
                    brand_id: item.brand_id,
                    applicable_model: item.applicable_model || '',
                    parts_details_name: item.parts_details_name,
                    packaging_brand: item.packaging_brand || '',
                    mrp: item.mrp || 0,
                    purchase_price: item.purchase_price || 0,
                    sale_price: item.sale_price || 0,
                    current_qty: item.current_qty || 0,
                    shelf_rack_no: item.shelf_rack_no || '',
                    remark: item.remark || ''
                });
            }
        });
        res.json({ message: `Successfully imported ${partsData.length} parts.` });
    } catch (err) {
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

router.put('/parts/:id/reorder', authenticateToken, hasPermission('can_set_reorder_flag'), async (req, res) => {
    const { flag } = req.body;
    try {
        await db('parts').where({ id: req.params.id }).update({ reorder_flag: flag ? 1 : 0 });
        res.json({ message: `Reorder flag set.` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/reorder-report', authenticateToken, hasPermission('can_view_parts'), async (req, res) => {
    try {
        const report = await db('parts as p').select('p.id', 'p.parts_details_name', 'p.current_qty').where('p.current_qty', 0).orWhere('p.reorder_flag', 1).orderBy('p.parts_details_name');
        res.json({ data: report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
