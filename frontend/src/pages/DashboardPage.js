import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // To get user info if needed for filtering

function DashboardPage() {
    const [writeups, setWriteups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth(); // Get current user

    useEffect(() => {
        const fetchWriteups = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/api/writeups'); // Token is attached by AuthContext
                // Filter writeups by current user.id - assuming backend returns all for now
                // const userWriteups = response.data.filter(w => w.userId === user.id);
                // setWriteups(userWriteups);
                setWriteups(response.data); // Displaying all for now as per controller
                setError('');
            } catch (err) {
                console.error("Fetch Writeups Error:", err);
                setError(err.response?.data?.message || 'Failed to fetch writeups.');
            }
            setLoading(false);
        };

        if (user) { // Only fetch if user is logged in
            fetchWriteups();
        }
    }, [user]); // Rerun if user changes

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this writeup?')) {
            try {
                await axios.delete(`/api/writeups/${id}`);
                setWriteups(writeups.filter(w => w.id !== id));
            } catch (err) {
                console.error("Delete Writeup Error:", err);
                setError(err.response?.data?.message || 'Failed to delete writeup.');
            }
        }
    };

    if (loading) return <p>Loading writeups...</p>;

    return (
        <div>
            <h2>My Writeups</h2>
            {error && <p className="error-message">{error}</p>}
            {writeups.length === 0 && !loading && <p>No writeups found. <Link to="/create">Create one now!</Link></p>}
            {writeups.length > 0 && (
                <ul className="writeup-list">
                    {writeups.map(writeup => (
                        <li key={writeup.id} className="writeup-list-item">
                            <div>
                                <h3>{writeup.ctfName}</h3>
                                <p>Topic: {writeup.topic}</p>
                                <p>Date: {new Date(writeup.date || writeup.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="writeup-actions">
                                <Link to={`/writeup/${writeup.id}`} className="btn btn-secondary">View</Link>
                                <Link to={`/edit/${writeup.id}`} className="btn btn-secondary">Edit</Link>
                                <button onClick={() => handleDelete(writeup.id)} className="btn btn-danger">Delete</button>
                                {/* Add GitHub upload button here later */}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <Link to="/create" className="btn" style={{ marginTop: '1rem' }}>Create New Writeup</Link>
        </div>
    );
}

export default DashboardPage;
