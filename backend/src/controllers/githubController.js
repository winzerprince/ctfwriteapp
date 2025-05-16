const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

const GITHUB_REPO_PATH = process.env.GITHUB_REPO_PATH; // e.g., /path/to/your/local/clone
const GITHUB_REPO_URL = process.env.GITHUB_REPO_URL; // e.g., https://github.com/yourusername/your-repo.git

// Ensure the local repository path exists
if (!GITHUB_REPO_PATH) {
    console.error('GITHUB_REPO_PATH environment variable is not set.');
    // Potentially exit or use a default, but for now, we'll let operations fail if it's not set.
} else {
    fs.ensureDirSync(GITHUB_REPO_PATH);
}

const git = simpleGit(GITHUB_REPO_PATH);

const initializeRepo = async () => {
    try {
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            console.log('Initializing new Git repository...');
            await git.init();
            if (GITHUB_REPO_URL) {
                await git.addRemote('origin', GITHUB_REPO_URL);
                console.log('Git remote origin added.');
            } else {
                console.warn('GITHUB_REPO_URL is not set. Cannot add remote origin.');
            }
        } else {
            console.log('Git repository already initialized.');
            // Ensure origin is set if GITHUB_REPO_URL is provided
            if (GITHUB_REPO_URL) {
                const remotes = await git.getRemotes(true);
                const origin = remotes.find(r => r.name === 'origin');
                if (!origin) {
                    await git.addRemote('origin', GITHUB_REPO_URL);
                    console.log('Git remote origin added.');
                } else if (origin.refs.push !== GITHUB_REPO_URL) {
                    await git.removeRemote('origin');
                    await git.addRemote('origin', GITHUB_REPO_URL);
                    console.log('Git remote origin updated.');
                }
            }
        }
    } catch (error) {
        console.error('Failed to initialize Git repository:', error);
        // Decide if we should throw or handle this gracefully
        // For now, logging the error. The app might not function correctly with git operations.
    }
};

// Call initializeRepo on startup if GITHUB_REPO_PATH is set
if (GITHUB_REPO_PATH) {
    initializeRepo().catch(console.error);
}

exports.uploadToGithub = async (req, res) => {
    const { writeupId, ctfName, content } = req.body; // Assuming content is passed directly

    if (!writeupId || !ctfName || !content) {
        return res.status(400).json({ message: 'Missing writeupId, ctfName, or content for GitHub upload.' });
    }

    if (!GITHUB_REPO_PATH) {
        return res.status(500).json({ message: 'GitHub repository path is not configured on the server.' });
    }
    if (!GITHUB_REPO_URL) {
        return res.status(500).json({ message: 'GitHub repository URL is not configured on the server.' });
    }

    const fileName = `${ctfName.replace(/[^a-zA-Z0-9]/g, '_')}_${writeupId.substring(0, 8)}.md`;
    const filePath = path.join(GITHUB_REPO_PATH, fileName);

    try {
        // Ensure the local repository is up-to-date before making changes
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            console.log('Re-initializing repository as it was not found to be a repo.');
            await initializeRepo(); // Attempt to re-initialize
            // Check again after re-initialization attempt
            if (!(await git.checkIsRepo())) {
                return res.status(500).json({ message: 'Failed to initialize Git repository.' });
            }
        }

        // Check if remote 'origin' exists
        const remotes = await git.getRemotes(true);
        const originExists = remotes.some(remote => remote.name === 'origin');

        if (originExists) {
            console.log('Pulling latest changes from origin...');
            // Check current branch
            const branchSummary = await git.branchLocal();
            const currentBranch = branchSummary.current || 'main'; // Default to main if not found

            try {
                await git.pull('origin', currentBranch, { '--rebase': 'true' });
            } catch (pullError) {
                console.warn(`Failed to pull from origin/${currentBranch}. This might be a new branch or other issue.`, pullError);
                // If pull fails, it might be because the branch doesn't exist remotely yet, or other issues.
                // We can try to proceed with caution or handle specific errors.
                // For now, we log a warning and continue.
            }
        } else if (GITHUB_REPO_URL) {
            console.log('Adding remote origin as it was not found.');
            await git.addRemote('origin', GITHUB_REPO_URL);
        }

        await fs.outputFile(filePath, content);
        console.log(`Write-up file created/updated at ${filePath}`);

        await git.add(filePath);
        console.log(`Added ${fileName} to git staging.`);

        const commitMessage = `Add/Update write-up: ${ctfName} (${writeupId})`;
        await git.commit(commitMessage);
        console.log(`Committed with message: "${commitMessage}"`);

        if (originExists) {
            const branchSummary = await git.branchLocal();
            const currentBranch = branchSummary.current || 'main';
            console.log(`Pushing to origin/${currentBranch}...`);
            await git.push('origin', currentBranch);
            console.log('Successfully pushed to GitHub.');
            res.status(200).json({ message: 'Write-up uploaded to GitHub successfully.', filePath });
        } else {
            console.warn('No remote origin found or GITHUB_REPO_URL not set. Skipping push.');
            res.status(200).json({ message: 'Write-up saved locally and committed, but not pushed to GitHub (no remote origin).', filePath });
        }

    } catch (error) {
        console.error('Failed to upload to GitHub:', error);
        // Attempt to reset any changes if an error occurs during git operations
        try {
            await git.reset('hard');
            console.log('Git repository reset due to an error.');
        } catch (resetError) {
            console.error('Failed to reset Git repository:', resetError);
        }
        res.status(500).json({ message: 'Failed to upload to GitHub.', error: error.message });
    }
};