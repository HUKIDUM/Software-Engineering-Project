const express = require('express');
const {
    register,
    login,
    getMe,
    logout
} = require('../controllers/auth'); // Remove setMembership and getMembership imports

const router = express.Router();
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Membership routes have been moved to a dedicated membership router

module.exports = router;