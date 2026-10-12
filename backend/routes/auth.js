const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.get('/profile', authenticateToken, authCtrl.getProfile);
router.put('/profile', authenticateToken, authCtrl.updateProfile);
router.get('/users', authenticateToken, requireAdmin, authCtrl.listUsers);
router.put('/users/:id/role', authenticateToken, requireAdmin, authCtrl.updateUserRole);
router.delete('/users/:id', authenticateToken, requireAdmin, authCtrl.deleteUser);

module.exports = router;
