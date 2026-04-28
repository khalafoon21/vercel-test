const router = require('../src/router');
const getDb = require('../src/config/database');

let dbInitPromise = null;

async function ensureDbInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = getDb.init().catch((err) => {
            dbInitPromise = null;
            throw err;
        });
    }
    return dbInitPromise;
}

module.exports = async (req, res) => {
    try {
        await ensureDbInitialized();
        return router(req, res);
    } catch (error) {
        console.error('❌ Vercel runtime init failed:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            success: false,
            error: 'Server initialization failed'
        }));
    }
};
