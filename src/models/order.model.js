const getDb = require('../config/database');
const CartModel = require('./cart.model');

class OrderModel {
    // التعديل 1: إضافة phone و fullName للدالة
    static async createOrder(userId, shippingAddress, phone, fullName) {
        const db = getDb();
        const cartItems = await CartModel.getCart(userId);
        
        if (cartItems.length === 0) {
            throw new Error('سلة المشتريات فارغة. لا يمكن إتمام الطلب.');
        }

        let totalAmount = 0;
        cartItems.forEach(item => {
            // total_price جاية من الـ CartModel محسوبة وجاهزة (الكمية × السعر بعد الخصم)
            totalAmount += item.total_price;
        });

        // التعديل 2: إضافة مصاريف الشحن للإجمالي عشان يتطابق مع اللي اليوزر شافه في الـ Checkout
        totalAmount += 50; 

        // التعديل 3: إدخال البيانات الجديدة (phone, full_name) في جدول الطلبات
        await db.exec('BEGIN TRANSACTION');

        try {
            for (const item of cartItems) {
                const product = await db.get(
                    `SELECT stock_quantity FROM products WHERE id = ?`,
                    [item.product_id]
                );

                if (!product || product.stock_quantity < item.quantity) {
                    throw new Error(`Product "${item.title}" does not have enough stock.`);
                }
            }

            const orderResult = await db.run(
                `INSERT INTO orders (user_id, total_amount, shipping_address, phone, full_name) VALUES (?, ?, ?, ?, ?)`,
                [userId, totalAmount, shippingAddress, phone, fullName]
            );
            const orderId = orderResult.lastID;

        // تسجيل المنتجات داخل الطلب
            for (const item of cartItems) {
            // حساب سعر القطعة الواحدة لحظة الشراء (لتسجيلها في الفاتورة التاريخية بشكل صحيح)
            const finalPrice = item.discount > 0 ? item.price - (item.price * item.discount / 100) : item.price;
            
                await db.run(
                    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)`,
                    [orderId, item.product_id, item.quantity, finalPrice]
                );

                await db.run(
                    `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
                    [item.quantity, item.product_id]
                );
            }

        // مسح السلة بعد نجاح الطلب 100%
            await db.run(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);
            await db.exec('COMMIT');

            return orderId;
        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    }

