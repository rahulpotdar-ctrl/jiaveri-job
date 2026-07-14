require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public'))); // serves mobile.html, desktop.html

app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/health', (req, res) => res.json({ ok: true }));

// convenience routes so people can go straight to /mobile or /desktop
app.get('/mobile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'mobile.html')));
app.get('/desktop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'desktop.html')));
app.get('/', (req, res) => res.redirect('/desktop'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jiaveri Jobs server सुरू झाला — http://localhost:${PORT}`));
