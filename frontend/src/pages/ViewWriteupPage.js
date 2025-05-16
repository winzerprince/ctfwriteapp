import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

function ViewWriteupPage() {
    const [writeup, setWriteup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWriteup = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/api/writeups/${id}`);
                setWriteup(response.data);
                setError('');
            } catch (err) {
                console.error("Fetch Writeup Error:", err);
                setError(err.response?.data?.message || 'Failed to fetch writeup.');
                if (err.response?.status === 404) {
                    // Optionally redirect or show specific not found message
                }
            }
            setLoading(false);
        };
        fetchWriteup();
    }, [id]);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this writeup?')) {
            try {
                await axios.delete(`/api/writeups/${id}`);
                navigate('/'); // Redirect to dashboard after deletion
            } catch (err) {
                console.error("Delete Writeup Error:", err);
                setError(err.response?.data?.message || 'Failed to delete writeup.');
            }
        }
    };

    // const handleUploadToGithub = async () => {
    //     // Placeholder for GitHub upload functionality
    //     alert('GitHub upload functionality not implemented yet.');
    //     // try {
    //     //     await axios.post(`/api/writeups/${id}/upload`);
    //     //     alert('Successfully uploaded to GitHub (placeholder)');
    //     // } catch (err) {
    //     //     console.error("GitHub Upload Error:", err);
    //     //     setError(err.response?.data?.message || 'Failed to upload to GitHub.');
    //     // }
    // };

    if (loading) return <p>Loading writeup...</p>;
    if (error && !writeup) return <p className="error-message">{error} <Link to="/">Go to Dashboard</Link></p>;
    if (!writeup) return <p>Writeup not found. <Link to="/">Go to Dashboard</Link></p>;

    return (
        <div className="writeup-view">
            {error && <p className="error-message">{error}</p> } {/* Show error even if writeup data is partially loaded */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Link to={`/edit/${id}`} className="btn btn-secondary">Edit</Link>
                <button onClick={handleDelete} className="btn btn-danger">Delete</button>
                {/* <button onClick={handleUploadToGithub} className="btn">Upload to GitHub</button> */}
            </div>
            
            {/* Display metadata if available and not directly in markdown */}
            {/* Some info like CTFName, Topic, Date might be in the markdown itself */}
            {/* For this example, we assume 'content' has the full markdown */}
            
            <ReactMarkdown>{writeup.content || 'No content available for this writeup.'}</ReactMarkdown>

            {/* Fallback if content is not directly available but other fields are */}
            {!writeup.content && (
                <>
                    <h1>{writeup.ctfName}</h1>
                    <p><strong>Date:</strong> {new Date(writeup.date || writeup.createdAt).toLocaleDateString()}</p>
                    <p><strong>Topic:</strong> {writeup.topic}</p>
                    {/* Add other fields if they are not part of a combined 'content' field */}
                </>
            )}
        </div>
    );
}

export default ViewWriteupPage;
