const express = require('express');
const router = express.Router();
const { db } = require('../db');

// --- STAFF MANAGEMENT ---

// Get all staff members
router.get('/hr/staff', async (req, res) => {
    try {
        const staff = await db('hr_staff').select('*').orderBy('name');
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch staff members' });
    }
});

// Add new staff member
router.post('/hr/staff', async (req, res) => {
    const { name, phone, role, salary_type, salary_amount, overtime_rate, joining_date } = req.body;
    try {
        const [inserted_id] = await db('hr_staff').insert({
            name, phone, role, salary_type, salary_amount, overtime_rate, joining_date
        }).returning('id');
    const id = typeof inserted_id === 'object' ? inserted_id.id : inserted_id;
        res.status(201).json({ id, message: 'Staff member added successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add staff member' });
    }
});

// Update staff member
router.put('/hr/staff/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, role, salary_type, salary_amount, overtime_rate, joining_date, is_active } = req.body;
    try {
        await db('hr_staff').where({ id }).update({
            name, phone, role, salary_type, salary_amount, overtime_rate, joining_date, is_active
        });
        res.json({ message: 'Staff member updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// --- ATTENDANCE TRACKING ---

// Mark daily attendance
router.post('/hr/attendance', async (req, res) => {
    const { staff_id, date, status, overtime_hours, note } = req.body;
    try {
        const existing = await db('hr_attendance').where({ staff_id, date }).first();
        if (existing) {
            await db('hr_attendance').where({ id: existing.id }).update({ status, overtime_hours, note });
        } else {
            await db('hr_attendance').insert({ staff_id, date, status, overtime_hours, note });
        }
        res.json({ message: 'Attendance recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});

// Get monthly attendance for reporting
router.get('/hr/attendance', async (req, res) => {
    const { month } = req.query; // YYYY-MM
    try {
        const attendance = await db('hr_attendance')
            .where('date', 'like', `${month}%`)
            .select('*');
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

// --- SALARY PAYMENTS ---

// Record final salary payment
router.post('/hr/salary-payments', async (req, res) => {
    const { staff_id, month, gross_salary, attendance_deduction, advance_deduction, bonus, net_salary, paid_amount, payment_date, payment_mode, status } = req.body;
    try {
        await db.transaction(async trx => {
            await trx('hr_salary_payments').insert({
                staff_id, month, gross_salary, attendance_deduction, advance_deduction, bonus, net_salary, paid_amount, payment_date, payment_mode, status
            });
            if (advance_deduction > 0) {
                await trx('hr_staff').where({ id: staff_id }).decrement('advance_balance', advance_deduction);
            }
        });
        res.json({ message: 'Salary payment recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record salary payment' });
    }
});

module.exports = router;
