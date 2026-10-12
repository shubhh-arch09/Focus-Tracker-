require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize } = require('./database/database');
const { authenticateToken } = require('./middleware/auth');

async function start() {
    await initialize();

    const sessionRoutes = require('./routes/sessions');
    const subjectRoutes = require('./routes/subjects');
    const authRoutes = require('./routes/auth');
    const sessionCtrl = require('./controllers/sessionController');
    const subjectCtrl = require('./controllers/subjectController');
    const aiCtrl = require('./controllers/aiController');

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '..', 'frontend')));

    // Public routes
    app.use('/api/auth', authRoutes);

    // Protected routes
    app.use('/api/sessions', authenticateToken, sessionRoutes);
    app.use('/api/subjects', authenticateToken, subjectRoutes);

    app.get('/api/dashboard', authenticateToken, sessionCtrl.getDashboard);
    app.get('/api/statistics/daily', authenticateToken, sessionCtrl.getDailyStats);
    app.get('/api/statistics/weekly', authenticateToken, sessionCtrl.getWeeklyStats);
    app.get('/api/burnout-risk', authenticateToken, sessionCtrl.getBurnoutRisk);
    app.get('/api/achievements', authenticateToken, sessionCtrl.getAchievements);
    app.get('/api/daily-goal', authenticateToken, sessionCtrl.getDailyGoal);
    app.post('/api/daily-goal', authenticateToken, sessionCtrl.setDailyGoal);

    app.put('/api/notes/:id', authenticateToken, subjectCtrl.updateNote);
    app.delete('/api/notes/:id', authenticateToken, subjectCtrl.deleteNote);
    app.put('/api/videos/:id/toggle', authenticateToken, subjectCtrl.toggleVideoWatched);
    app.delete('/api/videos/:id', authenticateToken, subjectCtrl.deleteVideo);

    app.post('/api/ai/chat', authenticateToken, aiCtrl.chat);

    app.get('/login.html', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
    });

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    });

    app.listen(PORT, () => {
        console.log('Server running at http://localhost:' + PORT);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
