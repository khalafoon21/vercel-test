const getDb = require('../config/database');

class TagModel {
    static async getAll() {
        const db = getDb();
        return db.all(`SELECT * FROM tags ORDER BY name ASC`);
    }

    static async create(name) {
        const db = getDb();
        const cleanName = String(name || '').trim();
        if (!cleanName) return null;
        const result = await db.run(
            `INSERT OR IGNORE INTO tags (name) VALUES (?)`,
            [cleanName]
        );
        if (result.lastID) return result.lastID;
        const existing = await db.get(`SELECT id FROM tags WHERE name = ?`, [cleanName]);
        return existing ? existing.id : null;
    }

    static parseTags(tags) {
        if (Array.isArray(tags)) return tags.map(tag => String(tag || '').trim()).filter(Boolean);
        return String(tags || '')
            .split(/[,\n،]/)
            .map(tag => tag.trim())
            .filter(Boolean);
    }

    static async syncFromString(tags) {
        const names = [...new Set(TagModel.parseTags(tags))];
        for (const name of names) {
            await TagModel.create(name);
        }
        return names.join(', ');
    }

    static async update(id, name) {
        const db = getDb();
        await db.run(`UPDATE tags SET name = ? WHERE id = ?`, [String(name || '').trim(), id]);
    }

    static async delete(id) {
        const db = getDb();
        await db.run(`DELETE FROM tags WHERE id = ?`, [id]);
    }
}

module.exports = TagModel;
