const WishlistModel = require('../models/wishlist.model');
const { getPostData } = require('../utils/helpers');

async function getWishlist(req, res) {
    try {
        const items = await WishlistModel.getByUser(req.user.userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: items }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load wishlist' }));
    }
}

async function addWishlist(req, res) {
    try {
        const { product_id } = await getPostData(req);
        const productId = Number(product_id);
        if (!productId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Product id is required' }));
        }

        await WishlistModel.add(req.user.userId, productId);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Product added to wishlist' }));
    } catch (error) {
        const status = error.message === 'Product not found' ? 404 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message || 'Could not add wishlist item' }));
    }
}

async function removeWishlist(req, res) {
    try {
        const { product_id } = await getPostData(req);
        const productId = Number(product_id);
        if (!productId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Product id is required' }));
        }

        await WishlistModel.remove(req.user.userId, productId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Product removed from wishlist' }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not remove wishlist item' }));
    }
}

module.exports = { getWishlist, addWishlist, removeWishlist };
