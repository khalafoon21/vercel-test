
function sendForbidden(res, message = 'Forbidden') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: false,
        message
    }));
}

function normalizeRole(role) {
    return role === 'customer' ? 'user' : role;
}

function isAdmin(req, res) {
    return new Promise((resolve, reject) => {
        if (req.user && normalizeRole(req.user.role) === 'admin') {
            resolve(true); 
        } else {
            sendForbidden(res, 'Sorry, this page is restricted to administrators only');
            reject('Not Admin');
        }
    });
}

function isSeller(req, res) {
    return new Promise((resolve, reject) => {
        if (req.user && normalizeRole(req.user.role) === 'seller') {
            resolve(true);
        } else {
            sendForbidden(res, 'Sorry, this page is restricted to sellers only');
            reject('Not Seller');
        }
    });
}

function requireRole(...allowedRoles) {
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    return function checkRole(req, res) {
        return new Promise((resolve, reject) => {
            const role = normalizeRole(req.user && req.user.role);
            if (role && normalizedAllowed.includes(role)) {
                resolve(true);
            } else {
                sendForbidden(res, 'You are not allowed to access this resource');
                reject('Role not allowed');
            }
        });
    };
}

module.exports = { isAdmin, isSeller, requireRole, normalizeRole };
