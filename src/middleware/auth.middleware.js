const jwt = require('jsonwebtoken');
const { normalizeRole } = require('./role.middleware');
const getDb = require('../config/database');
require('dotenv').config();

function authenticate(req, res) {
    return new Promise(async (resolve, reject) => {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
            return reject('No token');
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
            const userId = decoded.userId || decoded.id;

            if (!userId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
                return reject('Invalid token payload');
            }

            const db = getDb();
            const user = db
                ? await db.get('SELECT id, role, seller_status FROM users WHERE id = ?', [userId])
                : null;

            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
                return reject('User not found');
            }

            req.user = {
                ...decoded,
                userId: user.id,
                role: normalizeRole(user.role),
                seller_status: user.seller_status || 'pending'
            };
            resolve(true);
        } catch (err) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Forbidden' }));
            reject('Invalid token');
        }
    });
}

module.exports = {authenticate};
