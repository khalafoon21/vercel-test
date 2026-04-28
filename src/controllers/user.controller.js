const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const { getPostData } = require('../utils/helpers');

// جلب بيانات الملف الشخصي
async function getProfile(req, res) {
    try {
        const userId = req.user.userId;
        const user = await UserModel.getById(userId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: user
        }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'An error occurred while fetching profile'
        }));
    }
}

// تحديث بيانات الملف الشخصي
async function updateProfile(req, res) {
    try {
        const userId = req.user.userId;
        const body = await getPostData(req);

        // جلب البيانات الحالية للمستخدم لاستخدامها كقيم افتراضية في حالة عدم إرسال بعض الحقول
        const currentUser = await UserModel.getById(userId);
        if (!currentUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'User not found'
            }));
        }

        // تجهيز البيانات المحدثة شاملة الحقول الإضافية المطلوبة للمشروع
        const profileData = {
            first_name: body.first_name || currentUser.first_name,
            last_name: body.last_name || currentUser.last_name,
            phone: body.phone || currentUser.phone || '',
            address: body.address || currentUser.address || '',     // ✨ الحقل الجديد: العنوان
            birthdate: body.birthdate || currentUser.birthdate || '', // ✨ الحقل الجديد: تاريخ الميلاد
            city: body.city || currentUser.city || '',              // ✨ الحقل الجديد: المدينة
            country: body.country || currentUser.country || ''      // ✨ الحقل الجديد: البلد
        };

        // تنفيذ عملية التحديث في قاعدة البيانات
        await UserModel.updateProfile(userId, profileData);

        // معالجة تغيير كلمة المرور إذا تم إرسال كلمة مرور جديدة
        if (body.new_password && String(body.new_password).trim().length > 0) {
            if (String(body.new_password).length < 6) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    message: 'Password must be at least 6 characters'
                }));
            }
            const hash = await bcrypt.hash(body.new_password, 10);
            await UserModel.updatePassword(userId, hash);
        }

        // جلب البيانات بعد التحديث لإعادتها للفرونت اند
        const updatedUser = await UserModel.getById(userId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        }));
    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'Invalid JSON payload'
            }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'An error occurred while updating profile'
        }));
    }
}

module.exports = { getProfile, updateProfile };