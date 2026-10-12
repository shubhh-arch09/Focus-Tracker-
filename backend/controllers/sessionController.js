const { getDb } = require('../database/database');

exports.getAllSessions = async (req, res) => {
    try {
        const db = getDb();
        const { date, subject, limit } = req.query;
        let sql = 'SELECT * FROM sessions';
        const conditions = [];
        const params = [];

        if (date) {
            conditions.push('date = ?');
            params.push(date);
        }
        if (subject) {
            conditions.push('subject = ?');
            params.push(subject);
        }
        if (conditions.length) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' ORDER BY created_at DESC';
        if (limit) {
            sql += ' LIMIT ' + parseInt(limit);
        }

        const sessions = await db.prepare(sql).all(...params);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSession = async (req, res) => {
    try {
        const db = getDb();
        const session = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(parseInt(req.params.id));
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createSession = async (req, res) => {
    try {
        const db = getDb();
        const { subject, duration, date, session_type, notes, rating } = req.body;

        if (!subject || !duration || !date) {
            return res.status(400).json({ error: 'Subject, duration, and date are required' });
        }
        if (typeof duration !== 'number' || duration <= 0) {
            return res.status(400).json({ error: 'Duration must be a positive number (seconds)' });
        }

        const result = await db.prepare(
            'INSERT INTO sessions (subject, duration, date, session_type, notes, rating) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(subject, duration, date, session_type || 'focus', notes || '', rating || 0);

        const session = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSession = async (req, res) => {
    try {
        const db = getDb();
        const existing = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(parseInt(req.params.id));
        if (!existing) return res.status(404).json({ error: 'Session not found' });

        const { subject, duration, date, session_type, notes, rating } = req.body;
        await db.prepare(
            'UPDATE sessions SET subject = ?, duration = ?, date = ?, session_type = ?, notes = ?, rating = ? WHERE id = ?'
        ).run(
            subject || existing.subject,
            duration || existing.duration,
            date || existing.date,
            session_type || existing.session_type,
            notes !== undefined ? notes : existing.notes,
            rating !== undefined ? rating : (existing.rating || 0),
            parseInt(req.params.id)
        );
        const session = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(parseInt(req.params.id));
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const db = getDb();
        const existing = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(parseInt(req.params.id));
        if (!existing) return res.status(404).json({ error: 'Session not found' });
        await db.prepare('DELETE FROM sessions WHERE id = ?').run(parseInt(req.params.id));
        res.json({ message: 'Session deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        const todaySessions = await db.prepare(
            'SELECT * FROM sessions WHERE date = ? ORDER BY created_at DESC'
        ).all(today);

        const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0);
        const todayCount = todaySessions.length;

        const allDates = (await db.prepare(
            'SELECT DISTINCT date FROM sessions ORDER BY date DESC'
        ).all()).map(r => r.date);

        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(d);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (allDates.includes(dateStr)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        const totalSessions = (await db.prepare('SELECT COUNT(*) as count FROM sessions').get()).count;
        const totalTime = (await db.prepare('SELECT COALESCE(SUM(duration),0) as total FROM sessions').get()).total;

        res.json({
            today: { sessions: todaySessions, totalSeconds: todayTotal, count: todayCount },
            streak,
            totalSessions,
            totalTimeSeconds: totalTime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDailyStats = async (req, res) => {
    try {
        const db = getDb();
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const sessions = await db.prepare('SELECT * FROM sessions WHERE date = ?').all(date);

        const bySubject = {};
        for (const s of sessions) {
            if (!bySubject[s.subject]) bySubject[s.subject] = { totalSeconds: 0, count: 0 };
            bySubject[s.subject].totalSeconds += s.duration;
            bySubject[s.subject].count++;
        }

        const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);

        res.json({
            date,
            totalSeconds,
            sessionCount: sessions.length,
            bySubject,
            sessions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getWeeklyStats = async (req, res) => {
    try {
        const db = getDb();
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);

        const startDate = weekAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const sessions = await db.prepare(
            'SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY date'
        ).all(startDate, endDate);

        const daily = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekAgo);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            daily[dateStr] = { totalSeconds: 0, count: 0 };
        }

        const bySubject = {};
        for (const s of sessions) {
            if (daily[s.date]) {
                daily[s.date].totalSeconds += s.duration;
                daily[s.date].count++;
            }
            if (!bySubject[s.subject]) bySubject[s.subject] = { totalSeconds: 0, count: 0 };
            bySubject[s.subject].totalSeconds += s.duration;
            bySubject[s.subject].count++;
        }

        const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);

        res.json({
            startDate,
            endDate,
            totalSeconds,
            sessionCount: sessions.length,
            daily,
            bySubject
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBurnoutRisk = async (req, res) => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = await db.prepare('SELECT * FROM sessions WHERE date = ?').all(today);
        const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0);
        const todayHours = todayTotal / 3600;

        let hoursScore = Math.min((todayHours / 8) * 40, 40);

        const longSessions = todaySessions.filter(s => s.duration > 5400);
        let longSessionScore = Math.min(longSessions.length * 10, 20);

        let sessionCountScore = Math.min((todaySessions.length / 10) * 15, 15);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekSessions = await db.prepare(
            'SELECT date, SUM(duration) as total FROM sessions WHERE date >= ? GROUP BY date'
        ).all(weekAgo.toISOString().split('T')[0]);

        const daysStudied = weekSessions.length;
        let consistencyScore = daysStudied === 7 ? 15 : (daysStudied >= 6 ? 10 : 0);

        const breakSessions = todaySessions.filter(s => s.session_type === 'break');
        const breakRatio = todaySessions.length > 0 ? breakSessions.length / todaySessions.length : 1;
        let breakScore = breakRatio < 0.2 && todaySessions.length > 3 ? 10 : 0;

        const riskScore = Math.round(Math.min(
            hoursScore + longSessionScore + sessionCountScore + consistencyScore + breakScore, 100
        ));

        let level, message, color;
        if (riskScore <= 30) {
            level = 'Low';
            message = 'You are maintaining a healthy study balance. Keep it up!';
            color = '#10b981';
        } else if (riskScore <= 60) {
            level = 'Moderate';
            message = 'Consider taking more breaks. Your study load is getting heavy.';
            color = '#f59e0b';
        } else if (riskScore <= 80) {
            level = 'High';
            message = 'You are pushing too hard. Take a longer break and rest.';
            color = '#f97316';
        } else {
            level = 'Critical';
            message = 'Burnout risk is very high! Please step away and recharge.';
            color = '#ef4444';
        }

        res.json({
            score: riskScore,
            level,
            message,
            color,
            factors: {
                dailyHours: Math.round(todayHours * 10) / 10,
                longSessions: longSessions.length,
                totalSessionsToday: todaySessions.length,
                daysStudiedThisWeek: daysStudied,
                breakRatio: Math.round(breakRatio * 100)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAchievements = async (req, res) => {
    try {
        const db = getDb();
        const achievements = await db.prepare('SELECT * FROM achievements ORDER BY id').all();

        const totalSessions = (await db.prepare('SELECT COUNT(*) as c FROM sessions').get()).c;
        const totalHours = (await db.prepare('SELECT COALESCE(SUM(duration),0) as t FROM sessions').get()).t / 3600;
        const distinctSubjects = (await db.prepare('SELECT COUNT(DISTINCT subject) as c FROM sessions').get()).c;

        const allDates = (await db.prepare('SELECT DISTINCT date FROM sessions ORDER BY date DESC').all()).map(r => r.date);
        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 365; i++) {
            const cd = new Date(d);
            cd.setDate(cd.getDate() - i);
            const ds = cd.toISOString().split('T')[0];
            if (allDates.includes(ds)) streak++;
            else if (i > 0) break;
        }

        const checks = {
            first_session: totalSessions >= 1,
            streak_3: streak >= 3,
            streak_7: streak >= 7,
            hours_10: totalHours >= 10,
            hours_50: totalHours >= 50,
            sessions_25: totalSessions >= 25,
            sessions_100: totalSessions >= 100,
            all_subjects: distinctSubjects >= 7,
            pomodoro_4: false,
            early_bird: false
        };

        for (const a of achievements) {
            if (!a.unlocked_at && checks[a.key]) {
                await db.prepare("UPDATE achievements SET unlocked_at = NOW() WHERE `key` = ?").run(a.key);
                a.unlocked_at = new Date().toISOString();
            }
        }

        const updated = await db.prepare('SELECT * FROM achievements ORDER BY id').all();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDailyGoal = async (req, res) => {
    try {
        const db = getDb();
        const date = req.query.date || new Date().toISOString().split('T')[0];
        let goal = await db.prepare('SELECT * FROM daily_goals WHERE date = ?').get(date);
        if (!goal) goal = { date, target_minutes: 120 };
        const todayTotal = (await db.prepare('SELECT COALESCE(SUM(duration),0) as t FROM sessions WHERE date = ?').get(date)).t;
        res.json({ target_minutes: goal.target_minutes, completed_minutes: Math.round(todayTotal / 60), date });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.setDailyGoal = async (req, res) => {
    try {
        const db = getDb();
        const { target_minutes } = req.body;
        const date = new Date().toISOString().split('T')[0];
        const existing = await db.prepare('SELECT * FROM daily_goals WHERE date = ?').get(date);
        if (existing) {
            await db.prepare('UPDATE daily_goals SET target_minutes = ? WHERE date = ?').run(target_minutes, date);
        } else {
            await db.prepare('INSERT INTO daily_goals (date, target_minutes) VALUES (?, ?)').run(date, target_minutes);
        }
        res.json({ message: 'Goal set', target_minutes, date });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
