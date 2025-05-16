import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Fixed: Changed from named import to default import
import { useAuth } from '../contexts/AuthContext';
import './GithubUploadPage.css'; // Import custom CSS

function GithubUploadPage() {
    const { writeupId } = useParams();
    const navigate = useNavigate();
    const { user, updateUserGithubDetails } = useAuth(); // Get user info and updater function

    const [githubUsername, setGithubUsername] = useState('');
    const [githubEmail, setGithubEmail] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [branchName, setBranchName] = useState('main');

    const [uploadLogs, setUploadLogs] = useState([]); // State for logs
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (user) {
            setGithubUsername(user.githubUsername || '');
            setGithubEmail(user.githubEmail || '');
        }
    }, [user]);

    // Helper function to add logs
    const addLog = (message) => {
        setUploadLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setUploadLogs([]); // Clear logs on new attempt
        addLog("Initiating upload process...");

        if (!githubToken || !githubUsername || !githubEmail || !branchName) {
            const missingFieldsError = "All GitHub fields (Token, Username, Email, Branch) are required.";
            setError(missingFieldsError);
            addLog(`Error: ${missingFieldsError}`);
            return;
        }
        addLog(`GitHub Username: ${githubUsername}, Email: ${githubEmail}, Branch: ${branchName}`);

        setIsUploading(true);
        try {
            let credentialsUpdatedInProfile = false;
            // Step 1: Update GitHub credentials in user's profile if they changed or if token is new
            // Only update if token is provided OR username/email changed from stored user profile
            if (githubToken || (user && (user.githubUsername !== githubUsername || user.githubEmail !== githubEmail))) {
                addLog("Attempting to update GitHub credentials in profile...");
                try {
                    await api.put('/api/auth/me/github-credentials', { 
                        githubUsername,
                        githubEmail,
                        githubToken // Send token for backend to decide if it needs to use it (e.g. validate)
                    });
                    updateUserGithubDetails(githubUsername, githubEmail); // Update context
                    const credUpdateMsg = 'GitHub credentials updated in your profile.';
                    setSuccessMessage(credUpdateMsg);
                    addLog(credUpdateMsg);
                    credentialsUpdatedInProfile = true;
                } catch (credErr) {
                    const credErrMsg = `Failed to update profile credentials: ${credErr.response?.data?.message || credErr.message}`;
                    addLog(`Warning: ${credErrMsg}`);
                    // Continue with upload even if profile update fails, as token is available for this session
                }
            } else {
                addLog("GitHub credentials in form match profile or token not re-entered; skipping profile update.");
            }

            // Step 2: Perform the upload
            const uploadMsg = `Initiating file upload to GitHub for writeup ID: ${writeupId}...`;
            addLog(uploadMsg);
            if (credentialsUpdatedInProfile) { // Append to existing success message if any
                setSuccessMessage(prev => prev + ' Starting upload...');
            } else {
                setSuccessMessage('Starting upload...');
            }
            // Log the token and data being sent
            console.log('Sending to backend:', {
                githubToken,
                githubUsername,
                githubEmail,
                branchName
            });
            // Using the api service with correct authorization
            await api.post(`/api/writeups/${writeupId}/upload`, {
                githubToken, // Send the token from the form
                githubUsername, // Send username from form
                githubEmail,    // Send email from form
                branchName      // Send branch name from form
            });

            const finalSuccessMsg = 'Writeup uploaded to GitHub successfully! Redirecting to dashboard...';
            addLog(finalSuccessMsg);
            setSuccessMessage(finalSuccessMsg); // Overwrite or append based on preference
            setGithubToken(''); // Clear token from field after successful use

            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            console.error("Error during GitHub upload process:", err);
            const errorMsg = 'Failed to upload to GitHub. ' + (err.response?.data?.message || err.message);
            setError(errorMsg);
            addLog(`Error: ${errorMsg}`);
            if (err.response?.status === 404) {
                addLog("A 404 error occurred. This might indicate the backend endpoint is not reachable or the writeup ID is incorrect.");
            }
        } finally {
            setIsUploading(false);
            addLog("Upload process finished.");
        }
    };

    const handleCancel = () => {
        navigate('/'); // Navigate to homepage or dashboard
    };

    return (
        <div className="github-upload-page-container"> {/* Main container for flex layout */}
            <div className="form-container">
                <h2>Upload Writeup to GitHub</h2>
                <p>Writeup ID: {writeupId}</p>
                <p>Target Repository (from backend .env): <code>{process.env.REACT_APP_GITHUB_REPO_DISPLAY_URL || "winzerprince/writeapp.git (example)"}</code></p>
                
                {error && !successMessage && <p className="error-message">{error}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>} {/* Removed inline style as it's in CSS */}

                <form onSubmit={handleUpload}>
                    <div className="form-group">
                        <label htmlFor="githubUsername">GitHub Username (for commit)</label>
                        <input 
                            type="text" 
                            id="githubUsername" 
                            value={githubUsername} 
                            onChange={(e) => setGithubUsername(e.target.value)} 
                            placeholder="Your GitHub Username" 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="githubEmail">GitHub Email (for commit)</label>
                        <input 
                            type="email" 
                            id="githubEmail" 
                            value={githubEmail} 
                            onChange={(e) => setGithubEmail(e.target.value)} 
                            placeholder="Your GitHub Email" 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="githubToken">GitHub Personal Access Token (with repo scope)</label>
                        <input 
                            type="password" 
                            id="githubToken" 
                            value={githubToken} 
                            onChange={(e) => setGithubToken(e.target.value)} 
                            placeholder="Enter your GitHub PAT" 
                            required 
                        />
                        <small>Your token will be used for this upload. It is not stored long-term.</small>
                    </div>
                    <div className="form-group">
                        <label htmlFor="branchName">Branch Name</label>
                        <input 
                            type="text" 
                            id="branchName" 
                            value={branchName} 
                            onChange={(e) => setBranchName(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-actions"> {/* Removed inline style */}
                        <button type="submit" disabled={isUploading}> {/* Removed className="btn" as it will be handled by form-actions button styling */}
                            {isUploading ? 'Uploading...' : 'Upload to GitHub'}
                        </button>
                        <button type="button" className="cancel-button" onClick={handleCancel} disabled={isUploading}> {/* Added cancel-button class, removed inline style and btn btn-secondary */}
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
            <div className="log-panel-container">
                <h3>Upload Logs</h3>
                <div className="log-output"> {/* Changed className from "logs" to "log-output" to match CSS */}
                    {uploadLogs.length === 0 && <p>Logs will appear here...</p>}
                    {uploadLogs.map((log, index) => (
                        <div key={index}>{log}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default GithubUploadPage;
