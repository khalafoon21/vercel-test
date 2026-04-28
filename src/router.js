const fs = require('fs');
const sysPath = require('path');
const url = require('url');

const { isAdmin, isSeller } = require('./middleware/role.middleware');
const { getAllUsers, updateUserRole } = require('./controllers/admin.controller');
const { checkout, getOrderHistory, updateOrderStatus, getAllOrdersAdmin, cancelOrder, getSalesAnalytics } = require('./controllers/order.controller'); 
const { addToCart, viewCart, updateCartItem, removeCartItem } = require('./controllers/cart.controller');
const { getProducts, getProductById, createProduct, getAdminProducts, updateProductStatusAdmin, updateProduct, deleteProduct } = require('./controllers/product.controller');
const { getSellerProducts, getSellerOrders, getSellerStats, getSellerReviews } = require('./controllers/seller.controller');
const { authenticate } = require('./middleware/auth.middleware');
const { getProfile, updateProfile } = require('./controllers/user.controller');
const { registerUser, loginUser, activateEmail, forgotPassword, resetPassword } = require('./controllers/auth.controller');
const { createReview, getReviews, replyToReview, updateReview } = require('./controllers/review.controller');
const { getAllCategories, createCategory, updateCategory, deleteCategory } = require('./controllers/category.controller');
const { getWishlist, addWishlist, removeWishlist } = require('./controllers/wishlist.controller');
const { getAllTags, createTag, updateTag, deleteTag } = require('./controllers/tag.controller');

// ✨ تم إضافة updateBanner و deleteBanner
const { getAllBanners, createBanner, updateBanner, deleteBanner } = require('./controllers/banner.controller');

const uploadsRoot = sysPath.resolve(__dirname, '..', 'uploads');
const frontendRoot = sysPath.resolve(__dirname, '..', 'frontend');

