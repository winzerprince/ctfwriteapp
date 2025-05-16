const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', authController.register);

// Login an existing user
router.post('/login', authController.login);

// Update GitHub credentials for the logged-in user
router.put('/me/github-credentials', authMiddleware, authController.updateGithubCredentials);

module.exports = router;