    static async getUserOrders(userId) {
        const db = getDb();
        // جلب الطلبات الخاصة باليوزر فقط
        const orders = await db.all(
            `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, 
            [userId]
        );

        for (let order of orders) {
            const items = await db.all(`
                SELECT oi.product_id, oi.quantity, oi.price_at_purchase, p.title, p.image_url,
                       p.seller_id, u.first_name || ' ' || u.last_name AS seller_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN users u ON u.id = p.seller_id
                WHERE oi.order_id = ?
            `, [order.id]);
            
            order.items = items;
            order.subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price_at_purchase), 0);
            order.shipping_amount = Math.max(0, Number(order.total_amount || 0) - order.subtotal);
        }
        
        return orders;
    }

    // دالة الأدمن لجلب جميع الطلبات
    static async getAllOrders() {
        const db = getDb();
        
        const orders = await db.all(
            `SELECT * FROM orders ORDER BY created_at DESC`
        );

        for (let order of orders) {
            const items = await db.all(`
                SELECT oi.product_id, oi.quantity, oi.price_at_purchase, p.title, p.image_url,
                       p.seller_id, u.first_name || ' ' || u.last_name AS seller_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN users u ON u.id = p.seller_id
                WHERE oi.order_id = ?
            `, [order.id]);
            
            order.items = items;
            order.subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price_at_purchase), 0);
            order.shipping_amount = Math.max(0, Number(order.total_amount || 0) - order.subtotal);
        }
        
        return orders;
    }

    static async getOrdersForSeller(sellerId) {
        const db = getDb();

        const orders = await db.all(`
            SELECT DISTINCT o.*
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN products p ON p.id = oi.product_id
            WHERE p.seller_id = ?
            ORDER BY o.created_at DESC
        `, [sellerId]);

        for (let order of orders) {
            const items = await db.all(`
                SELECT oi.product_id, oi.quantity, oi.price_at_purchase,
                       p.title, p.image_url, p.seller_id
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ? AND p.seller_id = ?
            `, [order.id, sellerId]);

            order.items = items;
            order.seller_subtotal = items.reduce(
                (sum, item) => sum + (Number(item.quantity) * Number(item.price_at_purchase)),
                0
            );
            order.shipping_amount = 0;
        }

        return orders;
    }

    static async updateStatus(orderId, newStatus) {
        const db = getDb();
        await db.run(
            `UPDATE orders SET status = ? WHERE id = ?`,
            [newStatus, orderId]
        );
    }

    static async getById(orderId) {
        const db = getDb();
        return db.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    }

    static async cancelOrder(orderId, userId = null) {
        const db = getDb();
        const order = userId
            ? await db.get(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [orderId, userId])
            : await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId]);

        if (!order) throw new Error('Order not found');
        if (order.status === 'Delivered') throw new Error('Delivered orders cannot be cancelled');
        if (order.status === 'Shipped' && userId) throw new Error('Shipped orders cannot be cancelled by customer');
        if (order.status === 'Cancelled') return order;

        await db.exec('BEGIN TRANSACTION');
        try {
            const items = await db.all(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`, [orderId]);
            for (const item of items) {
                await db.run(
                    `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`,
                    [item.quantity, item.product_id]
                );
            }

            await db.run(`UPDATE orders SET status = 'Cancelled' WHERE id = ?`, [orderId]);
            await db.exec('COMMIT');
            return { ...order, status: 'Cancelled' };
        } catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    }

    static async getAnalytics() {
        const db = getDb();
        const totals = await db.get(`
            SELECT
                COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total_amount ELSE 0 END), 0) AS total_sales,
                COUNT(*) AS order_count
            FROM orders
        `);
        const products = await db.get(`SELECT COUNT(*) AS product_count FROM products`);
        const users = await db.get(`SELECT COUNT(*) AS user_count FROM users`);
        const latestOrders = await db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`);
        const bestProducts = await db.all(`
            SELECT p.id, p.title, p.image_url, SUM(oi.quantity) AS sold_quantity,
                   SUM(oi.quantity * oi.price_at_purchase) AS sales_total
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'Cancelled'
            GROUP BY p.id, p.title, p.image_url
            ORDER BY sold_quantity DESC
            LIMIT 5
        `);

        return {
            total_sales: totals.total_sales || 0,
            order_count: totals.order_count || 0,
            product_count: products.product_count || 0,
            user_count: users.user_count || 0,
            latest_orders: latestOrders,
            best_products: bestProducts
        };
    }

    static async getSellerAnalytics(sellerId) {
        const db = getDb();

        const totals = await db.get(`
            SELECT
                COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN oi.quantity * oi.price_at_purchase ELSE 0 END), 0) AS total_sales,
                COUNT(DISTINCT CASE WHEN o.status != 'Cancelled' THEN o.id END) AS total_orders
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE p.seller_id = ?
        `, [sellerId]);

        const products = await db.get(
            `SELECT COUNT(*) AS product_count FROM products WHERE seller_id = ?`,
            [sellerId]
        );

        const latestOrders = await db.all(`
            SELECT DISTINCT o.id, o.status, o.created_at, o.full_name, o.phone, o.shipping_address
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN products p ON p.id = oi.product_id
            WHERE p.seller_id = ?
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [sellerId]);

        const bestProducts = await db.all(`
            SELECT p.id, p.title, p.image_url,
                   COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                   COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) AS sales_total
            FROM products p
            JOIN order_items oi ON oi.product_id = p.id
            JOIN orders o ON o.id = oi.order_id
            WHERE p.seller_id = ? AND o.status != 'Cancelled'
            GROUP BY p.id, p.title, p.image_url
            ORDER BY sold_quantity DESC
            LIMIT 5
        `, [sellerId]);

        const lowStockProducts = await db.all(`
            SELECT id, title, image_url, stock_quantity
            FROM products
            WHERE seller_id = ? AND stock_quantity <= 5
            ORDER BY stock_quantity ASC, created_at DESC
            LIMIT 5
        `, [sellerId]);

        return {
            total_sales: totals.total_sales || 0,
            total_orders: totals.total_orders || 0,
            product_count: products.product_count || 0,
            latest_orders: latestOrders,
            best_products: bestProducts,
            low_stock_products: lowStockProducts
        };
    }
}

module.exports = OrderModel;
