const path = require('path');

// Vercel Environment Detection
const isVercel = process.env.VERCEL || process.env.FUNCTION_NAME;

let dbInstance = null;

// Demo data for Vercel
const demoData = {
    users: [
        { id: 1, first_name: 'أحمد', last_name: 'محمد', email: 'admin@test.com', role: 'admin', password_hash: '$2a$10$demo', seller_status: 'approved' },
        { id: 2, first_name: 'سعيد', last_name: 'علي', email: 'seller@test.com', role: 'seller', seller_status: 'approved' },
        { id: 3, first_name: 'عمرو', last_name: 'خالد', email: 'user@test.com', role: 'user' }
    ],
    categories: [
        { id: 1, name: 'إلكترونيات', icon: 'fa-laptop' },
        { id: 2, name: 'ملابس', icon: 'fa-tshirt' },
        { id: 3, name: 'أحذية', icon: 'fa-shoe-prints' }
    ],
    products: [
        { 
            id: 1, seller_id: 2, title: 'آيفون 15 برو', description: 'أحدث موديل', 
            price: 45000, discount: 10, stock_quantity: 5, image_url: '/uploads/demo-iphone.jpg',
            category_id: 1, brand: 'Apple', status: 'approved', featured: 1
        },
        {
            id: 2, seller_id: 2, title: 'ساعة رياضية', description: 'ساعة ذكية', 
            price: 2500, discount: 20, stock_quantity: 10, image_url: '/uploads/demo-watch.jpg',
            category_id: 1, brand: 'Samsung', status: 'approved'
        }
    ],
    banners: [
        { 
            id: 1, title: 'تخفيضات حتى 50%', image_url: '/uploads/demo-banner1.jpg',
            bg_color: '#ff6b6b', button_color: '#ff4757'
        }
    ],
    cart_items: [],
    wishlist_items: [],
    orders: [],
    order_items: [],
    reviews: [
        { id: 1, product_id: 1, user_id: 3, rating: 5, comment: 'منتج ممتاز!' }
    ],
    tags: [{ id: 1, name: 'تخفيضات' }, { id: 2, name: 'جديد' }]
};

async function initDB() {
    if (isVercel) {
        // Vercel: Use in-memory mock DB with Promise-based API
        console.log('🧪 Vercel mode: Using in-memory demo database');
        
        // Helper to parse WHERE clauses
        const parseWhereClause = (query, params = []) => {
            const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
            if (!whereMatch) return null;
            
            const whereClause = whereMatch[1].trim();
            let paramIndex = 0;
            
            return (record) => {
                let clause = whereClause;
                clause = clause.replace(/\?/g, () => {
                    const value = params[paramIndex++];
                    if (typeof value === 'string') return `'${value}'`;
                    return value;
                });
                
                // Handle simple conditions like "id = 'value'"
                if (clause.includes('=')) {
                    const parts = clause.split('=');
                    const fieldName = parts[0].trim();
                    const fieldValue = parts[1].trim().replace(/'/g, '');
                    return String(record[fieldName]) === String(fieldValue);
                }
                return true;
            };
        };
        
        dbInstance = {
            all: (query, params = []) => {
                // Mock all() for SELECT queries - returns Promise
                return new Promise((resolve, reject) => {
                    try {
                        if (query.includes('SELECT')) {
                            const table = query.match(/FROM\s+(\w+)/i)?.[1];
                            if (demoData[table]) {
                                let results = demoData[table];
                                const whereFilter = parseWhereClause(query, params);
                                if (whereFilter) {
                                    results = results.filter(whereFilter);
                                }
                                return resolve(results);
                            }
                        }
                        resolve([]);
                    } catch (err) {
                        console.error('Mock DB all() error:', err);
                        reject(err);
                    }
                });
            },
            run: (query, params = []) => {
                // Mock run() - no writes on Vercel, returns Promise
                return new Promise((resolve, reject) => {
                    try {
                        console.log('🚫 Vercel: Write operation blocked:', query.substring(0, 50));
                        resolve({ lastID: null, changes: 0 });
                    } catch (err) {
                        reject(err);
                    }
                });
            },
            get: (query, params = []) => {
                // Mock get() for single record - returns Promise
                return new Promise((resolve, reject) => {
                    try {
                        if (query.includes('SELECT')) {
                            const table = query.match(/FROM\s+(\w+)/i)?.[1];
                            if (demoData[table]) {
                                let results = demoData[table];
                                const whereFilter = parseWhereClause(query, params);
                                if (whereFilter) {
                                    results = results.filter(whereFilter);
                                }
                                return resolve(results[0] || null);
                            }
                        }
                        resolve(null);
                    } catch (err) {
                        console.error('Mock DB get() error:', err);
                        reject(err);
                    }
                });
            },
            exec: () => Promise.resolve()
        };
        return dbInstance;
    }

    // Local SQLite
    try {
        // ✅ تم النقل هنا: استدعاء المكتبات يتم فقط عند التشغيل محلياً
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');

        const dbPath = path.join(__dirname, '../../database.sqlite');
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

       await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT,
                role TEXT DEFAULT 'user',
                seller_status TEXT DEFAULT 'pending',
                profile_picture TEXT,
                email_verified INTEGER DEFAULT 1,
                activation_token TEXT,
                activation_expires DATETIME,
                reset_token TEXT,
                reset_expires DATETIME,
                address TEXT,        /* ✨ جديد: العنوان */
                birthdate DATE,      /* ✨ جديد: تاريخ الميلاد */
                city TEXT,           /* ✨ جديد: المدينة */
                country TEXT,        /* ✨ جديد: البلد */
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                icon TEXT DEFAULT 'fa-tags'
            );

            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seller_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                discount REAL DEFAULT 0,    /* ✨ جديد: نسبة الخصم الاختيارية */
                stock_quantity INTEGER NOT NULL DEFAULT 0,
                image_url TEXT,             /* الصورة الأساسية */
                category_id INTEGER,
                brand TEXT,                 /* ✨ جديد: العلامة التجارية */
                tags TEXT,                  /* ✨ جديد: الكلمات المفتاحية */
                status TEXT DEFAULT 'approved',
                featured INTEGER DEFAULT 0,
                images TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );

            /* ✨ جديد: جدول لصور المنتج الإضافية (عشان السلايدر Slider) */
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS banners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                image_url TEXT NOT NULL,
                bg_color TEXT DEFAULT '#ffffff',
                text_color TEXT DEFAULT '#1f2937',
                button_text TEXT DEFAULT 'اكتشف الآن',
                button_color TEXT DEFAULT '#0891b2',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS wishlist_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'Pending', 
                shipping_address TEXT NOT NULL,
                city TEXT,
                country TEXT,
                payment_method TEXT DEFAULT 'Cash on Delivery',
                notes TEXT,
                phone TEXT NOT NULL,          /* ✨ جديد: رقم الهاتف */
                full_name TEXT NOT NULL,      /* ✨ جديد: الاسم بالكامل */
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price_at_purchase REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT,
                reply TEXT, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);
        
        console.log('✅ تم الاتصال بقاعدة البيانات وتجهيز الجداول بنجاح!');
        
        dbInstance = db;
        return db;
    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    }
}

// السحر كله في الـ 4 سطور دول:
const getDb = () => dbInstance;

// بنربط دالة التهيئة بالدالة دي عشان نقدر نستدعيها من السيرفر قبل ما يشتغل
getDb.init = initDB; 

module.exports = getDb;