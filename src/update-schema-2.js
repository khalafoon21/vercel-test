// src/update-schema-3.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// تأكد أن هذا هو مسار قاعدة البيانات الصحيح عندك
const dbPath = path.join(__dirname, 'config', 'ecommerce.db'); 
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // إضافة الأعمدة الجديدة المطلوبة في المشروع
    db.run("ALTER TABLE products ADD COLUMN discount REAL DEFAULT 0", (err) => { if(!err) console.log("تم إضافة عمود الخصم (discount)"); });
    db.run("ALTER TABLE products ADD COLUMN brand TEXT", (err) => { if(!err) console.log("تم إضافة عمود الماركة (brand)"); });
    db.run("ALTER TABLE products ADD COLUMN tags TEXT", (err) => { if(!err) console.log("تم إضافة عمود الوسوم (tags)"); });
    db.run("ALTER TABLE products ADD COLUMN images TEXT", (err) => { 
        if(!err) console.log("تم إضافة عمود الصور الإضافية (images)"); 
        console.log("✅ تم تحديث قاعدة البيانات بنجاح! يمكنك الآن تشغيل السيرفر.");
    });
});