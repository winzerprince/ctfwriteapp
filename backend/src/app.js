require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const electron = process.env.ELECTRON_RUN === 'true';

// Import routes
const authRoutes = require('./routes/authRoutes');
const writeupRoutes = require('./routes/writeupRoutes');

const app = express();
const PORT = process.env.PORT || 5001; // Changed port to avoid conflict with default React port

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Get the appropriate base directory for storing user data based on environment
let userDataBasePath;
if (electron) {
  // In Electron production, use the app's user data directory
  const { app } = require('electron').remote || require('@electron/remote');
  userDataBasePath = app ? app.getPath('userData') : path.join(__dirname, '..', '..');
} else {
  // In development, use the project directory
  userDataBasePath = path.join(__dirname, '..', '..');
}

// Ensure necessary directories exist
const writeupsDir = path.join(userDataBasePath, 'writeups');
const dataDir = path.join(userDataBasePath, 'data');
fs.ensureDirSync(writeupsDir);
fs.ensureDirSync(dataDir);

// Initialize data files if they don't exist
const usersFilePath = path.join(dataDir, 'users.json');
const writeupsMetadataFilePath = path.join(dataDir, 'writeups_metadata.json');

if (!fs.existsSync(usersFilePath)) {
    fs.writeJsonSync(usersFilePath, []);
}
if (!fs.existsSync(writeupsMetadataFilePath)) {
    fs.writeJsonSync(writeupsMetadataFilePath, []);
}

// Log app initialization details
console.log(`WriteApp Backend initialized with:
- Environment: ${electron ? 'Electron (Production)' : 'Development'}
- Data directory: ${dataDir}
- Writeups directory: ${writeupsDir}
`);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/writeups', writeupRoutes);

// Basic error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Export the server for Electron usage if needed
const server = app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});

// Handle proper server shutdown for electron environments
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

module.exports = { app, server };
