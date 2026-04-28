const getDb = require('./config/database');

async function upgradeUser() {
    try {
        // 1. بنفتح الاتصال بقاعدة البيانات
        const db = await getDb.init();
        const email = 'ahmed@example.com';
        
        // 2. نفحص هل الحساب موجود أصلاً في قاعدة البيانات؟
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            console.log(`❌ الحساب اللي إيميله "${email}" مش موجود في قاعدة البيانات!`);
            console.log('💡 الحل: افتح الموقع، واعمل "إنشاء حساب جديد" بنفس الإيميل ده الأول، وبعدين شغل السكريبت تاني.');
            return;
        }

        // 3. لو الحساب موجود، نعمله ترقية
        await db.run(`UPDATE users SET role = 'admin' WHERE email = ?`, [email]);
        
        console.log(`✅ مبروك! تم ترقية حساب ${email} إلى أدمن (Admin) بنجاح.`);
        console.log('💡 ملحوظة هامة: لو كنت مسجل دخول في الموقع حالياً، لازم تعمل "تسجيل خروج" وتدخل تاني عشان الصلاحيات الجديدة تشتغل.');

    } catch (error) {
        console.error('❌ حصل خطأ أثناء التنفيذ:', error);
    }
}

upgradeUser();