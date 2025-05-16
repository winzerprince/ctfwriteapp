const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs for writeups
const simpleGit = require('simple-git'); // Import simple-git

// Dynamic path resolution for Electron compatibility
const electron = process.env.ELECTRON_RUN === 'true';
let userDataBasePath;

if (electron) {
  // In Electron production, use the app's user data directory
  const { app } = require('electron').remote || require('@electron/remote');
  userDataBasePath = app ? app.getPath('userData') : path.join(__dirname, '..', '..');
} else {
  // In development, use the project directory
  userDataBasePath = path.join(__dirname, '..', '..');
}

const writeupsDir = path.join(userDataBasePath, 'writeups');
const metadataFilePath = path.join(userDataBasePath, 'data', 'writeups_metadata.json');

// Helper function to read metadata
const getMetadata = async () => {
    try {
        return await fs.readJson(metadataFilePath);
    } catch (error) {
        if (error.code === 'ENOENT' || error.name === 'SyntaxError') {
            return []; // If file doesn't exist or is not valid JSON, return empty array
        }
        throw error;
    }
};

// Helper function to save metadata
const saveMetadata = async (metadata) => {
    await fs.writeJson(metadataFilePath, metadata, { spaces: 2 });
};

// Helper function to generate Markdown content
const generateMarkdownContent = (data) => {
    return `
# ${data.ctfName || 'Untitled CTF'}

**Date:** ${data.date || 'N/A'}
**Topic:** ${data.topic || 'N/A'}

## Approach to Solving

${data.approach || 'No approach detailed.'}

## Useful Resource Links

${(data.resources && data.resources.length > 0 ? data.resources.map(link => `- [${link.name || link.url}](${link.url})`).join('\n') : 'No resources listed.')}

## Additional Notes

${data.notes || 'No additional notes.'}
    `;
};

// Get all writeups for the logged-in user
exports.getWriteups = async (req, res) => {
    try {
        const metadata = await getMetadata();
        // In a real app, you'd filter by req.user.id if writeups were user-specific
        // For now, returning all writeups
        res.json(metadata);
    } catch (error) {
        console.error('Error getting writeups:', error);
        res.status(500).json({ message: 'Error fetching writeups.', error: error.message });
    }
};

