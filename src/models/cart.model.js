const getDb = require('../config/database');

class CartModel {
    static async addItem(userId, productId, quantity) {
        const db = getDb();
        const product = await db.get(
            `SELECT id, stock_quantity, status FROM products WHERE id = ?`,
            [productId]
        );

        if (!product) {
            throw new Error('Product not found');
        }

        if (product.status && product.status !== 'approved') {
            throw new Error('Product is not available');
        }

        if (quantity > product.stock_quantity) {
            throw new Error('Requested quantity is not available');
        }

        const existingItem = await db.get(
            `SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?`, 
            [userId, productId]
        );

        if (existingItem) {
            if (existingItem.quantity + quantity > product.stock_quantity) {
                throw new Error('Requested quantity is not available');
            }

            await db.run(
                `UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`,
                [quantity, existingItem.id]
            );
            return existingItem.id;
        } else {
            const result = await db.run(
                `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`,
                [userId, productId, quantity]
            );
            return result.lastID;
        }
    }

    static async setItemQuantity(userId, productId, quantity) {
        const db = getDb();
        const product = await db.get(
            `SELECT id, stock_quantity, status FROM products WHERE id = ?`,
            [productId]
        );

        if (!product) {
            throw new Error('Product not found');
        }

        if (product.status && product.status !== 'approved') {
            throw new Error('Product is not available');
        }

        if (quantity > product.stock_quantity) {
            throw new Error('Requested quantity is not available');
        }

        const existingItem = await db.get(
            `SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?`,
            [userId, productId]
        );

        if (!existingItem) return null;

        if (quantity <= 0) {
            await db.run(
                `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`,
                [userId, productId]
            );
            return existingItem.id;
        }

        await db.run(
            `UPDATE cart_items SET quantity = ? WHERE id = ?`,
            [quantity, existingItem.id]
        );

        return existingItem.id;
    }

    static async removeItem(userId, productId) {
        const db = getDb();
        const result = await db.run(
            `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`,
            [userId, productId]
        );
        return result.changes > 0;
    }

    static async getCart(userId) {
        const db = getDb();
        // التعديل هنا: إضافة COALESCE للخصم لحساب السعر الفعلي بشكل صحيح
        return await db.all(`
            SELECT c.id AS cart_item_id, c.quantity, 
                   p.id AS product_id, p.title, p.price, p.discount, p.image_url,
                   (c.quantity * (p.price - (p.price * COALESCE(p.discount, 0) / 100))) AS total_price
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ? AND COALESCE(p.status, 'approved') = 'approved'
        `, [userId]);
    }
}

module.exports = CartModel;
