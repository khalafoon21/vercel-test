const getDb = require('../config/database');

class UserModel {
    static async findByEmail(email) {
        const db = getDb();
        return await db.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    static async findByActivationToken(token) {
        const db = getDb();
        return await db.get('SELECT * FROM users WHERE activation_token = ?', [token]);
    }

    static async findByResetToken(token) {
        const db = getDb();
        return await db.get('SELECT * FROM users WHERE reset_token = ?', [token]);
    }

    static async create(userDATA) {
        const db = getDb();
        const { first_name, last_name, email, password_hash, phone, activation_token = null, activation_expires = null } = userDATA;
        const result = await db.run(
            `INSERT INTO users (first_name, last_name, email, password_hash, phone, role, email_verified, activation_token, activation_expires)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, password_hash, phone, 'user', activation_token ? 0 : 1, activation_token, activation_expires]
        );
        return result.lastID;
    }

    static async getById(userId) {
        const db = getDb();
        // ✨ تم إضافة الحقول الجديدة هنا عشان تظهر في البروفايل
        return await db.get(
            `SELECT id, first_name, last_name, email, phone, role, seller_status, profile_picture, email_verified, address, birthdate, city, country
             FROM users
             WHERE id = ?`,
            [userId]
        );
    }

    static async updateProfile(userId, profileData) {
        const db = getDb();
        // ✨ تم إضافة الحقول الجديدة عشان تتحدث في الداتا بيز
        const { first_name, last_name, phone, address, birthdate, city, country } = profileData;

        await db.run(
            `UPDATE users
             SET first_name = ?, last_name = ?, phone = ?, address = ?, birthdate = ?, city = ?, country = ?
             WHERE id = ?`,
            [first_name, last_name, phone, address, birthdate, city, country, userId]
        );
    }

    static async updatePassword(userId, passwordHash) {
        const db = getDb();
        await db.run(
            `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`,
            [passwordHash, userId]
        );
    }

    static async activate(userId) {
        const db = getDb();
        await db.run(
            `UPDATE users
             SET email_verified = 1, activation_token = NULL, activation_expires = NULL
             WHERE id = ?`,
            [userId]
        );
    }

    static async setResetToken(userId, token, expiresAt) {
        const db = getDb();
        await db.run(
            `UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`,
            [token, expiresAt, userId]
        );
    }
}
module.exports = UserModel;
