const express = require('express');
const path = require('path');
const cors = require('cors');


const authRoutes = require('./routes/auth.routes');
const checkinRoutes = require('./routes/checkin.routes');
const statsRoutes = require('./routes/stats.routes');

require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/stats', statsRoutes); // ✅ THIS WAS MISSING

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
module.exports = app;
