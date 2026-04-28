const getDb = require('../config/database');
const ProductModel = require('../models/product.model');
const OrderModel = require('../models/order.model');

async function getSellerProducts(req, res) {
    try {
        const products = await ProductModel.getAllForSeller(req.user.userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: products }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load seller products' }));
    }
}

async function getSellerOrders(req, res) {
    try {
        const orders = await OrderModel.getOrdersForSeller(req.user.userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: orders }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load seller orders' }));
    }
}

async function getSellerStats(req, res) {
    try {
        const data = await OrderModel.getSellerAnalytics(req.user.userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load seller stats' }));
    }
}

async function getSellerReviews(req, res) {
    try {
        const db = getDb();
        const reviews = await db.all(`
            SELECT r.*, p.title AS product_title, p.image_url,
                   u.first_name || ' ' || u.last_name AS customer_name
            FROM reviews r
            JOIN products p ON p.id = r.product_id
            JOIN users u ON u.id = r.user_id
            WHERE p.seller_id = ?
            ORDER BY r.created_at DESC
        `, [req.user.userId]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: reviews }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load seller reviews' }));
    }
}

module.exports = {
    getSellerProducts,
    getSellerOrders,
    getSellerStats,
    getSellerReviews
};
