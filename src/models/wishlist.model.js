const getDb = require('../config/database');

class WishlistModel {
    static async getByUser(userId) {
        const db = getDb();
        return db.all(`
            SELECT w.id AS wishlist_item_id, w.created_at, p.*
            FROM wishlist_items w
            JOIN products p ON p.id = w.product_id
            WHERE w.user_id = ?
              AND COALESCE(p.status, 'approved') = 'approved'
            ORDER BY w.created_at DESC
        `, [userId]);
    }

    static async add(userId, productId) {
        const db = getDb();
        const product = await db.get(
            `SELECT id FROM products WHERE id = ? AND COALESCE(status, 'approved') = 'approved'`,
            [productId]
        );

        if (!product) throw new Error('Product not found');

        await db.run(
            `INSERT OR IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)`,
            [userId, productId]
        );
    }

    static async remove(userId, productId) {
        const db = getDb();
        const result = await db.run(
            `DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?`,
            [userId, productId]
        );
        return result.changes > 0;
    }
}

module.exports = WishlistModel;
