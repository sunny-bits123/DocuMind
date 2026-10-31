const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const { processDocument } = require('../services/ragService');
const mongoose = require('mongoose');
const { documentsDir } = require('../middleware/upload');

function fileTypeFromName(filename) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  return ['pdf', 'txt', 'md'].includes(ext) ? ext : null;
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded' });
    }

    const fileType = fileTypeFromName(req.file.originalname);
    if (!fileType) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    const doc = await Document.create({
      user: req.user._id,
      name: req.body.name?.trim() || req.file.originalname,
      originalFilename: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      storagePath: req.file.path,
      status: 'pending'
    });

    res.status(201).json({ document: doc.toSummary() });

    // Process asynchronously so the upload response returns immediately
    processDocument(doc._id).catch((err) => {
      console.error('Background document processing failed:', err.message);
    });
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const docs = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ documents: docs.map((d) => d.toSummary()) });
  } catch (err) {
    next(err);
  }
}

async function getDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ document: doc.toSummary() });
  } catch (err) {
    next(err);
  }
}

async function updateDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      doc.name = req.body.name.trim();
    }
    if (typeof req.body.pinned === 'boolean') {
      doc.pinned = req.body.pinned;
    }

    await doc.save();
    res.json({ document: doc.toSummary() });
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    fs.unlink(doc.storagePath, () => {});
    await doc.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
}

async function getDocumentFile(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = await Document.findOne({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only serve files that really live inside the documents folder
    const resolved = path.resolve(doc.storagePath);
    const root = path.resolve(documentsDir) + path.sep;
    if (!resolved.startsWith(root) || !fs.existsSync(resolved)) {
      return res.status(404).json({ message: 'File not found on the server' });
    }

    const contentTypes = {
      pdf: 'application/pdf',
      txt: 'text/plain; charset=utf-8',
      md: 'text/markdown; charset=utf-8'
    };
    res.setHeader('Content-Type', contentTypes[doc.fileType] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  } catch (err) {
    next(err);
  }
}
module.exports = { uploadDocument, listDocuments, getDocument,getDocumentFile, updateDocument, deleteDocument };
