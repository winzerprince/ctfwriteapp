import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

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

function WriteupFormPage() {
    const { id } = useParams(); // For editing existing writeups
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        ctfName: '',
        date: new Date().toISOString().split('T')[0], // Default to today
        topic: '',
        approach: '',
        resources: [{ name: '', url: '' }],
        notes: ''
    });
    const [markdownPreview, setMarkdownPreview] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentWriteupId, setCurrentWriteupId] = useState(id || null);

    const updatePreview = useCallback(() => {
        const content = generateMarkdownContent(formData);
        setMarkdownPreview(content);
    }, [formData]);

    useEffect(() => {
        if (id) {
            setIsLoading(true);
            axios.get(`/api/writeups/${id}`)
                .then(response => {
                    const { ctfName, date, topic, approach, resources, notes, id: writeupId } = response.data;
                    setFormData({
                        ctfName: ctfName || '',
                        date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        topic: topic || '',
                        approach: approach || '',
                        resources: resources && resources.length > 0 ? resources : [{ name: '', url: '' }],
                        notes: notes || ''
                    });
                    setCurrentWriteupId(writeupId);
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching writeup:", err);
                    setError('Failed to load writeup data. ' + (err.response?.data?.message || err.message));
                    setIsLoading(false);
                });
        }
    }, [id]);

    useEffect(() => {
        updatePreview();
    }, [formData, updatePreview]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResourceChange = (index, e) => {
        const { name, value } = e.target;
        const newResources = [...formData.resources];
        newResources[index][name] = value;
        setFormData(prev => ({ ...prev, resources: newResources }));
    };

    const addResource = () => {
        setFormData(prev => ({
            ...prev,
            resources: [...prev.resources, { name: '', url: '' }]
        }));
    };

    const removeResource = (index) => {
        const newResources = formData.resources.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, resources: newResources }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        if (!formData.ctfName || !formData.topic) {
            setError("CTF Name and Topic are required.");
            setIsLoading(false);
            return;
        }

        try {
            let response;
            let writeupIdForUpload;
            if (currentWriteupId) { // Editing existing
                response = await axios.put(`/api/writeups/${currentWriteupId}`, formData);
                setSuccessMessage('Writeup updated successfully! Redirecting to upload page...');
                writeupIdForUpload = currentWriteupId;
            } else { // Creating new
                // Ensure the POST request targets the correct backend endpoint explicitly
                response = await axios.post('http://localhost:5001/api/writeups', formData);
                setSuccessMessage(`Writeup created successfully! Path: ${response.data.writeup.filePath}. Redirecting to upload page...`);
                setCurrentWriteupId(response.data.writeup.id); 
                writeupIdForUpload = response.data.writeup.id;
            }
            
            // Redirect to the GitHub upload page
            setTimeout(() => {
                navigate(`/upload/${writeupIdForUpload}`);
            }, 2500); // Increased delay slightly
        } catch (err) {
            console.error("Error saving writeup:", err);
            setError('Failed to save writeup. ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && id) return <p>Loading writeup data...</p>;

    return (
        <div className="form-container">
            <h2>{currentWriteupId ? 'Edit' : 'Create New'} CTF Writeup</h2>
            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message" style={{color: 'green'}}>{successMessage}</p>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="ctfName">CTF Name *</label>
                    <input type="text" id="ctfName" name="ctfName" value={formData.ctfName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="topic">Topic *</label>
                    <input type="text" id="topic" name="topic" value={formData.topic} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="approach">Approach to Solving</label>
                    <textarea id="approach" name="approach" value={formData.approach} onChange={handleChange}></textarea>
                </div>

                <div className="form-group">
                    <label>Useful Resource Links</label>
                    {formData.resources.map((resource, index) => (
                        <div key={index} className="resource-link-item">
                            <input
                                type="text"
                                name="name"
                                placeholder="Link Name (optional)"
                                value={resource.name}
                                onChange={(e) => handleResourceChange(index, e)}
                            />
                            <input
                                type="text"
                                name="url"
                                placeholder="Link URL (e.g., https://example.com)"
                                value={resource.url}
                                onChange={(e) => handleResourceChange(index, e)}
                            />
                            {formData.resources.length > 1 && (
                                <button type="button" onClick={() => removeResource(index)} className="btn btn-danger btn-sm">Remove</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addResource} className="btn btn-secondary btn-sm">Add Resource Link</button>
                </div>

                <div className="form-group">
                    <label htmlFor="notes">Additional Notes</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange}></textarea>
                </div>

                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? (currentWriteupId ? 'Updating...' : 'Creating...') : (currentWriteupId ? 'Update Writeup' : 'Create Writeup')}
                </button>
                <Link to={currentWriteupId ? `/writeup/${id}` : "/"} className="btn btn-secondary" style={{marginLeft: '10px'}}>Cancel</Link>
            </form>

            <div className="markdown-preview-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                <h3>Markdown Preview</h3>
                <div className="markdown-preview">
                    <ReactMarkdown>{markdownPreview}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

export default WriteupFormPage;
