const getDb = require('./config/database');

async function updateDatabase() {
    try {
        // بنفتح الاتصال بقاعدة البيانات
        const db = await getDb.init(); 
        console.log('🔄 جاري تحديث قاعدة البيانات...');

        // 1. إضافة الحقول الجديدة لجدول المستخدمين
        const userColumns = [
            'address TEXT', 
            'birthdate DATE', 
            'city TEXT', 
            'country TEXT'
        ];
        
        for (let col of userColumns) {
            try {
                await db.run(`ALTER TABLE users ADD COLUMN ${col}`);
                console.log(`✅ تم إضافة الحقل ${col.split(' ')[0]} لجدول المستخدمين.`);
            } catch (e) {
                // لو الحقل موجود بالفعل، SQLite هيطلع خطأ، فبنتجاهله عشان السكريبت يكمل
                if (e.message.includes('duplicate column name')) {
                    console.log(`⚠️ الحقل ${col.split(' ')[0]} موجود بالفعل في جدول المستخدمين.`);
                } else {
                    console.error('❌ خطأ:', e.message);
                }
            }
        }

        // 2. إضافة الحقول الجديدة لجدول المنتجات
        const productColumns = [
            'discount REAL DEFAULT 0', 
            'brand TEXT', 
            'tags TEXT'
        ];
        
        for (let col of productColumns) {
            try {
                await db.run(`ALTER TABLE products ADD COLUMN ${col}`);
                console.log(`✅ تم إضافة الحقل ${col.split(' ')[0]} لجدول المنتجات.`);
            } catch (e) {
                if (e.message.includes('duplicate column name')) {
                    console.log(`⚠️ الحقل ${col.split(' ')[0]} موجود بالفعل في جدول المنتجات.`);
                } else {
                    console.error('❌ خطأ:', e.message);
                }
            }
        }

        // 3. إنشاء جدول صور المنتجات (للسلايدر) لو مش موجود
        await db.exec(`
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );
        `);
        console.log(`✅ تم التأكد من جاهزية جدول صور المنتجات (product_images).`);

        console.log('🎉 تم تحديث قاعدة البيانات بنجاح بدون حذف أي بيانات قديمة!');

    } catch (error) {
        console.error('❌ حصل خطأ أساسي:', error);
    }
}

updateDatabase();