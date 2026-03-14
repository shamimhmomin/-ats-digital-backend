const jwt = require('jsonwebtoken');
const { db } = require('../db'); // Import the db instance
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
};

const isUserOrAdmin = (req, res, next) => {
    if (req.user.role !== 'Admin' && req.user.role !== 'User') {
        return res.status(403).json({ error: "Access denied. Admins or Users only." });
    }
    next();
};

/**
 * Middleware to check if the authenticated user has a specific permission.
 * This should be used AFTER authenticateToken middleware.
 * @param {string} permissionKey The key of the permission to check (e.g., 'can_view_parts').
 * @returns {Function} Express middleware function.
 */
const hasPermission = (permissionKey) => {
    return async (req, res, next) => {
        // Ensure user is authenticated
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: "Unauthorized. Authentication required." });
        }

        try {
            // Check if the user's role has the required permission
            const hasPerm = await db('role_permissions')
                .where({
                    role_name: req.user.role,
                    permission_key: permissionKey
                })
                .first();

            if (hasPerm) {
                next(); // User has permission, proceed
            } else {
                return res.status(403).json({ error: `Access denied. Missing permission: ${permissionKey}.` });
            }
        } catch (error) {
            console.error(`Error checking permission '${permissionKey}' for role '${req.user.role}':`, error);
            return res.status(500).json({ error: "Internal server error while checking permissions." });
        }
    };
};

module.exports = {
    authenticateToken,
    isAdmin,
    isUserOrAdmin,
    hasPermission, // Export the new middleware
};
