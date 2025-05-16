import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    axios.defaults.baseURL = '/api';

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await axios.post('/auth/login', { username, password });
        const { token: newToken, userId, username: loggedInUsername, githubUsername, githubEmail } = response.data;
        
        const userData = { userId, username: loggedInUsername, githubUsername, githubEmail };
        
        setToken(newToken);
        setUser(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return response.data;
    };

    const register = async (username, password) => {
        return await axios.post('/auth/register', { username, password });
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    const updateUserGithubDetails = (githubUsername, githubEmail) => {
        setUser(prevUser => {
            const updatedUser = { ...prevUser, githubUsername, githubEmail };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading, updateUserGithubDetails }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
