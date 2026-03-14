const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Create a new letter (NO SECURITY)
router.post('/letters', async (req, res) => {
    try {
        const { recipient_name, subject, content, type, place, issued_at } = req.body;
        const year = new Date().getFullYear();
        const lastLetter = await db('letters')
            .whereRaw('ref_no LIKE ?', [`AATS/${year}-%`])
            .orderBy('id', 'desc').first();

        let nextNum = 1;
        if (lastLetter) {
            const lastNum = parseInt(lastLetter.ref_no.split('-').pop());
            nextNum = lastNum + 1;
        }
        
        const ref_no = `AATS/${year}-${nextNum.toString().padStart(3, '0')}`;

        await db('letters').insert({
            ref_no, recipient_name, subject, content,
            type: type || 'General', place: place || 'Bhiwandi',
            issued_at: issued_at || new Date(),
            full_data: JSON.stringify(req.body),
            created_by: 1
        });

        res.json({ message: 'Letter recorded successfully', ref_no });
    } catch (error) {
        console.error('DATABASE ERROR (POST /letters):', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Update
router.put('/letters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { recipient_name, subject, content, type, place, issued_at } = req.body;
        await db('letters').where({ id }).update({
            recipient_name, subject, content, type, place, issued_at,
            full_data: JSON.stringify(req.body)
        });
        res.json({ message: 'Letter updated' });
    } catch (error) { 
        console.error('DATABASE ERROR (PUT /letters):', error);
        res.status(500).json({ error: 'Server error: ' + error.message }); 
    }
});

// Delete
router.delete('/letters/:id', async (req, res) => {
    try {
        await db('letters').where({ id: req.params.id }).del();
        res.json({ message: 'Deleted' });
    } catch (error) { 
        console.error('DATABASE ERROR (DELETE /letters):', error);
        res.status(500).json({ error: 'Server error: ' + error.message }); 
    }
});

// List
router.get('/letters', async (req, res) => {
    try {
        const letters = await db('letters').select('*').orderBy('id', 'desc');
        const parsed = letters.map(l => {
            let fullData = null;
            try {
                fullData = l.full_data ? JSON.parse(l.full_data) : null;
            } catch (e) {
                console.error('JSON Parse error for letter', l.id, e);
            }
            return { ...l, full_data: fullData };
        });
        res.json(parsed);
    } catch (error) { 
        console.error('DATABASE ERROR (GET /letters):', error);
        res.status(500).json({ error: 'Server error: ' + error.message }); 
    }
});

module.exports = router;
