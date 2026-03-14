const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, hasPermission } = require('../middleware/auth'); // Import hasPermission

router.get('/sales', authenticateToken, hasPermission('can_view_sales_report'), async (req, res) => { // Added permission
    try {
        const sales = await db('service_jobs as sj')
            .join('service_job_parts as sjp', 'sj.id', 'sjp.service_job_id')
            .join('parts as p', 'sjp.part_id', 'p.id')
            .leftJoin('brands as b', 'p.brand_id', 'b.id')
            .select(
                'sj.id',
                'p.parts_details_name',
                'b.name as brand',
                'sjp.quantity_used AS quantity_sold',
                'sjp.sale_price_at_time AS sale_price',
                'sj.job_date AS sale_date',
                'sj.payment_method'
            )
            .where('sj.status', 'Closed')
            .orderBy('sj.job_date', 'desc');
        res.json({ data: sales });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sales records.", details: err.message });
    }
});

router.post('/sales', authenticateToken, hasPermission('can_create_direct_sales'), async (req, res) => { // Added permission
    const { part_id, quantity_sold, sale_price, paymentMethod } = req.body;

    // --- Validation ---
    const errors = [];
    if (!part_id || isNaN(part_id)) errors.push("Valid part_id is required.");
    if (!quantity_sold || isNaN(quantity_sold) || quantity_sold <= 0) errors.push("Quantity sold must be a positive number.");
    if (sale_price === undefined || isNaN(sale_price) || sale_price < 0) errors.push("Sale price must be a non-negative number.");

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }
    // --- End Validation ---

    const quantity = parseInt(quantity_sold, 10);
    const price = parseFloat(sale_price);
    const total_cost = quantity * price;
    const payment_method = paymentMethod || 'Cash'; // Default to Cash if not provided

    try {
        await db.transaction(async (trx) => {
            const customer = await trx('customers').where({ name: 'Walk-in Customer' }).first();
            if (!customer) {
                throw new Error("Could not find the default Walk-in Customer.");
            }

            const job_date = new Date().toISOString();
            const [inserted_service_job_id] = await trx('service_jobs').insert({
                customer_id: customer.id,
                job_date,
                status: 'Closed',
                total_cost,
                payment_method
            }).returning('id');
    const service_job_id = typeof inserted_service_job_id === 'object' ? inserted_service_job_id.id : inserted_service_job_id;

            await trx('service_job_parts').insert({
                service_job_id,
                part_id,
                quantity_used: quantity,
                sale_price_at_time: price,
            });

            const numUpdated = await trx('parts')
                .where({ id: part_id })
                .andWhere('current_qty', '>=', quantity)
                .decrement('current_qty', quantity);
            
            if (numUpdated === 0) {
                throw new Error("Not enough stock available.");
            }
        });

        res.status(201).json({ 
            message: "Sale recorded successfully.",
            customer: 'Walk-in Customer'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Delete Sale (Return) with Stock Reversal ---
router.delete('/sales/:id', authenticateToken, hasPermission('can_delete_sales'), async (req, res) => {
    const saleId = req.params.id;

    try {
        await db.transaction(async (trx) => {
            // 1. Get the parts associated with this sale to reverse stock
            const saleParts = await trx('service_job_parts').where({ service_job_id: saleId });
            
            for (const part of saleParts) {
                await trx('parts')
                    .where({ id: part.part_id })
                    .increment('current_qty', part.quantity_used);
            }

            // 2. Delete the part records
            await trx('service_job_parts').where({ service_job_id: saleId }).del();

            // 3. Delete the main sale (service_job) record
            await trx('service_jobs').where({ id: saleId }).del();
        });

        res.json({ message: "Sale deleted and stock reversed successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete sale.", details: err.message });
    }
});

module.exports = router;
