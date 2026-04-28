require('dotenv').config();

const router = require('../src/router');
const getDb = require('../src/config/database');

let dbInitPromise = null;

async function ensureDbInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = getDb.init().catch((err) => {
            console.error('❌ Database initialization error:', err.message);
            dbInitPromise = null;
            throw err;
        });
    }
    return dbInitPromise;
}

module.exports = async (req, res) => {
    // Set error handler to prevent unhandled rejections
    process.on('unhandledRejection', (err) => {
        console.error('❌ Unhandled rejection:', err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Internal Server Error'
            }));
        }
    });

    try {
        await ensureDbInitialized();
        return router(req, res);
    } catch (error) {
        console.error('❌ Vercel runtime error:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Server initialization failed: ' + error.message
            }));
        }
    }
};
