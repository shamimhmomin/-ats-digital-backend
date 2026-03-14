const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth');

router.get('/mechanics', authenticateToken, hasPermission('can_view_mechanics'), async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        
        const mechanics = await db('mechanics as m')
            .select(
                'm.*',
                db.raw(`(
                    SELECT SUM(sj.mechanic_service_charge) 
                    FROM service_jobs sj 
                    WHERE sj.mechanic_id = m.id 
                    AND sj.status = 'Closed' 
                    AND sj.job_date LIKE ? || '%'
                ) as todays_earning`, [today])
            )
            .orderBy('m.name');

        res.json({ data: mechanics || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/mechanics/:id/report', authenticateToken, hasPermission('can_view_mechanics'), async (req, res) => {
    const mechanicId = req.params.id;
    const today = new Date().toISOString().slice(0, 10);

    try {
        const jobs = await db('service_jobs as sj')
            .join('customers as c', 'sj.customer_id', 'c.id')
            .select(
                'sj.id',
                'sj.job_date',
                'sj.mechanic_service_charge',
                'sj.status',
                'c.name as customer_name',
                'c.vehicle_number',
                'c.bike_model'
            )
            .where('sj.mechanic_id', mechanicId)
            .andWhere('sj.job_date', 'like', today + '%')
            .andWhere('sj.status', 'Closed')
            .orderBy('sj.id', 'desc');

        res.json({ data: jobs || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/mechanics', authenticateToken, hasPermission('can_add_mechanics'), async (req, res) => {
    const { name, phone, address } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Mechanic name is required." });
    }
    try {
        const [inserted_id] = await db('mechanics').insert({ name, phone, address }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.status(201).json({ id, name, phone, address });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: "A mechanic with this name already exists." });
        }
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/mechanics/:id', authenticateToken, hasPermission('can_delete_mechanics'), async (req, res) => {
    const mechanicId = req.params.id;
    try {
        const numDeleted = await db('mechanics').where({ id: mechanicId }).del();
        if (numDeleted === 0) {
            return res.status(404).json({ error: "Mechanic not found." });
        }
        res.json({ message: "Mechanic deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/mechanics/:id/full-report', authenticateToken, hasPermission('can_view_mechanics'), async (req, res) => {
    const mechanicId = req.params.id;
    const { startDate, endDate } = req.query;

    try {
        let query = db('service_jobs as sj')
            .join('customers as c', 'sj.customer_id', 'c.id')
            .select(
                'sj.id',
                'sj.job_date',
                'sj.mechanic_service_charge',
                'sj.status',
                'c.name as customer_name',
                'c.vehicle_number'
            )
            .where('sj.mechanic_id', mechanicId)
            .andWhere('sj.status', 'Closed');

        if (startDate && endDate) {
            if (startDate === endDate) {
                query = query.andWhere('sj.job_date', 'like', startDate + '%');
            } else {
                query = query.andWhere('sj.job_date', '>=', startDate)
                             .andWhere('sj.job_date', '<=', endDate + 'T23:59:59');
            }
        }

        const jobs = await query.orderBy('sj.id', 'desc');
        res.json({ data: jobs || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
