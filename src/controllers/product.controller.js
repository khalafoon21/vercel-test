const url = require('url');
const path = require('path');
const fs = require('fs');
const { formidable } = require('formidable');
const ProductModel = require('../models/product.model');
const TagModel = require('../models/tag.model');
const getDb = require('../config/database');
const { getPostData } = require('../utils/helpers');

async function getProducts(req, res) {
    try {
        const baseURL = `http://${req.headers.host}`;
        const parsedUrl = new URL(req.url, baseURL);
        const searchQuery = parsedUrl.searchParams.get('search') || '';
        const categoryId = parsedUrl.searchParams.get('category_id') || parsedUrl.searchParams.get('category') || null;
        const featuredOnly = parsedUrl.searchParams.get('featured') === '1' || parsedUrl.searchParams.get('featured') === 'true';
        const brand = parsedUrl.searchParams.get('brand') || '';
        const tag = parsedUrl.searchParams.get('tag') || parsedUrl.searchParams.get('tags') || '';

        const products = await ProductModel.getAll(searchQuery, categoryId, { featuredOnly, brand, tag });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: products }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'حدث خطأ أثناء جلب المنتجات' 
        }));
    }
}

async function getProductById(req, res, productId) {
    try {
        const product = await ProductModel.getById(productId);

        if (!product) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Product not found' }));
        }

        if (product.status && product.status !== 'approved') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Product not found' }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: product }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Error fetching product' }));
    }
}

async function createProduct(req, res) {
    try {
        // التحقق من الصلاحيات
        if (req.user.role !== 'seller' && req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'غير مصرح لك بإضافة منتجات' }));
        }

        const uploadFolder = path.join(__dirname, '../../uploads/products');

        // ✨ التأكد من إنشاء مجلد الصور تلقائياً
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true });
        }

        const form = formidable({
            uploadDir: uploadFolder, 
            keepExtensions: true,    
            maxFileSize: 10 * 1024 * 1024, // 10 ميجا للصور
            multiples: true // السماح برفع أكثر من ملف
        });

        form.parse(req, async (err, fields, files) => {
            try {
                if (err) {
                    console.error('Formidable Error:', err);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, message: 'خطأ أثناء رفع الصور' }));
                }

                // استخراج البيانات النصية
                const title = fields.title ? fields.title[0] : null;
                const description = fields.description ? fields.description[0] : '';
                const price = fields.price ? fields.price[0] : null;
                const discount = fields.discount ? fields.discount[0] : 0;
                const stock_quantity = fields.stock_quantity ? fields.stock_quantity[0] : 0;
                const category_id = fields.category_id ? fields.category_id[0] : null;
                const brand = fields.brand ? fields.brand[0] : '';
                const tags = fields.tags ? fields.tags[0] : '';
                const featured = fields.featured ? Number(fields.featured[0]) : 0;

                const parsedPrice = Number(price);
                const parsedDiscount = Number(discount);
                const parsedStock = Number(stock_quantity);
                const parsedCategoryId = category_id ? Number(category_id) : null;

                if (
                    !title ||
                    Number.isNaN(parsedPrice) || parsedPrice < 0 ||
                    Number.isNaN(parsedDiscount) || parsedDiscount < 0 ||
                    Number.isNaN(parsedStock) || parsedStock < 0 ||
                    (parsedCategoryId !== null && Number.isNaN(parsedCategoryId))
                ) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, message: 'الاسم والسعر مطلوبان' }));
                }

                // ✨ معالجة الصور (أول صورة أساسية، والباقي إضافي)
                let image_url = '';
                let additional_images = [];
                const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

                // Frontend بيبعت الصور في حقل اسمه images
                if (files.images) {
                    const uploadedFiles = Array.isArray(files.images) ? files.images : [files.images];
                    
                    if (uploadedFiles.length > 0) {
                        const invalidFile = uploadedFiles.find(file => !allowedImageTypes.includes(file.mimetype));
                        if (invalidFile) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ success: false, message: 'Only image files are allowed' }));
                        }

                        // الصورة الأولى هي الأساسية
                        const mainFile = uploadedFiles[0];
                        const mainFileName = path.basename(mainFile.filepath || mainFile.newFilename || '');
                        if (mainFileName) image_url = `/uploads/products/${mainFileName}`;

                        // باقي الصور تنزل كصور إضافية
                        for (let i = 1; i < uploadedFiles.length; i++) {
                            const addFile = uploadedFiles[i];
                            const addFileName = path.basename(addFile.filepath || addFile.newFilename || '');
                            if (addFileName) additional_images.push(`/uploads/products/${addFileName}`);
                        }
                    }
                }

                // تسجيل المنتج في قاعدة البيانات
                const syncedTags = await TagModel.syncFromString(tags);
                const shouldAutoApprove = req.user.role === 'admin' || req.user.seller_status === 'approved_seller';

                const newProductId = await ProductModel.create({
                    seller_id: req.user.userId,
                    title,
                    description,
                    price: parsedPrice,
                    discount: parsedDiscount,
                    stock_quantity: Math.floor(parsedStock),
                    category_id: parsedCategoryId,
                    brand,
                    tags: syncedTags,
                    status: shouldAutoApprove ? 'approved' : 'pending',
                    featured: req.user.role === 'admin' ? featured : 0,
                    image_url,
                    additional_images 
                });

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'تم إضافة المنتج والصور بنجاح!', 
                    productId: newProductId
                }));

            } catch (innerError) {
                console.error("Database Error inside form.parse:", innerError);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'خطأ في قاعدة البيانات: ' + innerError.message }));
            }
        });

    } catch (error) {
        console.error("General Server Error:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'حدث خطأ في السيرفر' }));
    }
}

