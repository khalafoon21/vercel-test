require('dotenv').config();
const http = require('http');
const router = require('./router');
const getDb = require('./config/database');

// Vercel Environment Detection
const isVercel = process.env.VERCEL || process.env.FUNCTION_NAME;

if (isVercel) {
    // Export router for Vercel serverless
    module.exports = router;
    console.log('✅ Vercel Serverless mode - Router exported');
} else {
    // Local development mode
    const PORT = process.env.PORT || 3000;

    const server = http.createServer(async (req, res) => {
        // إعدادات الـ CORS عشان الفرونت اند يقدر يكلم السيرفر براحته
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // الرد على طلبات الـ Preflight بتاعت المتصفح
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // تمرير الطلب لملف الراوتر عشان يوزعه
        router(req, res);
    });

    // Initialize DB only for local dev
    getDb.init().then(() => {
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    }).catch(err => {
        console.error('❌ Database init failed:', err);
        process.exit(1);
    });
}