const router = async (req, res) => {
    const baseURL = `http://${req.headers.host}`;
    const parsedUrl = new URL(req.url, baseURL);
    const path = parsedUrl.pathname;
    const method = req.method;

    if (path.startsWith('/uploads/') && method === 'GET') {
        const requestedPath = path.replace(/^\/uploads\/?/, '');
        const filePath = sysPath.resolve(uploadsRoot, requestedPath);

        if (!filePath.startsWith(uploadsRoot + sysPath.sep)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Forbidden' }));
        }

        try {
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = sysPath.extname(filePath).toLowerCase();
                let contentType = 'application/octet-stream';
                if (ext === '.png') contentType = 'image/png';
                else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                else if (ext === '.webp') contentType = 'image/webp';

                res.writeHead(200, { 'Content-Type': contentType });
                const readStream = fs.createReadStream(filePath);
                return readStream.pipe(res);
            }
        } catch (error) { console.error(error); }
    }

    if (method === 'GET' && !path.startsWith('/api/') && !path.startsWith('/uploads/')) {
        const requestPath = path === '/' ? 'index.html' : path.replace(/^\//, '');
        const filePath = sysPath.resolve(frontendRoot, requestPath);

        if (!filePath.startsWith(frontendRoot + sysPath.sep)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Forbidden' }));
        }

        try {
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = sysPath.extname(filePath).toLowerCase();
                const mimeTypes = {
                    '.html': 'text/html; charset=utf-8',
                    '.css': 'text/css; charset=utf-8',
                    '.js': 'application/javascript; charset=utf-8',
                    '.json': 'application/json; charset=utf-8',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.webp': 'image/webp',
                    '.svg': 'image/svg+xml',
                    '.ico': 'image/x-icon',
                    '.gif': 'image/gif',
                    '.txt': 'text/plain; charset=utf-8'
                };

                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                const readStream = fs.createReadStream(filePath);
                return readStream.pipe(res);
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (path === '/api/register' && method === 'POST') return registerUser(req, res);
    if (path === '/api/login' && method === 'POST') return loginUser(req, res);
    if (path === '/api/auth/activate' && method === 'GET') return activateEmail(req, res);
    if (path === '/api/auth/forgot-password' && method === 'POST') return forgotPassword(req, res);
    if (path === '/api/auth/reset-password' && method === 'POST') return resetPassword(req, res);

    if (path === '/api/profile' && method === 'GET') { try { await authenticate(req, res); return getProfile(req, res); } catch (e) { return; } }
    if (path === '/api/profile' && method === 'PUT') { try { await authenticate(req, res); return updateProfile(req, res); } catch (e) { return; } }

    if (path === '/api/categories' && method === 'GET') return getAllCategories(req, res);
    if (path === '/api/categories' && method === 'POST') { try { await authenticate(req, res); return createCategory(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/categories/') && method === 'PUT') { try { await authenticate(req, res); const id = path.split('/').pop(); return updateCategory(req, res, Number(id)); } catch (e) { return; } }
    if (path.startsWith('/api/categories/') && method === 'DELETE') { try { await authenticate(req, res); const id = path.split('/').pop(); return deleteCategory(req, res, Number(id)); } catch (e) { return; } }

    if (path === '/api/tags' && method === 'GET') return getAllTags(req, res);
    if (path === '/api/tags' && method === 'POST') { try { await authenticate(req, res); return createTag(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/tags/') && method === 'PUT') { try { await authenticate(req, res); const id = path.split('/').pop(); return updateTag(req, res, Number(id)); } catch (e) { return; } }
    if (path.startsWith('/api/tags/') && method === 'DELETE') { try { await authenticate(req, res); const id = path.split('/').pop(); return deleteTag(req, res, Number(id)); } catch (e) { return; } }

    // ======= ✨ مسارات السلايدر =======
    if (path === '/api/banners' && method === 'GET') return getAllBanners(req, res);
    if (path === '/api/banners' && method === 'POST') { try { await authenticate(req, res); return createBanner(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/banners/') && method === 'PUT') { try { await authenticate(req, res); const id = path.split('/').pop(); return updateBanner(req, res, Number(id)); } catch (e) { return; } }
    if (path.startsWith('/api/banners/') && method === 'DELETE') { try { await authenticate(req, res); const id = path.split('/').pop(); return deleteBanner(req, res, Number(id)); } catch (e) { return; } }

    if (path === '/api/products' && method === 'GET') return getProducts(req, res);
    if (path === '/api/products' && method === 'POST') { try { await authenticate(req, res); return createProduct(req, res); } catch (e) { return; } }
    if (path === '/api/admin/products' && method === 'GET') { try { await authenticate(req, res); await isAdmin(req, res); return getAdminProducts(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/admin/products/') && path.endsWith('/status') && method === 'PUT') { try { await authenticate(req, res); await isAdmin(req, res); const id = path.split('/')[4]; return updateProductStatusAdmin(req, res, Number(id)); } catch (e) { return; } }
    if (path === '/api/seller/products' && method === 'GET') { try { await authenticate(req, res); await isSeller(req, res); return getSellerProducts(req, res); } catch (e) { return; } }
    if (path === '/api/seller/products' && method === 'POST') { try { await authenticate(req, res); await isSeller(req, res); return createProduct(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/seller/products/') && method === 'PUT') { try { await authenticate(req, res); await isSeller(req, res); const id = path.split('/').pop(); return updateProduct(req, res, Number(id)); } catch (e) { return; } }
    if (path.startsWith('/api/seller/products/') && method === 'DELETE') { try { await authenticate(req, res); await isSeller(req, res); const id = path.split('/').pop(); return deleteProduct(req, res, Number(id)); } catch (e) { return; } }
    if (path === '/api/seller/orders' && method === 'GET') { try { await authenticate(req, res); await isSeller(req, res); return getSellerOrders(req, res); } catch (e) { return; } }
    if (path === '/api/seller/stats' && method === 'GET') { try { await authenticate(req, res); await isSeller(req, res); return getSellerStats(req, res); } catch (e) { return; } }
    if (path === '/api/seller/reviews' && method === 'GET') { try { await authenticate(req, res); await isSeller(req, res); return getSellerReviews(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/products/') && method === 'GET') { const id = path.split('/').pop(); return getProductById(req, res, Number(id)); }
    if (path.startsWith('/api/products/') && method === 'PUT') { try { await authenticate(req, res); const id = path.split('/').pop(); return updateProduct(req, res, Number(id)); } catch (e) { return; } }
    if (path.startsWith('/api/products/') && method === 'DELETE') { try { await authenticate(req, res); const id = path.split('/').pop(); return deleteProduct(req, res, Number(id)); } catch (e) { return; } }

    if (path === '/api/cart' && method === 'POST') { try { await authenticate(req, res); return addToCart(req, res); } catch (e) { return; } }
    if (path === '/api/cart' && method === 'GET') { try { await authenticate(req, res); return viewCart(req, res); } catch (e) { return; } }
    if (path === '/api/cart/update' && method === 'POST') { try { await authenticate(req, res); return updateCartItem(req, res); } catch (e) { return; } }
    if (path === '/api/cart/remove' && method === 'POST') { try { await authenticate(req, res); return removeCartItem(req, res); } catch (e) { return; } }

    if (path === '/api/wishlist' && method === 'GET') { try { await authenticate(req, res); return getWishlist(req, res); } catch (e) { return; } }
    if (path === '/api/wishlist' && method === 'POST') { try { await authenticate(req, res); return addWishlist(req, res); } catch (e) { return; } }
    if (path === '/api/wishlist/remove' && method === 'POST') { try { await authenticate(req, res); return removeWishlist(req, res); } catch (e) { return; } }

    if (path === '/api/orders/checkout' && method === 'POST') { try { await authenticate(req, res); return checkout(req, res); } catch (e) { return; } }
    if (path === '/api/orders/history' && method === 'GET') { try { await authenticate(req, res); return getOrderHistory(req, res); } catch (e) { return; } }
    if (path === '/api/orders/update-status' && method === 'POST') { try { await authenticate(req, res); return updateOrderStatus(req, res); } catch (e) { return; } }
    if (path === '/api/orders/cancel' && method === 'POST') { try { await authenticate(req, res); return cancelOrder(req, res); } catch (e) { return; } }

    if (path === '/api/orders/all' && method === 'GET') { try { await authenticate(req, res); return getAllOrdersAdmin(req, res); } catch (e) { return; } }
    if (path === '/api/admin/analytics' && method === 'GET') { try { await authenticate(req, res); return getSalesAnalytics(req, res); } catch (e) { return; } }
    if (path === '/api/admin/users' && method === 'GET') { try { await authenticate(req, res); await isAdmin(req, res); return getAllUsers(req, res); } catch (e) { return; } }
    if (path === '/api/admin/users/role' && method === 'PUT') { try { await authenticate(req, res); await isAdmin(req, res); return updateUserRole(req, res); } catch (e) { return; } }

    if (path === '/api/reviews' && method === 'GET') return getReviews(req, res);
    if (path === '/api/reviews' && method === 'POST') { try { await authenticate(req, res); return createReview(req, res); } catch (e) { return; } }
    if (path.startsWith('/api/reviews/') && !path.endsWith('/reply') && method === 'PUT') { try { await authenticate(req, res); const id = path.split('/').pop(); return updateReview(req, res, Number(id)); } catch (e) { return; } }
    if (path.startsWith('/api/reviews/') && path.endsWith('/reply') && method === 'PUT') { try { await authenticate(req, res); const id = path.split('/')[3]; return replyToReview(req, res, Number(id)); } catch (e) { return; } }
    if (path === '/api/reviews/reply' && method === 'POST') { try { await authenticate(req, res); return replyToReview(req, res); } catch (e) { return; } }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: '(404 route not found)' }));
};

module.exports = router;
