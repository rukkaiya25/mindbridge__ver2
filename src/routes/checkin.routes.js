const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'mindbridge_secret_key';

// AUTH MIDDLEWARE
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token missing' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// ADD DAILY CHECK-IN
// ADD / UPDATE DAILY CHECK-IN
router.post("/", verifyToken, (req, res) => {
    const { mood, stress, energy, sleep, note } = req.body;

    if (mood == null || stress == null || energy == null || sleep == null) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = `
    INSERT INTO daily_checkins (user_id, date, mood, stress, energy, sleep, note)
    VALUES (?, CURDATE(), ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      mood = VALUES(mood),
      stress = VALUES(stress),
      energy = VALUES(energy),
      sleep = VALUES(sleep),
      note = VALUES(note)
  `;

    db.query(
        sql,
        [req.userId, mood, stress, energy, sleep, note || null],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Failed to save check-in" });
            }

            res.json({ message: "Check-in saved successfully" });
        }
    );
});


// GET ALL CHECK-INS
router.get('/', verifyToken, (req, res) => {
    const sql = `
  SELECT date, mood, stress, energy, sleep
  FROM daily_checkins
  WHERE user_id = ?
  ORDER BY date ASC
`;


    db.query(sql, [req.userId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(result);
    });
});

// GET TODAY / LATEST CHECK-IN
// CHECK IF TODAY'S CHECK-IN EXISTS
router.get("/today", verifyToken, (req, res) => {
    const sql = `
    SELECT id
    FROM daily_checkins
    WHERE user_id = ?
      AND date = CURDATE()
    LIMIT 1
  `;

    db.query(sql, [req.userId], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ exists: false });
        }

        return res.json({ exists: rows.length > 0 });
    });
});

// GET LATEST CHECK-IN (for dashboard cards)
router.get("/latest", verifyToken, (req, res) => {
    const sql = `
    SELECT mood, stress, energy, sleep, note, date
    FROM daily_checkins
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT 1
  `;

    db.query(sql, [req.userId], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(rows[0] || null);
    });
});



module.exports = router;
