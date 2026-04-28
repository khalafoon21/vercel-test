const OrderModel = require('../models/order.model');
const { getPostData } = require('../utils/helpers');

async function checkout(req, res) {
    try {
        const userId = req.user.userId; 
        
        const body = await getPostData(req);
        // التعديل الأول: استقبال كل البيانات اللي بيبعتها الفرونت اند
        const { shipping_address, phone, full_name } = body;

        // التحقق من إن كل البيانات المهمة موجودة
        if (!shipping_address || !phone || !full_name) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                success: false, 
                message: 'يرجى إدخال العنوان، رقم الهاتف، والاسم بالكامل لإتمام الطلب' 
            }));
        }

        // تمرير البيانات كاملة لنموذج قاعدة البيانات (Model)
        // ملاحظة: تأكد إن OrderModel.createOrder متعدلة عشان تستقبل المتغيرات دي
        const orderId = await OrderModel.createOrder(userId, shipping_address, phone, full_name);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true, 
            message: 'تم تسجيل طلبك بنجاح!', 
            orderId: orderId 
        }));

    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'بيانات غير صالحة'
            }));
        }

        // التعديل: إرجاع كود 500 أو رسالة الموديل لو السلة فاضية
        const expectedCheckoutError = /(empty|stock|available|cart|فارغة|مخزون|كمية|سلة)/i.test(error.message || '');
        const statusCode = expectedCheckoutError ? 400 : 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: error.message || 'حدث خطأ أثناء معالجة طلبك' 
        }));
    }
} 

async function getOrderHistory(req, res) {
    try {
        const userId = req.user.userId;
        const orders = await OrderModel.getUserOrders(userId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: orders }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'حدث خطأ أثناء جلب سجل الطلبات' 
        }));
    }
}

async function getAllOrdersAdmin(req, res) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                success: false, 
                message: 'غير مصرح لك برؤية جميع الطلبات' 
            }));
        }

        const orders = await OrderModel.getAllOrders();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: orders }));

    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'حدث خطأ أثناء جلب الطلبات' 
        }));
    }
}

async function updateOrderStatus(req, res) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                success: false, 
                message: 'غير مصرح لك بتحديث حالة الطلب' 
            }));
        }

        const body = await getPostData(req);
        const { order_id, status } = body;

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        
        if (!order_id || !validStatuses.includes(status)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                success: false, 
                message: 'رقم الطلب أو الحالة غير صالحة' 
            }));
        }

        if (status === 'Cancelled') {
            await OrderModel.cancelOrder(order_id, null);
        } else {
            await OrderModel.updateStatus(order_id, status);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            message: `تم تحديث حالة الطلب بنجاح إلى: ${status}` 
        }));

    } catch (error) {
        console.error(error);

        if (error.code === 'INVALID_JSON') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'بيانات غير صالحة'
            }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'حدث خطأ أثناء تحديث حالة الطلب' 
        }));
    }
} 

async function cancelOrder(req, res) {
    try {
        const body = await getPostData(req);
        const orderId = Number(body.order_id);
        if (!orderId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Valid order id is required' }));
        }

        const isAdminActor = req.user.role === 'admin';
        await OrderModel.cancelOrder(orderId, isAdminActor ? null : req.user.userId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم إلغاء الطلب بنجاح' }));
    } catch (error) {
        const known = /not found|cannot|cancel/i.test(error.message || '');
        res.writeHead(known ? 400 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message || 'تعذر إلغاء الطلب' }));
    }
}

async function getSalesAnalytics(req, res) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Not allowed' }));
        }

        const data = await OrderModel.getAnalytics();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load analytics' }));
    }
}

module.exports = { checkout, getOrderHistory, updateOrderStatus, getAllOrdersAdmin, cancelOrder, getSalesAnalytics };
