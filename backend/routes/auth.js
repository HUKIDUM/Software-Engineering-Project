const express = require('express');
const {
    register,
    login,
    logout,
    getMe,
    setMembership,
    getMembership
} = require('../controllers/auth'); // Make sure `setMembership` and `getMembership` are exported from auth.js

const router = express.Router();
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);  // Still public? You might want to protect it
router.get('/me', protect, getMe);

// Membership routes (require authentication)
router.post('/membership', protect, setMembership);
router.get('/membership', protect, getMembership);

module.exports = router;