const TagModel = require('../models/tag.model');
const { getPostData } = require('../utils/helpers');

async function getAllTags(req, res) {
    try {
        const tags = await TagModel.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: tags }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not load tags' }));
    }
}

async function createTag(req, res) {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'seller') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Not allowed to manage tags' }));
        }

        const { name } = await getPostData(req);
        if (!name || !String(name).trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Tag name is required' }));
        }

        const tagId = await TagModel.create(name);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Tag created successfully', tagId }));
    } catch (error) {
        const duplicate = error.message && error.message.includes('UNIQUE');
        res.writeHead(duplicate ? 400 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: duplicate ? 'Tag already exists' : 'Could not create tag' }));
    }
}

async function updateTag(req, res, id) {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'seller') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Not allowed to manage tags' }));
        }

        const { name } = await getPostData(req);
        if (!id || !name || !String(name).trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Valid tag id and name are required' }));
        }

        await TagModel.update(id, name);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Tag updated successfully' }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not update tag' }));
    }
}

async function deleteTag(req, res, id) {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'seller') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, message: 'Not allowed to manage tags' }));
        }

        await TagModel.delete(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Tag deleted successfully' }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Could not delete tag' }));
    }
}

module.exports = { getAllTags, createTag, updateTag, deleteTag };
