const CartModel = require('../models/cart.model');
const { getPostData } = require('../utils/helpers');

async function addToCart(req, res) {
    try {
        const userId = req.user.userId; 
        const body = await getPostData(req);
        
        // تحويل القيم لأرقام لضمان عدم حدوث تعارض (Type Mismatch)
        const product_id = parseInt(body.product_id);
        const quantity = parseInt(body.quantity) || 1;

        if (!product_id || isNaN(product_id) || quantity < 1) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'رقم المنتج مطلوب وغير صالح' }));
        }

        await CartModel.addItem(userId, product_id, quantity);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم إضافة المنتج للسلة بنجاح!' }));

    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'بيانات غير صالحة' }));
        }

        res.writeHead(['Product not found', 'Requested quantity is not available'].includes(error.message) ? 400 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ أثناء إضافة المنتج للسلة' }));
    }
}

async function viewCart(req, res) {
    try {
        const userId = req.user.userId;
        const cartItems = await CartModel.getCart(userId);
        
        // التعديل هنا: إرسال البيانات بشكل صحيح للفرونت اند
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: cartItems }));

    } catch (error) {
        console.error(error);
        res.writeHead(['Product not found', 'Requested quantity is not available'].includes(error.message) ? 400 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ أثناء جلب محتويات السلة' }));
    }
}

async function updateCartItem(req, res) {
    try {
        const userId = req.user.userId;
        const body = await getPostData(req);
        
        const product_id = parseInt(body.product_id);
        const quantity = parseInt(body.quantity);

        if (isNaN(product_id) || isNaN(quantity)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'رقم المنتج والكمية مطلوبين بصيغة أرقام' }));
        }

        await CartModel.setItemQuantity(userId, product_id, quantity);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم تحديث الكمية بنجاح' }));
    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'بيانات غير صالحة' }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ أثناء تحديث السلة' }));
    }
}

async function removeCartItem(req, res) {
    try {
        const userId = req.user.userId;
        const body = await getPostData(req);
        const product_id = parseInt(body.product_id);

        if (isNaN(product_id)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'رقم المنتج مطلوب' }));
        }

        await CartModel.removeItem(userId, product_id);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم حذف المنتج من السلة' }));
    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'بيانات غير صالحة' }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ أثناء حذف المنتج من السلة' }));
    }
}

module.exports = { addToCart, viewCart, updateCartItem, removeCartItem };
