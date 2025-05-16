const express = require('express');
const router = express.Router();
const writeupController = require('../controllers/writeupController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you'll create this

// Get all writeups for the logged-in user
router.get('/', authMiddleware, writeupController.getWriteups);

// Create a new writeup
router.post('/', authMiddleware, writeupController.createWriteup);

// Get a specific writeup by ID
router.get('/:id', authMiddleware, writeupController.getWriteupById);

// Update an existing writeup
router.put('/:id', authMiddleware, writeupController.updateWriteup);

// Delete a writeup
router.delete('/:id', authMiddleware, writeupController.deleteWriteup);

// Upload a writeup to GitHub
router.post('/:id/github', authMiddleware, writeupController.uploadToGithub);

// Route for GitHub upload
router.post('/:id/upload', authMiddleware, writeupController.uploadToGithub);

module.exports = router;