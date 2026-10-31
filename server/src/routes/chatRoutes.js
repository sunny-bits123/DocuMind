const express = require('express');
const { sendMessage, sendMessageStream,getHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/message', sendMessage);
router.post('/message/stream', sendMessageStream);
router.get('/history/:docId', getHistory);

module.exports = router;
