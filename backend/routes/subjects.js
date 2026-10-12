const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subjectController');

router.get('/', ctrl.getAllSubjects);
router.get('/:id', ctrl.getSubject);

router.get('/:id/notes', ctrl.getNotes);
router.post('/:id/notes', ctrl.createNote);

router.get('/:id/videos', ctrl.getVideos);
router.post('/:id/videos', ctrl.addVideo);

module.exports = router;
