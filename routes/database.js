const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs'); // Import fs module
const archiver = require('archiver'); // Import archiver
const { db } = require('../db');
const { authenticateToken, hasPermission } = require('../middleware/auth');

// @route   GET /api/database/backup
// @desc    Download a backup of the entire system (DB + essential config)
// @access  Private (Admin only)
router.get('/database/backup', authenticateToken, hasPermission('can_backup_database'), (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..'); // Root of the backend folder
        // Use a dynamic name for the zip file for better organization of multiple backups
        const outputFileName = `inventory_system_backup_${new Date().toISOString().slice(0, 10)}.zip`;
        const outputPath = path.join(__dirname, '..', outputFileName); // Temporary path for the zip file

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // Listen for all archive data to be written
        output.on('close', function() {
            console.log(`System backup created: ${archive.pointer()} total bytes`);
            // Set headers for file download
            res.attachment(outputFileName); // Sets Content-Disposition header
            res.sendFile(outputPath, (err) => {
                if (err) {
                    console.error("Error sending system backup:", err);
                    // Check if headers have already been sent to prevent errors
                    if (!res.headersSent) {
                        res.status(500).json({ error: "Could not download the system backup file." });
                    }
                }
                // Clean up the created zip file after sending
                fs.unlink(outputPath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting temporary zip file:", unlinkErr);
                });
            });
        });

        // Catch warnings (e.g. file not found)
        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            } else {
                throw err;
            }
        });

        // Catch errors
        archive.on('error', function(err) {
            console.error('Archiver error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error creating backup archive.' });
            }
            // Ensure the output stream is closed and cleaned up on error
            output.destroy();
            fs.unlink(outputPath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting temporary zip file after archiver error:", unlinkErr);
            });
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Files to include in the backup
        const filesToBackup = [
            'inventory.db',
            '.env',
            'knexfile.js',
            'package.json',
            'package-lock.json'
        ];

        filesToBackup.forEach(file => {
            const filePath = path.join(backupDir, file);
            // Check if file exists before adding to archive to prevent ENOENT errors
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file }); // Add file to the archive with its original name
            } else {
                console.warn(`Backup: File not found, skipping: ${filePath}`);
            }
        });

        // Finalize the archive (ie. write all previously appended files to the stream)
        archive.finalize();

    } catch (error) {
        console.error("Error preparing system backup:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "An unexpected error occurred while preparing the system backup." });
        }
    }
});

// --- NEW: Reset Service Jobs and ID Counter ---
router.post('/database/reset-service-ids', authenticateToken, hasPermission('can_manage_settings'), async (req, res) => {
    try {
        await db.transaction(async (trx) => {
            // 1. Delete all parts linked to jobs
            await trx('service_job_parts').del();
            // 2. Delete all service jobs
            await trx('service_jobs').del();
            // 3. Reset the Auto-increment counter in SQLite
            await trx('sqlite_sequence').where({ name: 'service_jobs' }).update({ seq: 0 });
        });
        res.json({ message: "Service records cleared and ID counter reset to 1." });
    } catch (err) {
        res.status(500).json({ error: "Failed to reset IDs.", details: err.message });
    }
});

module.exports = router;