async function getMyProducts(req, res) {
    try {
        if (req.user.role !== 'seller' && req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'غير مصرح لك بعرض هذه المنتجات'
            }));
        }

        const products = req.user.role === 'admin'
            ? await ProductModel.getAll('', null, { publicOnly: false })
            : await ProductModel.getAllForSeller(req.user.userId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: products }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'حدث خطأ أثناء جلب منتجاتك'
        }));
    }
}

async function getAdminProducts(req, res) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'Admin access only'
            }));
        }

        const baseURL = `http://${req.headers.host}`;
        const parsedUrl = new URL(req.url, baseURL);
        const status = parsedUrl.searchParams.get('status') || '';
        const products = await ProductModel.getAll('', null, {
            publicOnly: false,
            status: ['pending', 'approved', 'rejected'].includes(status) ? status : ''
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: products }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Could not load admin products'
        }));
    }
}

async function updateProductStatusAdmin(req, res, productId) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Admin access only' }));
        }

        const body = await getPostData(req);
        const status = body.status;
        const validStatuses = ['pending', 'approved', 'rejected', 'approved_seller'];

        if (!validStatuses.includes(status)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Invalid product status' }));
        }

        const existing = await ProductModel.getById(productId);
        if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Product not found' }));
        }

        if (status === 'approved_seller') {
            const db = getDb();
            await db.run(`UPDATE users SET seller_status = 'approved_seller' WHERE id = ?`, [existing.seller_id]);
            await ProductModel.updateStatusById(productId, 'approved');
        } else {
            await ProductModel.updateStatusById(productId, status);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Product status updated successfully' }));
    } catch (error) {
        console.error(error);
        const statusCode = error.code === 'INVALID_JSON' ? 400 : 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not update product status' }));
    }
}

async function updateProduct(req, res, productId) {
    try {
        if (req.user.role !== 'seller' && req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'غير مصرح لك بتعديل المنتجات'
            }));
        }

        const existing = await ProductModel.getById(productId);
        if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'المنتج غير موجود'
            }));
        }

        if (req.user.role !== 'admin' && existing.seller_id !== req.user.userId) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'يمكنك فقط تعديل منتجاتك الخاصة'
            }));
        }

        const uploadFolder = path.join(__dirname, '../../uploads/products');
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true });
        }
        const form = formidable({
            uploadDir: uploadFolder,
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024,
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    message: 'حدث خطأ أثناء رفع الصورة'
                }));
            }

            // تحديث الحقول الأساسية مع دعم الحقول الجديدة (الخصم والماركة)
            const title = fields.title ? fields.title[0] : existing.title;
            const description = fields.description ? fields.description[0] : existing.description;
            const price = fields.price ? Number(fields.price[0]) : Number(existing.price);
            const discount = fields.discount ? Number(fields.discount[0]) : Number(existing.discount || 0);
            const stock_quantity = fields.stock_quantity ? Number(fields.stock_quantity[0]) : Number(existing.stock_quantity);
            const category_id = fields.category_id
                ? (fields.category_id[0] ? Number(fields.category_id[0]) : null)
                : existing.category_id;
            const brand = fields.brand ? fields.brand[0] : (existing.brand || '');
            const tags = fields.tags ? fields.tags[0] : (existing.tags || '');
            const status = req.user.role === 'admin'
                ? (fields.status ? fields.status[0] : (existing.status || 'approved'))
                : 'pending';
            const featured = req.user.role === 'admin' && fields.featured ? Number(fields.featured[0]) : Number(existing.featured || 0);

            if (
                !title ||
                Number.isNaN(price) || price < 0 ||
                Number.isNaN(discount) || discount < 0 ||
                Number.isNaN(stock_quantity) || stock_quantity < 0 ||
                (category_id !== null && Number.isNaN(category_id)) ||
                !['pending', 'approved', 'rejected'].includes(status)
            ) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    message: 'Invalid product data'
                }));
            }

            let image_url = existing.image_url || '';
            
            // لو رفع صورة جديدة (الاسم جاي من الفورم بـ images)
            if (files.images || files.image) {
                const uploadedFileField = files.images || files.image;
                const uploadedFile = Array.isArray(uploadedFileField) ? uploadedFileField[0] : uploadedFileField;
                const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                if (!allowedImageTypes.includes(uploadedFile.mimetype)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: false,
                        message: 'Only image files are allowed'
                    }));
                }
                const fileName = path.basename(uploadedFile.filepath || uploadedFile.newFilename || '');
                if (fileName) image_url = `/uploads/products/${fileName}`;
            }

            const syncedTags = await TagModel.syncFromString(tags);

            await ProductModel.updateById(productId, {
                title,
                description,
                price,
                discount,
                stock_quantity: Math.floor(stock_quantity),
                image_url,
                category_id,
                brand,
                tags: syncedTags,
                status,
                featured
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'تم تحديث المنتج بنجاح'
            }));
        });
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'حدث خطأ أثناء تحديث المنتج'
        }));
    }
}

async function deleteProduct(req, res, productId) {
    try {
        if (req.user.role !== 'seller' && req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'غير مصرح لك بحذف المنتجات'
            }));
        }

        const existing = await ProductModel.getById(productId);
        if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'المنتج غير موجود'
            }));
        }

        if (req.user.role !== 'admin' && existing.seller_id !== req.user.userId) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                message: 'يمكنك فقط حذف منتجاتك الخاصة'
            }));
        }

        await ProductModel.deleteById(productId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'تم حذف المنتج بنجاح'
        }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'حدث خطأ أثناء حذف المنتج'
        }));
    }
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    getMyProducts,
    getAdminProducts,
    updateProductStatusAdmin,
    updateProduct,
    deleteProduct
};
