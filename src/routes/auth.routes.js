const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = 'mindbridge_secret_key';

// REGISTER
router.post('/register', (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;


    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';

    db.query(sql, [name, email, hashedPassword], (err) => {
        if (err) {
            return res.status(500).json({ message: 'User already exists' });
        }
        res.json({ message: 'User registered successfully' });
    });
});

// LOGIN
router.post('/login', (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;


    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], (err, result) => {
        if (!result.length) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result[0];
        const valid = bcrypt.compareSync(password, user.password);

        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });
    });
});

// RESET / CHANGE PASSWORD  👈 ADD THIS HERE
router.post('/reset-password', (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const newPassword = req.body.newPassword;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'All fields required' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);

    const sql = 'UPDATE users SET password = ? WHERE email = ?';

    db.query(sql, [hashed, email], (err, result) => {
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Password updated successfully' });
    });
});

module.exports = router;
