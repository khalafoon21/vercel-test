const getDb = require('../config/database');

class ReviewModel {
    // 1. إضافة تقييم جديد (العميل)
    static async addReview(productId, userId, rating, comment) {
        const db = getDb();
        
        // نتأكد إن العميل مقيمش نفس المنتج قبل كده (عشان محدش يعمل سبام)
        const existing = await db.get(
            `SELECT * FROM reviews WHERE product_id = ? AND user_id = ?`, 
            [productId, userId]
        );
        if (existing) {
            throw new Error('لقد قمت بتقييم هذا المنتج مسبقاً!');
        }

        const result = await db.run(
            `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)`,
            [productId, userId, rating, comment]
        );
        return result.lastID;
    }

    // 2. جلب تقييمات منتج معين (بتظهر في صفحة المنتج)
    static async getProductReviews(productId) {
        const db = getDb();
        return await db.all(`
            SELECT r.*, u.first_name || ' ' || u.last_name AS customer_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `, [productId]);
    }

    // 3. إضافة رد على التقييم (للبائع والأدمن)
    static async addReply(reviewId, replyText) {
        const db = getDb();
        await db.run(`UPDATE reviews SET reply = ? WHERE id = ?`, [replyText, reviewId]);
    }

    static async getById(reviewId) {
        const db = getDb();
        return db.get(`
            SELECT r.*, p.seller_id
            FROM reviews r
            JOIN products p ON p.id = r.product_id
            WHERE r.id = ?
        `, [reviewId]);
    }

    static async updateReview(reviewId, data) {
        const db = getDb();
        await db.run(
            `UPDATE reviews SET rating = ?, comment = ? WHERE id = ?`,
            [data.rating, data.comment, reviewId]
        );
    }
}

module.exports = ReviewModel;
