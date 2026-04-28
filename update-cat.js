const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// مسار الداتا بيز الصحيح في الروت فولدر
const dbPath = path.join(__dirname, 'database.sqlite'); 
const db = new sqlite3.Database(dbPath);

db.run("ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT 'fa-tags'", (err) => {
    if (err) console.log("إما أن الحقل موجود بالفعل أو هناك خطأ:", err.message);
    else console.log("✅ تم إضافة حقل الأيقونة (icon) لجدول الأقسام بنجاح بدون مسح أي داتا!");
    db.close();
});