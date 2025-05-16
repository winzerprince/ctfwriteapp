const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

const usersFilePath = path.join(__dirname, '..', '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // Use environment variable for secret

// Helper function to read users
const getUsers = async () => {
    try {
        return await fs.readJson(usersFilePath);
    } catch (error) {
        // If file doesn't exist or is not valid JSON, return empty array
        if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
            return [];
        }
        throw error; // Re-throw other errors
    }
};

// Helper function to save users
const saveUsers = async (users) => {
    await fs.writeJson(usersFilePath, users, { spaces: 2 });
};

// Helper function to update specific user fields, including GitHub credentials
const updateUserFields = async (userId, fieldsToUpdate) => {
    const users = await getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
        throw new Error('User not found for update');
    }
    // Encrypt token if it's being updated and is not empty
    if (fieldsToUpdate.githubToken && fieldsToUpdate.githubToken.trim() !== '') {
        fieldsToUpdate.encryptedGithubToken = await bcrypt.hash(fieldsToUpdate.githubToken, 10);
        delete fieldsToUpdate.githubToken; // Do not store the plain token
    } else {
        // If token is empty or not provided, don't try to encrypt/store it, remove field if present
        delete fieldsToUpdate.githubToken;
        delete fieldsToUpdate.encryptedGithubToken; // Ensure no old encrypted token is kept if new one is empty
    }

    users[userIndex] = { ...users[userIndex], ...fieldsToUpdate };
    await saveUsers(users);
    return users[userIndex];
};

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        const users = await getUsers();
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            githubUsername: '', // Initialize GitHub fields
            githubEmail: '',
            encryptedGithubToken: '' // Store encrypted token
        };
        users.push(newUser);
        await saveUsers(users);

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Error registering user.', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        const users = await getUsers();
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // FIXED: Changed userId to id to match what authMiddleware.js expects
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        // Return GitHub info (excluding token) if available, for pre-filling forms
        res.json({
            token,
            userId: user.id,
            username: user.username,
            githubUsername: user.githubUsername || '',
            githubEmail: user.githubEmail || ''
            // DO NOT return the encryptedGithubToken to the client
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Error logging in.', error: error.message });
    }
};

// New controller function to update GitHub credentials
exports.updateGithubCredentials = async (req, res) => {
    try {
        // FIXED: Changed req.user.userId to req.user.id to match JWT payload
        const userId = req.user.id; 
        const { githubUsername, githubEmail, githubToken } = req.body;

        if (!githubUsername && !githubEmail && !githubToken) {
            return res.status(400).json({ message: 'No GitHub credentials provided to update.' });
        }

        const fieldsToUpdate = {};
        if (githubUsername) fieldsToUpdate.githubUsername = githubUsername;
        if (githubEmail) fieldsToUpdate.githubEmail = githubEmail;
        if (githubToken) fieldsToUpdate.githubToken = githubToken; // Will be encrypted by updateUserFields

        const updatedUser = await updateUserFields(userId, fieldsToUpdate);

        res.json({
            message: 'GitHub credentials updated successfully.',
            githubUsername: updatedUser.githubUsername,
            githubEmail: updatedUser.githubEmail
        });
    } catch (error) {
        console.error('Update GitHub Credentials Error:', error);
        res.status(500).json({ message: 'Error updating GitHub credentials.', error: error.message });
    }
    
};