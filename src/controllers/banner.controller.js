const BannerModel = require('../models/banner.model');
const { formidable } = require('formidable');
const path = require('path');
const fs = require('fs');
const { getPostData } = require('../utils/helpers'); // ✨ استدعاء مهم للتعديل

async function getAllBanners(req, res) {
    try {
        const banners = await BannerModel.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: banners }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
    }
}

async function createBanner(req, res) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'غير مصرح لك' }));
        }

        const uploadFolder = path.join(__dirname, '../../uploads/banners');
        if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

        const form = formidable({
            uploadDir: uploadFolder,
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, message: 'خطأ أثناء رفع الصورة' }));
            }

            const title = fields.title ? fields.title[0] : '';
            const description = fields.description ? fields.description[0] : '';
            const bg_color = fields.bg_color ? fields.bg_color[0] : '#ffffff';
            const text_color = fields.text_color ? fields.text_color[0] : '#1f2937';
            const button_text = fields.button_text ? fields.button_text[0] : 'اكتشف الآن';
            const button_color = fields.button_color ? fields.button_color[0] : '#0891b2';
            
            let image_url = '';
            if (files.image) {
                const file = Array.isArray(files.image) ? files.image[0] : files.image;
                const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                if (!allowedImageTypes.includes(file.mimetype)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, message: 'Only image files are allowed' }));
                }
                image_url = `/uploads/banners/${path.basename(file.filepath)}`;
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, message: 'الصورة مطلوبة' }));
            }

            await BannerModel.create({ title, description, image_url, bg_color, text_color, button_text, button_color });

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'تم الإضافة بنجاح' }));
        });
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
    }
}

async function updateBanner(req, res, id) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'غير مصرح' }));
        }
        if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
            const uploadFolder = path.join(__dirname, '../../uploads/banners');
            if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

            const form = formidable({
                uploadDir: uploadFolder,
                keepExtensions: true,
                maxFileSize: 5 * 1024 * 1024
            });

            return form.parse(req, async (err, fields, files) => {
                if (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, message: 'Error uploading banner image' }));
                }

                const payload = {
                    title: fields.title ? fields.title[0] : undefined,
                    description: fields.description ? fields.description[0] : undefined,
                    bg_color: fields.bg_color ? fields.bg_color[0] : undefined,
                    text_color: fields.text_color ? fields.text_color[0] : undefined,
                    button_text: fields.button_text ? fields.button_text[0] : undefined,
                    button_color: fields.button_color ? fields.button_color[0] : undefined
                };

                if (files.image) {
                    const file = Array.isArray(files.image) ? files.image[0] : files.image;
                    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                    if (!allowedImageTypes.includes(file.mimetype)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, message: 'Only image files are allowed' }));
                    }
                    payload.image_url = `/uploads/banners/${path.basename(file.filepath)}`;
                }

                await BannerModel.update(id, payload);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Banner updated successfully' }));
            });
        }

        const body = await getPostData(req);
        await BannerModel.update(id, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم تحديث العرض بنجاح' }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
    }
}

async function deleteBanner(req, res, id) {
    try {
        if (req.user.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'غير مصرح' }));
        }
        await BannerModel.delete(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'تم حذف العرض بنجاح' }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
    }
}

module.exports = { getAllBanners, createBanner, updateBanner, deleteBanner };