// Create a new writeup
exports.createWriteup = async (req, res) => {
    try {
        const { ctfName, date, topic, approach, resources, notes } = req.body;
        const userId = req.user.id; // Changed from req.user.userId

        if (!ctfName || !topic) {
            return res.status(400).json({ message: 'CTF Name and Topic are required.' });
        }

        const writeupId = uuidv4();
        const fileName = `${ctfName.replace(/[^a-zA-Z0-9]/g, '_')}_${writeupId.substring(0,8)}.md`;
        const filePath = path.join(writeupsDir, fileName);

        const markdownContent = generateMarkdownContent({ ctfName, date, topic, approach, resources, notes });

        await fs.ensureDir(writeupsDir); // Ensure the directory exists
        await fs.writeFile(filePath, markdownContent);

        const metadata = await getMetadata();
        const newMetadataEntry = {
            id: writeupId,
            userId, // Associate with user
            ctfName,
            date,
            topic,
            fileName,
            filePath, // Storing full path for simplicity, consider relative if needed
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        metadata.push(newMetadataEntry);
        await saveMetadata(metadata);

        res.status(201).json({ message: 'Writeup created successfully.', writeup: newMetadataEntry });
    } catch (error) {
        console.error('Error creating writeup:', error);
        res.status(500).json({ message: 'Error creating writeup.', error: error.message });
    }
};

// Placeholder for GitHub upload functionality
exports.uploadToGithub = async (req, res) => {
    // TODO: Implement actual GitHub upload logic
    res.status(501).json({ message: 'GitHub upload not implemented yet.' });
};

// Get a specific writeup by ID (metadata and content)
exports.getWriteupById = async (req, res) => {
    try {
        const metadata = await getMetadata();
        const writeupMetadata = metadata.find(w => w.id === req.params.id);

        if (!writeupMetadata) {
            return res.status(404).json({ message: 'Writeup not found.' });
        }

        // Optional: Check if writeup belongs to the user
        // if (writeupMetadata.userId !== req.user.id) { // Changed from req.user.userId
        //     return res.status(403).json({ message: 'Access denied.' });
        // }

        let content = null;
        try {
            content = await fs.readFile(writeupMetadata.filePath, 'utf-8');
        } catch (fileError) {
            console.warn(`File not found for writeup ID: ${req.params.id}, path: ${writeupMetadata.filePath}`);
            // Proceed without content if file is missing, or handle as an error
        }

        res.json({ ...writeupMetadata, content });
    } catch (error) {
        console.error('Error getting writeup by ID:', error);
        res.status(500).json({ message: 'Error fetching writeup.', error: error.message });
    }
};

// Update an existing writeup
exports.updateWriteup = async (req, res) => {
    try {
        const { ctfName, date, topic, approach, resources, notes } = req.body;
        const writeupId = req.params.id;
        const userId = req.user.id; // Changed from req.user.userId

        const metadata = await getMetadata();
        const writeupIndex = metadata.findIndex(w => w.id === writeupId);

        if (writeupIndex === -1) {
            return res.status(404).json({ message: 'Writeup not found.' });
        }

        const existingWriteup = metadata[writeupIndex];

        // Optional: Check if writeup belongs to the user
        // if (existingWriteup.userId !== userId) { // userId here is already req.user.id
        //     return res.status(403).json({ message: 'Access denied. You can only update your own writeups.' });
        // }

        const updatedData = {
            ctfName: ctfName || existingWriteup.ctfName,
            date: date || existingWriteup.date,
            topic: topic || existingWriteup.topic,
            approach: approach || existingWriteup.approach, // Assuming these can be updated
            resources: resources || existingWriteup.resources,
            notes: notes || existingWriteup.notes,
        };

        const markdownContent = generateMarkdownContent(updatedData);
        await fs.writeFile(existingWriteup.filePath, markdownContent);

        metadata[writeupIndex] = {
            ...existingWriteup,
            ...updatedData,
            ctfName: updatedData.ctfName, // Ensure ctfName is updated in metadata
            updatedAt: new Date().toISOString(),
        };

        await saveMetadata(metadata);
        res.json({ message: 'Writeup updated successfully.', writeup: metadata[writeupIndex] });
    } catch (error) {
        console.error('Error updating writeup:', error);
        res.status(500).json({ message: 'Error updating writeup.', error: error.message });
    }
};

// Delete a writeup
exports.deleteWriteup = async (req, res) => {
    try {
        const writeupId = req.params.id;
        const userId = req.user.id; // Changed from req.user.userId

        let metadata = await getMetadata();
        const writeupIndex = metadata.findIndex(w => w.id === writeupId);

        if (writeupIndex === -1) {
            return res.status(404).json({ message: 'Writeup not found.' });
        }

        const writeupToDelete = metadata[writeupIndex];

        // Optional: Check if writeup belongs to the user
        // if (writeupToDelete.userId !== userId) { // userId here is already req.user.id
        //     return res.status(403).json({ message: 'Access denied. You can only delete your own writeups.' });
        // }

        await fs.remove(writeupToDelete.filePath); // Delete the .md file
        metadata.splice(writeupIndex, 1); // Remove from metadata
        await saveMetadata(metadata);

        res.json({ message: 'Writeup deleted successfully.' });
    } catch (error) {
        console.error('Error deleting writeup:', error);
        res.status(500).json({ message: 'Error deleting writeup.', error: error.message });
    }
};

// GitHub Upload
exports.uploadToGithub = async (req, res) => {
    const writeupId = req.params.id;
    const { githubToken, githubUsername, githubEmail, branchName } = req.body;

    // Log the received token and data
    console.log('Received upload request:', {
        githubToken,
        githubUsername,
        githubEmail,
        branchName
    });

    // Validate incoming data
    if (!githubToken || !githubUsername || !githubEmail || !branchName) {
        console.warn('Missing required GitHub credentials or branch name.');
        return res.status(400).json({ message: 'Missing required GitHub credentials (token, username, email) or branch name in the request body.' });
    }

    const GITHUB_REPO_URL = process.env.GITHUB_REPO_URL;
    if (!GITHUB_REPO_URL) {
        return res.status(500).json({ message: 'GitHub repository URL (GITHUB_REPO_URL) is not configured on the server.' });
    }

    let tempRepoPath; 

    try {
        const metadata = await getMetadata();
        const writeupMetadata = metadata.find(w => w.id === writeupId);

        if (!writeupMetadata) {
            return res.status(404).json({ message: `Writeup with ID '${writeupId}' not found.` });
        }

        const markdownFilePath = writeupMetadata.filePath;
        if (!fs.existsSync(markdownFilePath)) {
            return res.status(404).json({ message: `Markdown file not found locally at ${markdownFilePath}. Ensure the file exists.` });
        }

        if (!GITHUB_REPO_URL || typeof GITHUB_REPO_URL !== 'string') {
            throw new Error('Invalid or missing GITHUB_REPO_URL. Please ensure it is properly configured.');
        }
        const repoName = GITHUB_REPO_URL.split('/').pop().replace('.git', '');
        
        // Use userDataBasePath for temp repos in both development and production
        tempRepoPath = path.join(userDataBasePath, 'temp_git_repos', `${repoName}_${writeupMetadata.id}_${Date.now()}`);
        await fs.ensureDir(tempRepoPath);

        const git = simpleGit(tempRepoPath);
        // Use the token from the request body for authentication
        const remote = `https://${githubToken}@${GITHUB_REPO_URL.replace('https://', '')}`;

        console.log(`Cloning ${GITHUB_REPO_URL} into ${tempRepoPath}...`);
        // Clone only the target branch if possible, or default and then checkout. For simplicity, cloning default then pushing to specified branch.
        // Depth 1 is good for reducing clone time.
        await git.clone(remote, tempRepoPath, { "--depth": 1, "--branch": branchName, "--single-branch": null }).catch(async (cloneErr) => {
            // If cloning the specific branch fails (e.g., branch doesn't exist yet), try cloning default and creating branch
            console.warn(`Failed to clone branch \'${branchName}\' directly. Trying default branch. Error: ${cloneErr.message}`);
            // Clear the failed clone attempt directory
            await fs.remove(tempRepoPath);
            await fs.ensureDir(tempRepoPath);
            await git.clone(remote, tempRepoPath, { '--depth': 1 }); // Clone default branch
            console.log('Cloned default branch. Will attempt to switch to or create target branch.');
            // Check if target branch exists remotely, or just try to push to it (git will create if it doesn't exist on remote and local is set up)
            // For simplicity, we'll rely on push to create the branch on the remote if it doesn't exist.
            // Or, ensure local branch matches target branch:
            const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
            if (currentBranch !== branchName) {
                await git.checkoutLocalBranch(branchName).catch(async (checkoutErr) => {
                    // If checkoutLocalBranch fails (e.g. branch already exists locally from a previous failed attempt but not matching remote)
                    // Or if the branch name is invalid.
                    // A safer approach might be to fetch all branches then checkout.
                    // For now, we assume if it's not the default, we try to switch or create.
                    console.warn(`Could not checkout local branch \'${branchName}\'. Attempting checkout -b. Error: ${checkoutErr.message}`);
                    await git.checkout('-b', branchName);
                });
            }
        });
        console.log('Clone/branch setup successful.');
        
        // Configure git user for this operation using details from request body
        await git.addConfig('user.name', githubUsername, false, 'local');
        await git.addConfig('user.email', githubEmail, false, 'local');
        console.log(`Git user configured as ${githubUsername} <${githubEmail}>`);

        const targetPathInRepo = path.join(tempRepoPath, writeupMetadata.fileName);
        await fs.copy(markdownFilePath, targetPathInRepo);
        console.log(`Copied ${markdownFilePath} to ${targetPathInRepo}`);

        await git.add(writeupMetadata.fileName);
        console.log(`Added ${writeupMetadata.fileName} to git staging.`);
        
        const commitMessage = `Add writeup: ${writeupMetadata.ctfName || 'Untitled Writeup'} (ID: ${writeupMetadata.id})`;
        await git.commit(commitMessage);
        console.log(`Committed changes with message: "${commitMessage}"`);
        
        // Push to the branch specified in the request body
        console.log('Using githubToken for authentication with GitHub.');
        await git.push('origin', branchName);
        console.log(`Pushed to remote repository, branch '${branchName}'.`);

        await fs.remove(tempRepoPath); 
        console.log(`Cleaned up temporary repository at ${tempRepoPath}`);

        res.json({ message: `Writeup \'${writeupMetadata.ctfName}\' uploaded to GitHub (branch: ${branchName}) successfully.` });

    } catch (error) {
        console.error('GitHub Upload Error:', error);
        if (tempRepoPath) { 
            await fs.remove(tempRepoPath).catch(err => console.error('Failed to cleanup temp repo after error:', err));
        }
        // Provide more specific error messages if possible
        let errorMessage = 'Error uploading to GitHub.';
        if (error.message && error.message.includes('Authentication failed')) {
            errorMessage = 'GitHub authentication failed. Please check your token and permissions.';
        } else if (error.message && error.message.includes('not found')) {
            errorMessage = 'Repository or branch not found. Please check the repository URL and branch name.';
        } else if (error.message) {
            errorMessage = `GitHub operation failed: ${error.message}`;
        }
        res.status(500).json({ message: errorMessage, details: error.stack }); // Send stack in dev, remove for prod
    }
};

// Ensure writeups directory exists on startup
fs.ensureDirSync(writeupsDir);
