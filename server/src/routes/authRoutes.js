const express = require('express');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, uploadAvatar.single('avatar'), updateProfile);

module.exports = router;
