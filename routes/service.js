const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth'); // Import hasPermission

router.get('/service/customer/:customerId', authenticateToken, hasPermission('can_view_service_jobs'), async (req, res) => {
    const { customerId } = req.params;
    console.time(`HistoryFetch-${customerId}`);
    try {
        const jobs = await db('service_jobs')
            .select('id', 'job_date', 'status', 'total_cost', 'payment_method')
            .where({ customer_id: customerId })
            .orderBy('id', 'desc'); // Order by ID is faster than Date
        
        console.timeEnd(`HistoryFetch-${customerId}`);
        res.json({ data: jobs || [] });
    } catch (err) {
        console.timeEnd(`HistoryFetch-${customerId}`);
        res.status(500).json({ error: err.message });
    }
});

router.post('/service', authenticateToken, hasPermission('can_create_service_jobs'), async (req, res) => { // Added permission
    const { customer_id, mechanic_id } = req.body; // Accept mechanic_id

    // --- Validation ---
    const errors = [];
    if (!customer_id || isNaN(customer_id)) errors.push("Valid customer_id is required.");
    if (!mechanic_id || isNaN(mechanic_id)) errors.push("Valid mechanic_id is required.");


    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }
    // --- End Validation ---

    const job_date = new Date().toISOString();
    const status = 'Open';
    const total_cost = 0;
    const mechanic_service_charge = 0;

    try {
        const [inserted_id] = await db('service_jobs').insert({
            customer_id,
            mechanic_id,
            job_date,
            status,
            total_cost,
            mechanic_service_charge,
        }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.status(201).json({ message: "Service job created successfully.", id });
    } catch (err) {
        // Check for foreign key constraint error if customer_id doesn't exist
        if (err.message.includes('FOREIGN KEY constraint failed')) {
            return res.status(400).json({ error: "Customer not found. Invalid customer_id." });
        }
        return res.status(500).json({ error: err.message });
    }
});
router.get('/service/today/:customerId', authenticateToken, hasPermission('can_view_service_jobs'), async (req, res) => { // Added permission
    const customerId = req.params.customerId;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    try {
        const job = await db('service_jobs')
            .where({
                customer_id: customerId,
                status: 'Open'
            })
            .andWhere(db.raw("date(job_date) = ?", [today]))
            .first();
        res.json({ data: job || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/service/:id/parts', authenticateToken, hasPermission('can_add_parts_to_service_job'), async (req, res) => { // Added permission
    const service_job_id = req.params.id;
    const { part_id, quantity_used, sale_price_at_time } = req.body;

    // --- Validation ---
    const errors = [];
    if (!part_id || isNaN(part_id)) errors.push("Valid part_id is required.");
    if (!quantity_used || isNaN(quantity_used) || quantity_used <= 0) errors.push("Quantity used must be a positive number.");
    if (sale_price_at_time === undefined || isNaN(sale_price_at_time) || sale_price_at_time < 0) errors.push("Sale price at time must be a non-negative number.");
    if (!service_job_id || isNaN(service_job_id)) errors.push("Valid service_job_id is required in URL.");

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }
    // --- End Validation ---

    try {
        await db.transaction(async (trx) => {
            const part = await trx('parts').where({ id: part_id }).first();
            if (!part) {
                throw new Error("Part not found.");
            }
            if (part.current_qty < quantity_used) {
                throw new Error(`Not enough stock for part_id ${part_id}. Available: ${part.current_qty}. Requested: ${quantity_used}.`);
            }

            await trx('service_job_parts').insert({
                service_job_id,
                part_id,
                quantity_used,
                sale_price_at_time
            });

            await trx('parts').where({ id: part_id }).decrement('current_qty', quantity_used);

            const { parts_total, discount_amount } = await trx('service_jobs as sj')
                .leftJoin('service_job_parts as sjp', 'sj.id', 'sjp.service_job_id')
                .where('sj.id', service_job_id)
                .select(db.raw('SUM(sjp.quantity_used * sjp.sale_price_at_time) as parts_total'), 'sj.discount_amount')
                .first();

            const newTotalCost = (parts_total || 0) - (discount_amount || 0);

            await trx('service_jobs').where({ id: service_job_id }).update({ total_cost: newTotalCost });
        });

        res.status(201).json({ message: "Part added to service job successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/service/:jobId/parts/:partRecordId', authenticateToken, hasPermission('can_remove_parts_from_service_job'), async (req, res) => { // Added permission
    const { jobId, partRecordId } = req.params;

    // --- Validation ---
    const errors = [];
    if (!jobId || isNaN(jobId)) errors.push("Valid jobId is required in URL.");
    if (!partRecordId || isNaN(partRecordId)) errors.push("Valid partRecordId is required in URL.");

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }
    // --- End Validation ---

    try {
        await db.transaction(async (trx) => {
            const partRecord = await trx('service_job_parts').where({ id: partRecordId, service_job_id: jobId }).first();
            if (!partRecord) {
                throw new Error("Part record not found in this service job.");
            }

            const numDeleted = await trx('service_job_parts').where({ id: partRecordId }).del();
            if (numDeleted === 0) {
                throw new Error("Part record not found for deletion.");
            }

            await trx('parts').where({ id: partRecord.part_id }).increment('current_qty', partRecord.quantity_used);

            const { parts_total, discount_amount } = await trx('service_jobs as sj')
                .leftJoin('service_job_parts as sjp', 'sj.id', 'sjp.service_job_id')
                .where('sj.id', jobId)
                .select(db.raw('SUM(sjp.quantity_used * sjp.sale_price_at_time) as parts_total'), 'sj.discount_amount')
                .first();

            const newTotalCost = (parts_total || 0) - (discount_amount || 0);

            await trx('service_jobs').where({ id: jobId }).update({ total_cost: newTotalCost });
        });

        res.json({ message: "Part removed from service job successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/service/:id', authenticateToken, hasPermission('can_view_service_jobs'), async (req, res) => {
    const serviceJobId = req.params.id;

    try {
        const job = await db('service_jobs as sj')
            .join('customers as c', 'sj.customer_id', 'c.id')
            .leftJoin('mechanics as m', 'sj.mechanic_id', 'm.id') // Join with mechanics
            .select(
                'sj.*',
                'c.name AS customer_name',
                'c.phone AS customer_phone',
                'c.vehicle_number AS vehicle_number',
                'c.bike_model AS bike_model',
                'm.name AS mechanic_name' // Add mechanic name
            )
            .where('sj.id', serviceJobId)
            .first();
        
        if (!job) {
            return res.status(404).json({ error: "Service job not found." });
        }

        const parts = await db('service_job_parts as sjp')
            .join('parts as p', 'sjp.part_id', 'p.id')
            .select(
                'sjp.id AS partRecordId',
                'p.id AS part_id',
                'p.parts_details_name',
                'sjp.quantity_used',
                'sjp.sale_price_at_time'
            )
            .where('sjp.service_job_id', serviceJobId)
            .orderBy('sjp.id', 'asc');

        const partsTotal = parts.reduce((sum, part) => sum + (part.quantity_used * part.sale_price_at_time), 0);
        job.total_cost = partsTotal - (job.discount_amount || 0) + (job.mechanic_service_charge || 0);

        res.json({ data: { ...job, parts: parts || [] } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/service/:jobId/summary', authenticateToken, hasPermission('can_update_service_job_summary'), async (req, res) => {
    const jobId = req.params.jobId;
    const { discount_amount, mechanic_service_charge } = req.body;

    const discount = parseFloat(discount_amount || 0);
    const mechCharge = parseFloat(mechanic_service_charge || 0);

    try {
        await db.transaction(async (trx) => {
            const numUpdated = await trx('service_jobs')
                .where({ id: jobId })
                .update({ 
                    discount_amount: discount, 
                    mechanic_service_charge: mechCharge 
                });

            if (numUpdated === 0) {
                throw new Error("Service job not found.");
            }

            const parts_res = await trx('service_job_parts')
                .where({ service_job_id: jobId })
                .select(db.raw('SUM(quantity_used * sale_price_at_time) as parts_total'))
                .first();

            const partsTotal = parts_res.parts_total || 0;
            const newTotalCost = (partsTotal - discount + mechCharge);

            await trx('service_jobs').where({ id: jobId }).update({ total_cost: newTotalCost });
        });

        res.json({ message: "Job summary updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/service/:id/close', authenticateToken, hasPermission('can_close_service_jobs'), async (req, res) => {
    const jobId = req.params.id;
    const { payment_method, discount_amount, mechanic_service_charge } = req.body;

    // --- Validation ---
    const errors = [];
    if (!jobId || isNaN(jobId)) errors.push("Valid job ID is required in URL.");
    if (!payment_method || (payment_method !== 'Cash' && payment_method !== 'Online')) errors.push("Payment method must be 'Cash' or 'Online'.");

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const discount = parseFloat(discount_amount || 0);
    const mechCharge = parseFloat(mechanic_service_charge || 0);

    try {
        await db.transaction(async (trx) => {
            // 1. Update summary first to ensure total_cost is correct
            const parts_res = await trx('service_job_parts')
                .where({ service_job_id: jobId })
                .select(db.raw('SUM(quantity_used * sale_price_at_time) as parts_total'))
                .first();

            const partsTotal = parts_res.parts_total || 0;
            const finalTotal = partsTotal - discount + mechCharge;

            const numUpdated = await trx('service_jobs')
                .where({ id: jobId })
                .update({ 
                    status: 'Closed', 
                    payment_method,
                    discount_amount: discount,
                    mechanic_service_charge: mechCharge,
                    total_cost: finalTotal
                });

            if (numUpdated === 0) {
                throw new Error("Service job not found or already closed.");
            }
        });

        res.json({ message: `Service job ${jobId} closed and charges saved.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/service/:jobId/reopen', authenticateToken, hasPermission('can_reopen_service_jobs'), async (req, res) => {
    const { jobId } = req.params;
    const today = new Date().toISOString().slice(0, 10);

    try {
        const job = await db('service_jobs').where({ id: jobId }).first();
        if (!job) {
            return res.status(404).json({ error: "Service job not found." });
        }
        if (job.status !== 'Closed') {
            return res.status(400).json({ error: "Job is not closed." });
        }

        // Use SQLite date() function via db.raw for a foolproof same-day check
        const dateCheck = await db.raw("SELECT id FROM service_jobs WHERE id = ? AND DATE(job_date) = ?", [jobId, today]);
        
        if (!dateCheck || dateCheck.length === 0) {
            console.log(`Reopen blocked: Job #${jobId} is from a different day.`);
            return res.status(400).json({ error: "Only same-day closed jobs can be reopened for security reasons." });
        }

        await db('service_jobs').where({ id: jobId }).update({ status: 'Open' });
        await db('system_notices').insert({ message: `Service Job #${jobId} was reopened for corrections.`, level: 'info', category: 'update' });
        res.json({ message: `Service job ${jobId} has been reopened.` });
    } catch (err) {
        res.status(500).json({ error: "Database error checking job status.", details: err.message });
    }
});

router.delete('/service/:jobId', authenticateToken, hasPermission('can_delete_service_jobs'), async (req, res) => { // Changed isAdmin
    const jobId = req.params.jobId;

    try {
        await db.transaction(async (trx) => {
            const partsToRestore = await trx('service_job_parts').where({ service_job_id: jobId });

            for (const part of partsToRestore) {
                await trx('parts').where({ id: part.part_id }).increment('current_qty', part.quantity_used);
            }

            await trx('service_job_parts').where({ service_job_id: jobId }).del();

            const numDeleted = await trx('service_jobs').where({ id: jobId }).del();

            if (numDeleted === 0) {
                throw new Error("Service job not found.");
            }
        });

        res.json({ message: "Service job and associated parts deleted successfully, stock restored." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NEW: Bulk Delete Service Jobs (Selective Cleanup) ---
router.post('/service/bulk-delete', authenticateToken, hasPermission('can_manage_settings'), async (req, res) => {
    const { ids } = req.body; // Array of IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No IDs provided for deletion." });
    }

    try {
        await db.transaction(async (trx) => {
            // 1. Restore stock for all parts in these jobs
            const partsToRestore = await trx('service_job_parts').whereIn('service_job_id', ids);
            for (const part of partsToRestore) {
                await trx('parts').where({ id: part.part_id }).increment('current_qty', part.quantity_used);
            }

            // 2. Delete linked parts
            await trx('service_job_parts').whereIn('service_job_id', ids).del();

            // 3. Delete the jobs
            await trx('service_jobs').whereIn('id', ids).del();

            // 4. Check if NO jobs remain, then reset counter to 0
            const remaining = await trx('service_jobs').count('id as count').first();
            if (remaining.count === 0) {
                await trx('sqlite_sequence').where({ name: 'service_jobs' }).update({ seq: 0 });
            }
        });

        res.json({ message: `${ids.length} jobs deleted and stock restored.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
