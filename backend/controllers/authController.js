const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/database');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
    try {
        const db = getDb();
        const { username, email, password, full_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#0ea5e9', '#14b8a6'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const result = await db.prepare(
            'INSERT INTO users (username, email, password_hash, full_name, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(username, email, hash, full_name || '', 'user', color);

        const user = await db.prepare('SELECT id, username, email, full_name, role, avatar_color, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const db = getDb();
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Login and password are required' });
        }

        const user = await db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const { password_hash, ...safeUser } = user;
        res.json({ token, user: safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const db = getDb();
        const user = await db.prepare('SELECT id, username, email, full_name, role, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const db = getDb();
        const { full_name, email, avatar_color, current_password, new_password } = req.body;
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (new_password) {
            if (!current_password) return res.status(400).json({ error: 'Current password required to change password' });
            const valid = await bcrypt.compare(current_password, user.password_hash);
            if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
            const hash = await bcrypt.hash(new_password, 10);
            await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
        }

        if (email && email !== user.email) {
            const dup = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
            if (dup) return res.status(409).json({ error: 'Email already in use' });
        }

        await db.prepare('UPDATE users SET full_name = ?, email = ?, avatar_color = ? WHERE id = ?').run(
            full_name !== undefined ? full_name : user.full_name,
            email || user.email,
            avatar_color || user.avatar_color,
            req.user.id
        );

        const updated = await db.prepare('SELECT id, username, email, full_name, role, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.listUsers = async (req, res) => {
    try {
        const db = getDb();
        const users = await db.prepare('SELECT id, username, email, full_name, role, avatar_color, created_at FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const db = getDb();
        const { role } = req.body;
        if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
        const target = await db.prepare('SELECT id FROM users WHERE id = ?').get(parseInt(req.params.id));
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
        await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, parseInt(req.params.id));
        res.json({ message: 'Role updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const db = getDb();
        const id = parseInt(req.params.id);
        if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
        const target = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!target) return res.status(404).json({ error: 'User not found' });
        await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        await db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
