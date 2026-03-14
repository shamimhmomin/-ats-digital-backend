const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, isAdmin, hasPermission } = require('../middleware/auth'); // Import hasPermission

// @route   GET /api/permissions
// @desc    Get all available permissions
// @access  Private (Admin only)
router.get('/permissions', authenticateToken, isAdmin, async (req, res) => { // Changed to isAdmin
    try {
        const permissions = await db('permissions').orderBy('category').orderBy('key');
        res.json({ data: permissions });
    } catch (err) {
        console.error("Error fetching permissions:", err);
        res.status(500).json({ error: "Failed to fetch permissions." });
    }
});

// @route   GET /api/roles/:roleName/permissions
// @desc    Get permissions for a specific role
// @access  Private (Admin only)
router.get('/roles/:roleName/permissions', authenticateToken, isAdmin, async (req, res) => { // Re-added isAdmin
    const { roleName } = req.params;
    try {
        const rolePermissions = await db('role_permissions')
            .where({ role_name: roleName })
            .select('permission_key');
        
        // Return an array of permission keys
        res.json({ data: rolePermissions.map(rp => rp.permission_key) });
    } catch (err) {
        console.error(`Error fetching permissions for role ${roleName}:`, err);
        res.status(500).json({ error: `Failed to fetch permissions for role ${roleName}.` });
    }
});

// @route   PUT /api/roles/:roleName/permissions
// @desc    Update permissions for a specific role
// @access  Private (Admin only)
router.put('/roles/:roleName/permissions', authenticateToken, isAdmin, async (req, res) => { // Changed to isAdmin
    const { roleName } = req.params;
    const { permissionKeys } = req.body; // Expects an array of permission keys

    if (!Array.isArray(permissionKeys)) {
        return res.status(400).json({ error: "permissionKeys must be an array." });
    }

    try {
        await db.transaction(async (trx) => {
            // 1. Delete existing permissions for the role
            await trx('role_permissions').where({ role_name: roleName }).del();

            // 2. Insert new permissions for the role
            if (permissionKeys.length > 0) {
                const newRolePermissions = permissionKeys.map(key => ({
                    role_name: roleName,
                    permission_key: key
                }));
                await trx('role_permissions').insert(newRolePermissions);
            }
        });

        res.json({ message: `Permissions for role '${roleName}' updated successfully.` });
    } catch (err) {
        console.error(`Error updating permissions for role ${roleName}:`, err);
        res.status(500).json({ error: `Failed to update permissions for role ${roleName}.` });
    }
});

module.exports = router;
