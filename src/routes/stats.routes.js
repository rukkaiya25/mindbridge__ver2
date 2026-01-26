const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'mindbridge_secret_key';

// token middleware (duplicate is fine for now)
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token missing' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.userId = decoded.id;
        next();
    });
}

// GET dashboard stats
router.get('/dashboard', verifyToken, (req, res) => {
    const sql = `
    SELECT 
  AVG(mood) AS avgMood,
  AVG(stress) AS avgStress,
  AVG(energy) AS avgEnergy,
  AVG(sleep) AS avgSleep
FROM daily_checkins


  `;

    db.query(sql, [req.userId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch stats' });
        }
        res.json(result[0]);
    });
});

// GET last 7 days trend
router.get('/weekly', verifyToken, (req, res) => {
    const sql = `
    SELECT date, mood, stress, energy, sleep
     FROM daily_checkins
     WHERE user_id = ?
     ORDER BY date DESC
     LIMIT 7

  `;

    db.query(sql, [req.userId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch weekly data' });
        }
        res.json(result);
    });
});

module.exports = router;
