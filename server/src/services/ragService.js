const Document = require('../models/Document');
const extractText = require('../utils/extractText');
const chunkText = require('../utils/chunkText');
const cosineSimilarity = require('../utils/cosineSimilarity');
const { embedText, embedChunks, generateAnswer,streamAnswer, generateDocumentOverview } = require('./geminiService');

const TOP_K = 4;
// Chunks scoring below this are treated as "not in the document".
// Tune it with your own documents (see the test steps below).
const MIN_SIMILARITY = Number(process.env.MIN_SIMILARITY) || 0.5;

// "Summarize this document"-style questions don't match any single chunk well
const OVERVIEW_PATTERN =
  /\b(summar(y|ise|ize)|overview|what is this (document|file|pdf)|about this (document|file|pdf)|main (points|topics|ideas))\b/i;

// Table-of-contents lines made of dot leaders (". . . . . .")
const DOT_LEADERS = /(\.\s*){10,}/;

const NOT_FOUND_MESSAGE =
  "I couldn't find an answer to that in the selected document(s). Try rephrasing the question, or ask about something the document covers.";

async function processDocument(documentId) {
  const doc = await Document.findById(documentId);
  if (!doc) return;

  try {
    const pages = await extractText(doc.storagePath, doc.fileType);
    const rawText = pages.map((p) => p.text).join('\n\n');

    if (!rawText.trim()) {
      doc.status = 'failed';
      doc.failureReason = 'No readable text found in this file';
      await doc.save();
      return;
    }

    const chunks = chunkText(pages);

    if (chunks.length === 0) {
      doc.status = 'failed';
      doc.failureReason = 'Could not split document into chunks';
      await doc.save();
      return;
    }

    const embeddings = await embedChunks(chunks);

    doc.chunks = chunks.map((chunk, i) => ({
      text: chunk.text,
      position: chunk.position,
      page: chunk.page,
       pages: chunk.pages,
      embedding: embeddings[i]
    }));
    doc.status = 'ready';
    doc.failureReason = null;
    await doc.save();

    try {
      const sample = rawText.length > 12000 ? rawText.slice(0, 12000) : rawText;
      const { summary, topics, suggestedQuestions } = await generateDocumentOverview(sample, doc.name);
      doc.summary = summary;
      doc.topics = topics;
      doc.suggestedQuestions = suggestedQuestions;
      await doc.save();
    } catch (overviewErr) {
      console.error(
        `Overview generation failed for document ${documentId} (non-fatal):`,
        overviewErr.message
      );
    }
  } catch (err) {
    doc.status = 'failed';
    doc.failureReason = err.message || 'Processing failed';
    await doc.save();
  }
}

async function prepareAnswer(documentIds, question) {
  const docs = await Document.find({
    _id: { $in: documentIds },
    status: 'ready'
  }).select('+chunks.embedding');

  if (docs.length === 0) {
    throw Object.assign(new Error('No ready documents found to answer from'), {
      statusCode: 400
    });
  }

  const questionEmbedding = await embedText(question);

  const scored = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      if (DOT_LEADERS.test(chunk.text)) continue;

      const score = cosineSimilarity(questionEmbedding, chunk.embedding);
      scored.push({
        score,
        text: chunk.text,
        position: chunk.position,
        page: chunk.page,
        pages: Array.from(chunk.pages || []),
        documentId: doc._id,
        filename: doc.name
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  let topChunks;
  if (docs.length > 1) {
    const perDocLimit = Math.max(2, Math.ceil(TOP_K / docs.length));
    const perDocCounts = {};
    topChunks = [];

    for (const chunk of scored) {
      const docKey = String(chunk.documentId);
      const count = perDocCounts[docKey] || 0;
      if (count < perDocLimit) {
        topChunks.push(chunk);
        perDocCounts[docKey] = count + 1;
      }
    }

    topChunks.sort((a, b) => b.score - a.score);
    topChunks = topChunks.slice(0, TOP_K * docs.length);
  } else {
    topChunks = scored.slice(0, TOP_K);
  }

  if (process.env.DEBUG_RAG === 'true') {
    console.log(
      '[rag] top scores:',
      scored
        .slice(0, 5)
        .map((c) => c.score.toFixed(3))
        .join(', '),
      '| question:',
      question
    );
  }

  const isOverviewQuestion = OVERVIEW_PATTERN.test(question);
  const relevantChunks = isOverviewQuestion
    ? topChunks
    : topChunks.filter((c) => c.score >= MIN_SIMILARITY);

  if (relevantChunks.length === 0) {
    return { notFound: true };
  }

  const contextBlock = relevantChunks
    .map((c, i) => `[Source ${i + 1} - ${c.filename}]\n${c.text}`)
    .join('\n\n');

  const prompt = `You are a helpful assistant that answers questions using ONLY the context provided below. If the answer cannot be found in the context, say so clearly instead of guessing.

Context:
${contextBlock}

Question: ${question}

Answer:`;

  const sources = relevantChunks.map((c) => ({
    documentId: c.documentId,
    filename: c.filename,
    position: c.position,
    page: c.page,
    pages: c.pages,
    excerpt: c.text.length > 220 ? `${c.text.slice(0, 220)}...` : c.text
  }));

  return { notFound: false, prompt, sources };
}

async function answerQuestion(documentIds, question) {
  const prepared = await prepareAnswer(documentIds, question);
  if (prepared.notFound) {
    return { answer: NOT_FOUND_MESSAGE, sources: [] };
  }

  const answer = await generateAnswer(prepared.prompt);
  return { answer, sources: prepared.sources };
}

async function answerQuestionStream(documentIds, question, onToken, signal) {
  const prepared = await prepareAnswer(documentIds, question);
  if (prepared.notFound) {
    onToken(NOT_FOUND_MESSAGE);
    return { answer: NOT_FOUND_MESSAGE, sources: [] };
  }

  const answer = await streamAnswer(prepared.prompt, onToken, signal);
  return { answer, sources: prepared.sources };
}

module.exports = { processDocument, answerQuestion, answerQuestionStream };