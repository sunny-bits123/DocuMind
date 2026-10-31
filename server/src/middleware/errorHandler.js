const multer = require('multer');

function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }

  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
