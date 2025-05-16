const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

module.exports = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    // Tokens are typically in the format "Bearer <token>"
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Token is not valid (format error).' });
    }

    const token = tokenParts[1];

    if (!token) { // Double check, though covered by length check
        return res.status(401).json({ message: 'No token found after Bearer, authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add decoded user payload to request object
        next();
    } catch (err) {
        console.error("Token verification failed:", err.message);
        res.status(401).json({ message: 'Token is not valid.' });
    }
};
