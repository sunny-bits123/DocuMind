const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Only avatars are public. Documents are served through the authenticated
// GET /api/documents/:id/file endpoint.
app.use('/uploads/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
