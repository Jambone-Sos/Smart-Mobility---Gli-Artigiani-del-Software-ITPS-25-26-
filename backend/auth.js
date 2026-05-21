/* =================================================================
   AUTH — auth.js
   -----------------------------------------------------------------
   JWT Bearer Token (IFC-01): scadenza 24h, secret da env JWT_SECRET.
   ================================================================= */

var jwt = require('jsonwebtoken');

var JWT_SECRET = process.env.JWT_SECRET || 'smartmobility-dev-secret-2026';

function generateToken(userId) {
    return jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(req, res, next) {
    var auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Autenticazione richiesta. Effettua il login.' });
    }
    var token = auth.slice(7);
    try {
        var decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token non valido o scaduto. Effettua di nuovo il login.' });
    }
}

module.exports = { generateToken, verifyToken };
