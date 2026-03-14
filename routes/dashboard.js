const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth');

router.get('/dashboard/summary', authenticateToken, hasPermission('can_view_dashboard_summary'), async (req, res) => {
    try {
        const summary = await db.raw(`
            SELECT
                (SELECT COUNT(*) FROM parts) as totalParts,
                (SELECT COUNT(*) FROM parts WHERE current_qty = 0 OR reorder_flag = 1) as lowStockParts,
                (SELECT COUNT(*) FROM customers WHERE name != 'Walk-in Customer') as totalCustomers,
                (SELECT COUNT(*) FROM service_jobs WHERE status = 'Open') as openServiceJobs
        `);
        // SQLite returns array of rows. Let's be extra safe.
        const result = (summary && Array.isArray(summary) && summary[0]) ? summary[0] : (summary && summary.totalParts !== undefined ? summary : { totalParts: 0, lowStockParts: 0, totalCustomers: 0, openServiceJobs: 0 });
        res.json({ data: result });
    } catch (err) {
        console.error('Dashboard Summary Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/dashboard/recent-service-jobs', authenticateToken, hasPermission('can_view_dashboard_summary'), async (req, res) => {
    try {
        const recentJobs = await db('service_jobs as sj')
            .join('customers as c', 'sj.customer_id', 'c.id')
            .select('sj.id', 'sj.job_date', 'sj.total_cost', 'sj.status', 'sj.payment_method', 'c.name as customer_name')
            .where('sj.status', 'Closed')
            .orderBy('sj.job_date', 'desc')
            .limit(5);
        res.json({ data: recentJobs || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/dashboard/revenue-summary', authenticateToken, hasPermission('can_view_revenue_summary'), async (req, res) => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
        const summary = await db.raw(`
            SELECT
                SUM(CASE WHEN STRFTIME('%Y', job_date) = ? AND STRFTIME('%m', job_date) = ? AND status = 'Closed' THEN (total_cost - COALESCE(mechanic_service_charge, 0)) ELSE 0 END) as monthlyRevenue,
                SUM(CASE WHEN STRFTIME('%Y', job_date) = ? AND status = 'Closed' THEN (total_cost - COALESCE(mechanic_service_charge, 0)) ELSE 0 END) as yearlyRevenue
            FROM service_jobs
        `, [String(currentYear), String(currentMonth).padStart(2, '0'), String(currentYear)]);
        const result = (summary && Array.isArray(summary) && summary[0]) ? summary[0] : (summary && summary.monthlyRevenue !== undefined ? summary : { monthlyRevenue: 0, yearlyRevenue: 0 });
        res.json({ data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/dashboard/daily-revenue-summary', authenticateToken, hasPermission('can_view_dashboard_summary'), async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    try {
        const summary = await db.raw(`
            SELECT
                SUM(CASE WHEN payment_method = 'Cash' THEN (total_cost - COALESCE(mechanic_service_charge, 0)) ELSE 0 END) as cashRevenue,
                SUM(CASE WHEN payment_method = 'Online' THEN (total_cost - COALESCE(mechanic_service_charge, 0)) ELSE 0 END) as onlineRevenue,
                SUM(COALESCE(mechanic_service_charge, 0)) as totalMechanicEarnings
            FROM service_jobs
            WHERE status = 'Closed' AND job_date LIKE ? || '%'
        `, [today]);
        const result = (summary && Array.isArray(summary) && summary[0]) ? summary[0] : (summary && summary.cashRevenue !== undefined ? summary : { cashRevenue: 0, onlineRevenue: 0, totalMechanicEarnings: 0 });
        res.json({ data: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/dashboard/daily-mechanic-details', authenticateToken, hasPermission('can_view_dashboard_summary'), async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    console.log('Fetching mechanic details for date:', today);
    try {
        const details = await db('service_jobs as sj')
            .join('customers as c', 'sj.customer_id', 'c.id')
            .join('mechanics as m', 'sj.mechanic_id', 'm.id')
            .select(
                'sj.id',
                'c.name as customer_name',
                'c.vehicle_number',
                'm.name as mechanic_name',
                'sj.mechanic_service_charge'
            )
            .where('sj.status', 'Closed')
            .andWhere('sj.job_date', 'like', today + '%');
        console.log(`Found ${details?.length || 0} mechanic records.`);
        res.json({ data: details || [] });
    } catch (err) {
        console.error('Error in daily-mechanic-details:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
