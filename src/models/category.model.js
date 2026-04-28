const getDb = require('../config/database');

class CategoryModel {
    static async getAll() {
        const db = getDb();
        return await db.all('SELECT * FROM categories');
    }

    static async create(data) {
        const db = getDb();
        const { name, icon } = data;
        const result = await db.run(
            'INSERT INTO categories (name, icon) VALUES (?, ?)',
            [name, icon || 'fa-tags']
        );
        return result.lastID;
    }

    static async update(id, data) {
        const db = getDb();
        const { name, icon } = data;
        await db.run(
            'UPDATE categories SET name = ?, icon = ? WHERE id = ?',
            [name, icon || 'fa-tags', id]
        );
    }

    static async delete(id) {
        const db = getDb();
        await db.run('DELETE FROM categories WHERE id = ?', [id]);
    }
}
module.exports = CategoryModel;