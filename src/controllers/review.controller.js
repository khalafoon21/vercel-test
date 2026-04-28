const ReviewModel = require('../models/review.model');
const { getPostData } = require('../utils/helpers');
const url = require('url');

// 1. إضافة تقييم
async function createReview(req, res) {
    try {
        const userId = req.user.userId;
        const body = await getPostData(req);
        const { product_id, rating, comment } = body;

        if (!product_id || !rating || rating < 1 || rating > 5) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'رقم المنتج والتقييم (من 1 لـ 5) مطلوبان' }));
        }

        const reviewId = await ReviewModel.addReview(product_id, userId, rating, comment || '');
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم إضافة تقييمك بنجاح!', reviewId }));
    } catch (error) {
        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Invalid JSON payload' }));
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message || 'حدث خطأ أثناء إضافة التقييم' }));
    }
}

// 2. جلب تقييمات منتج معين
async function getReviews(req, res) {
    try {
        const parsedUrl = url.parse(req.url, true);
        const productId = parsedUrl.query.product_id;
        
        if (!productId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'يرجى إرسال رقم المنتج (product_id)' }));
        }

        const reviews = await ReviewModel.getProductReviews(productId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: reviews }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ أثناء جلب التقييمات' }));
    }
}

// 3. إضافة رد على تقييم (للبائع أو الأدمن)
async function replyToReview(req, res, reviewIdFromPath = null) {
    try {
        if (req.user.role !== 'seller' && req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'غير مصرح لك بالرد على التقييمات' }));
        }

        const body = await getPostData(req);
        const { review_id, reply } = body;
        const reviewId = reviewIdFromPath || review_id;

        if (!reviewId || !reply) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'رقم التقييم والرد مطلوبان' }));
        }

        const review = await ReviewModel.getById(reviewId);
        if (!review) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Review not found' }));
        }

        if (req.user.role !== 'admin' && Number(review.seller_id) !== Number(req.user.userId)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'You can only reply to reviews on your products' }));
        }

        await ReviewModel.addReply(reviewId, reply);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم إضافة الرد بنجاح' }));
    } catch (error) {
        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Invalid JSON payload' }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ أثناء إضافة الرد' }));
    }
}

async function updateReview(req, res, reviewId) {
    try {
        const body = await getPostData(req);
        const rating = Number(body.rating);
        const comment = String(body.comment || '').trim();

        if (!reviewId || !rating || rating < 1 || rating > 5 || !comment) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Valid rating and comment are required' }));
        }

        const review = await ReviewModel.getById(reviewId);
        if (!review) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Review not found' }));
        }

        const canEdit = req.user.role === 'admin' || Number(review.user_id) === Number(req.user.userId);
        if (!canEdit) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Not allowed to edit this review' }));
        }

        await ReviewModel.updateReview(reviewId, { rating, comment });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم تعديل التقييم بنجاح' }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'تعذر تعديل التقييم' }));
    }
}

module.exports = { createReview, getReviews, replyToReview, updateReview };
