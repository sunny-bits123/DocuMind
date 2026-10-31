const express = require('express');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentFile,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { uploadDocument: uploadMiddleware } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/upload', uploadMiddleware.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.get('/:id/file', getDocumentFile);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
