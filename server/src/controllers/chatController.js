const mongoose = require('mongoose');
const Message = require('../models/Message');
const Document = require('../models/Document');
const { answerQuestion ,answerQuestionStream  } = require('../services/ragService');

async function sendMessage(req, res, next) {
  try {
    const { message, docId, docIds } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'A message is required' });
    }

    const ids = docIds && Array.isArray(docIds) && docIds.length ? docIds : docId ? [docId] : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: 'At least one document must be selected' });
    }

    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length > 0) {
      return res.status(400).json({ message: 'Invalid document id provided' });
    }

    const owned = await Document.countDocuments({
      _id: { $in: ids },
      user: req.user._id
    });
    if (owned !== ids.length) {
      return res.status(403).json({ message: 'One or more documents do not belong to you' });
    }

    // Save the user's message (linked to the first document for history grouping)
    await Message.create({
      user: req.user._id,
      document: ids[0],
      role: 'user',
      content: message.trim()
    });

    const { answer, sources } = await answerQuestion(ids, message.trim());

    const botMessage = await Message.create({
      user: req.user._id,
      document: ids[0],
      role: 'bot',
      content: answer,
      sources
    });

    res.json({ response: answer, sources, messageId: botMessage._id });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const { docId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: 'Invalid document id' });
    }

    const doc = await Document.findOne({ _id: docId, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const messages = await Message.find({ document: docId, user: req.user._id }).sort({
      createdAt: 1
    });

    res.json({ messages: messages.map((m) => m.toSummary()) });
  } catch (err) {
    next(err);
  }
}
async function validateChatRequest(req) {
  const { message, docId, docIds } = req.body;
  const fail = (statusCode, text) => Object.assign(new Error(text), { statusCode });

  if (!message || !message.trim()) throw fail(400, 'A message is required');

  const ids = docIds && Array.isArray(docIds) && docIds.length ? docIds : docId ? [docId] : [];
  if (ids.length === 0) throw fail(400, 'At least one document must be selected');

  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw fail(400, 'Invalid document id provided');
  }

  const owned = await Document.countDocuments({ _id: { $in: ids }, user: req.user._id });
  if (owned !== ids.length) throw fail(403, 'One or more documents do not belong to you');

  return { ids, text: message.trim() };
}

async function sendMessageStream(req, res, next) {
  try {
    const { ids, text } = await validateChatRequest(req);

    await Message.create({
      user: req.user._id,
      document: ids[0],
      role: 'user',
      content: text
    });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // If the browser closes the page mid-answer, stop the Gemini request too
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) controller.abort();
    });

    const send = (event, data) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      const { answer, sources } = await answerQuestionStream(
        ids,
        text,
        (piece) => send('token', { text: piece }),
        controller.signal
      );

      const botMessage = await Message.create({
        user: req.user._id,
        document: ids[0],
        role: 'bot',
        content: answer,
        sources
      });

      send('done', { messageId: botMessage._id, response: answer, sources });
    } catch (err) {
      if (!controller.signal.aborted) {
        send('error', { message: err.message || 'Failed to get a response' });
      }
    }

    res.end();
  } catch (err) {
    next(err); // only reached before streaming starts
  }
}
module.exports = { sendMessage,sendMessageStream, getHistory };
