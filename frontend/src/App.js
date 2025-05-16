import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WriteupFormPage from './pages/WriteupFormPage';
import ViewWriteupPage from './pages/ViewWriteupPage';
import GithubUploadPage from './pages/GithubUploadPage';
import { updateApiBaseUrl } from './services/api'; // Import the API update function
import './App.css';

function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>; // Or a spinner
    return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="App">
            <nav className="navbar">
                <Link to="/" className="nav-brand">WriteApp</Link>
                <div className="nav-links">
                    {user ? (
                        <>
                            <Link to="/" className="nav-link">Dashboard</Link>
                            <Link to="/create" className="nav-link">New Writeup</Link>
                            <button onClick={handleLogout} className="nav-button">Logout ({user.username})</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link">Login</Link>
                            <Link to="/register" className="nav-link">Register</Link>
                        </>
                    )}
                </div>
            </nav>
            <main className="container">
                <Outlet /> {/* Nested routes will render here */}
            </main>
            <footer className="footer">
                <p>&copy; 2025 WriteApp</p>
            </footer>
        </div>
    );
}

function App() {
    // Initialize API on component mount
    useEffect(() => {
        // Set up API URL based on environment
        const initApi = async () => {
            try {
                const apiUrl = await updateApiBaseUrl();
                console.log('API initialized with URL:', apiUrl);
                
                // Listen for backend port updates from Electron
                if (window.electronAPI && window.electronAPI.onBackendPort) {
                    window.electronAPI.onBackendPort((port) => {
                        console.log(`Backend port updated: ${port}`);
                        updateApiBaseUrl(); // Update API URL when port changes
                    });
                }
            } catch (err) {
                console.error('Failed to initialize API:', err);
            }
        };
        
        initApi();
    }, []);

    return (
        <AuthProvider>
            <Routes>
                <Route element={<AppLayout />}> {/* Layout wraps all protected and public-in-layout routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/create" element={<WriteupFormPage />} />
                        <Route path="/edit/:id" element={<WriteupFormPage />} />
                        <Route path="/writeup/:id" element={<ViewWriteupPage />} />
                        <Route path="/upload/:writeupId" element={<GithubUploadPage />} /> {/* Add route for upload page */}
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} /> {/* Fallback route */}
            </Routes>
        </AuthProvider>
    );
}

export default App;
