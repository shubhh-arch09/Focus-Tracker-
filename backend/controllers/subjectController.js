const { getDb } = require('../database/database');

exports.getAllSubjects = async (req, res) => {
    try {
        const db = getDb();
        const subjects = await db.prepare('SELECT * FROM subjects ORDER BY id').all();
        for (const subject of subjects) {
            const totalSeconds = (await db.prepare(
                'SELECT COALESCE(SUM(duration),0) as total FROM sessions WHERE subject = ?'
            ).get(subject.name)).total;
            subject.totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
            subject.sessionCount = (await db.prepare(
                'SELECT COUNT(*) as count FROM sessions WHERE subject = ?'
            ).get(subject.name)).count;
        }
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSubject = async (req, res) => {
    try {
        const db = getDb();
        const subject = await db.prepare('SELECT * FROM subjects WHERE id = ?').get(parseInt(req.params.id));
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const totalSeconds = (await db.prepare(
            'SELECT COALESCE(SUM(duration),0) as total FROM sessions WHERE subject = ?'
        ).get(subject.name)).total;
        subject.totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

        res.json(subject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const db = getDb();
        const notes = await db.prepare(
            'SELECT * FROM notes WHERE subject_id = ? ORDER BY updated_at DESC'
        ).all(parseInt(req.params.id));
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createNote = async (req, res) => {
    try {
        const db = getDb();
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        const result = await db.prepare(
            'INSERT INTO notes (subject_id, title, content) VALUES (?, ?, ?)'
        ).run(parseInt(req.params.id), title, content);
        const note = await db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const db = getDb();
        const note = await db.prepare('SELECT * FROM notes WHERE id = ?').get(parseInt(req.params.id));
        if (!note) return res.status(404).json({ error: 'Note not found' });

        const { title, content } = req.body;
        await db.prepare(
            'UPDATE notes SET title = ?, content = ?, updated_at = NOW() WHERE id = ?'
        ).run(title || note.title, content || note.content, parseInt(req.params.id));

        const updated = await db.prepare('SELECT * FROM notes WHERE id = ?').get(parseInt(req.params.id));
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const db = getDb();
        const note = await db.prepare('SELECT * FROM notes WHERE id = ?').get(parseInt(req.params.id));
        if (!note) return res.status(404).json({ error: 'Note not found' });
        await db.prepare('DELETE FROM notes WHERE id = ?').run(parseInt(req.params.id));
        res.json({ message: 'Note deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getVideos = async (req, res) => {
    try {
        const db = getDb();
        const videos = await db.prepare(
            'SELECT * FROM video_lectures WHERE subject_id = ? ORDER BY id'
        ).all(parseInt(req.params.id));
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addVideo = async (req, res) => {
    try {
        const db = getDb();
        const { title, url, duration } = req.body;
        if (!title || !url) {
            return res.status(400).json({ error: 'Title and URL are required' });
        }
        const result = await db.prepare(
            'INSERT INTO video_lectures (subject_id, title, url, duration) VALUES (?, ?, ?, ?)'
        ).run(parseInt(req.params.id), title, url, duration || '');
        const video = await db.prepare('SELECT * FROM video_lectures WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(video);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.toggleVideoWatched = async (req, res) => {
    try {
        const db = getDb();
        const video = await db.prepare('SELECT * FROM video_lectures WHERE id = ?').get(parseInt(req.params.id));
        if (!video) return res.status(404).json({ error: 'Video not found' });
        await db.prepare('UPDATE video_lectures SET watched = ? WHERE id = ?').run(video.watched ? 0 : 1, parseInt(req.params.id));
        const updated = await db.prepare('SELECT * FROM video_lectures WHERE id = ?').get(parseInt(req.params.id));
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const db = getDb();
        const video = await db.prepare('SELECT * FROM video_lectures WHERE id = ?').get(parseInt(req.params.id));
        if (!video) return res.status(404).json({ error: 'Video not found' });
        await db.prepare('DELETE FROM video_lectures WHERE id = ?').run(parseInt(req.params.id));
        res.json({ message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
